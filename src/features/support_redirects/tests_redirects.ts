import { AssertionError } from 'node:assert'
import { Constructor } from '../../types.js'
import { BaseTestable } from '../support_testing/base_testable.js'

/**
 * Provides redirect assertion methods for testing components
 * Equivalent to PHP's TestsRedirects trait
 */
export function TestsRedirects<TConstructor extends Constructor<BaseTestable>>(Base: TConstructor) {
  return class extends Base {
    /**
     * Assert that the component performed a redirect
     *
     * @param uri - Optional URI to assert the redirect matches
     *
     * @example
     * // Assert component redirected (to any URL)
     * test.assertRedirect()
     *
     * // Assert component redirected to specific URL
     * test.assertRedirect('/dashboard')
     */
    assertRedirect(uri?: string): this {
      const effects = this.state.getEffects()

      if (!('redirect' in effects) || !effects.redirect) {
        throw new AssertionError({
          message: 'Component did not perform a redirect.',
          actual: effects,
          expected: 'redirect effect',
          operator: 'hasRedirect',
        })
      }

      if (uri !== undefined) {
        const normalizedUri = this.#normalizeUrl(uri)
        const normalizedRedirect = this.#normalizeUrl(effects.redirect)

        if (normalizedUri !== normalizedRedirect) {
          throw new AssertionError({
            message: `Expected redirect to [${uri}] but got [${effects.redirect}].`,
            actual: effects.redirect,
            expected: uri,
            operator: 'redirectEquals',
          })
        }
      }

      return this
    }

    /**
     * Assert that the redirect URL contains a specific string
     *
     * @param uri - The string that should be contained in the redirect URL
     *
     * @example
     * test.assertRedirectContains('/users')
     * test.assertRedirectContains('?success=true')
     */
    assertRedirectContains(uri: string): this {
      const effects = this.state.getEffects()

      if (!('redirect' in effects) || !effects.redirect) {
        throw new AssertionError({
          message: 'Component did not perform a redirect.',
          actual: effects,
          expected: 'redirect effect',
          operator: 'hasRedirect',
        })
      }

      if (!effects.redirect.includes(uri)) {
        throw new AssertionError({
          message: `Redirect location [${effects.redirect}] does not contain [${uri}].`,
          actual: effects.redirect,
          expected: `to contain ${uri}`,
          operator: 'redirectContains',
        })
      }

      return this
    }

    /**
     * Assert that the component redirected to a named route
     *
     * @param name - The route name
     * @param params - Optional route parameters
     *
     * @example
     * test.assertRedirectToRoute('dashboard')
     * test.assertRedirectToRoute('users.show', { id: 1 })
     */
    assertRedirectToRoute(name: string, params?: Record<string, any>): this {
      // Get the router from the component instance to generate the URL
      const component = this.state.getComponent() as any

      const router = component.__getRouter?.()
      if (!router) {
        throw new Error('Router not available on component for route URL generation')
      }

      // Commit the router if not already committed
      if (!router.committed) {
        router.commit()
      }

      const uri = router.makeUrl(name, params)

      return this.assertRedirect(uri)
    }

    /**
     * Assert that the component did not perform a redirect
     *
     * @example
     * test.assertNoRedirect()
     */
    assertNoRedirect(): this {
      const effects = this.state.getEffects()

      if ('redirect' in effects && effects.redirect) {
        throw new AssertionError({
          message: `Component performed an unexpected redirect to [${effects.redirect}].`,
          actual: effects.redirect,
          expected: 'no redirect',
          operator: 'noRedirect',
        })
      }

      return this
    }

    /**
     * Normalize URL for comparison (remove trailing slashes, etc.)
     */
    #normalizeUrl(url: string): string {
      // Remove trailing slash unless it's the root
      if (url.length > 1 && url.endsWith('/')) {
        return url.slice(0, -1)
      }
      return url
    }
  }
}

/**
 * Interface for type safety when using TestsRedirects mixin
 */
export interface TestsRedirects {
  assertRedirect(uri?: string): this
  assertRedirectContains(uri: string): this
  assertRedirectToRoute(name: string, params?: Record<string, any>): this
  assertNoRedirect(): this
}
