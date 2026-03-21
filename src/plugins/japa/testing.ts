import type { PluginFn } from '@japa/runner/types'
import type { ApplicationService, HttpRouterService } from '@adonisjs/core/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { ComponentConstructor } from '../../types.js'
import { Testable } from '../../features/support_testing/testable.js'
import { HttpContextFactory } from '@adonisjs/http-server/factories'
import { TestContext } from '@japa/runner/core'

/**
 * Livewire testing helper interface
 */
export interface LivewireTestingHelper {
  /**
   * Create a new test instance for a Livewire component
   *
   * @example
   * ```ts
   * test('can increment count', async ({ livewire }) => {
   *   await livewire
   *     .test(Counter)
   *     .mount()
   *     .call('increment')
   *     .assertSet('count', 1)
   * })
   * ```
   */
  test(componentClass: ComponentConstructor): Testable
}

/**
 * Internal livewire testing helper class
 */
export class LivewireHelper implements LivewireTestingHelper {
  #app: ApplicationService
  #router: HttpRouterService
  #ctx: HttpContext

  constructor(app: ApplicationService, router: HttpRouterService, ctx?: HttpContext) {
    this.#app = app
    this.#router = router
    this.#ctx = ctx ?? new HttpContextFactory().create()
  }

  test(componentClass: ComponentConstructor): Testable {
    return new Testable(componentClass, this.#app, this.#router, this.#ctx)
  }
}

/**
 * Japa plugin to add Livewire component testing support
 *
 * This plugin provides a `livewire` testing helper in the test context,
 * allowing direct component testing similar to PHP Livewire's `Livewire::test()`.
 *
 * @example
 * ```ts
 * // tests/bootstrap.ts
 * import { livewireTesting } from '@adonisjs/livewire/plugins/japa/testing'
 *
 * export const plugins: Config['plugins'] = [
 *   livewireTesting(app),
 * ]
 * ```
 *
 * @example
 * ```ts
 * // tests/unit/counter.spec.ts
 * import Counter from '#livewire/counter'
 *
 * test('can increment count', async ({ livewire }) => {
 *   await livewire
 *     .test(Counter)
 *     .mount()
 *     .call('increment')
 *     .assertSet('count', 1)
 *     .assertSee('Count: 1')
 * })
 * ```
 */
export function livewireTesting(app: ApplicationService): PluginFn {
  return async function () {
    const router = await app.container.make('router')

    TestContext.getter(
      'livewire',
      function () {
        return new LivewireHelper(app, router)
      },
      true
    )
  }
}

/**
 * Augment the Japa TestContext to include livewire helper
 */
declare module '@japa/runner/core' {
  interface TestContext {
    livewire: LivewireTestingHelper
  }
}
