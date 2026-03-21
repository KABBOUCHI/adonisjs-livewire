import type { PluginFn } from '@japa/runner/types'
import { ApiRequest, ApiResponse } from '@japa/api-client'
import type { ApplicationService } from '@adonisjs/core/types'

import { LivewireHeaders } from '../../headers.js'
import type { ComponentSnapshot, ComponentEffects } from '../../types.js'

/**
 * Parsed Livewire components with snapshot already parsed
 */
type ParsedLivewireComponents = Array<{
  snapshot: ComponentSnapshot
  effects: ComponentEffects
}>

/**
 * Testable response wrapper for Livewire HTTP responses
 *
 * Provides a fluent PHP-like API for testing Livewire responses,
 * similar to `Livewire::test()` in the PHP version.
 *
 * @example
 * ```js
 * const response = await client.post('/livewire/update').withLivewire()
 *
 * response.livewire()
 *   .assertSet('count', 5)
 *   .assertSee('Hello World')
 *   .assertDispatched('user-updated')
 * ```
 */
export class TestableResponse {
  readonly #response: ApiResponse
  readonly #components: ParsedLivewireComponents
  readonly #componentIndex: number

  constructor(response: ApiResponse, components: ParsedLivewireComponents, componentIndex = 0) {
    this.#response = response
    this.#components = components
    this.#componentIndex = componentIndex
  }

  /**
   * Get the assert library from the response
   */
  #getAssert() {
    const assertLib = (this.#response as any).assert
    if (!assertLib) {
      throw new Error(
        'Response assertions are not available. Make sure to install the @japa/assert plugin'
      )
    }
    return assertLib
  }

  /**
   * Get the current component data
   */
  #currentComponent() {
    return this.#components[this.#componentIndex]
  }

  // ==========================================
  // Getters - Access component data
  // ==========================================

  /**
   * Get the component ID
   *
   * @example
   * ```js
   * console.log(response.livewire().id()) // 'abc123'
   * ```
   */
  id(): string {
    return this.#currentComponent().snapshot.memo.id
  }

  /**
   * Get the component name
   *
   * @example
   * ```js
   * console.log(response.livewire().name()) // 'Users/Index'
   * ```
   */
  name(): string {
    return this.#currentComponent().snapshot.memo.name
  }

  /**
   * Get a property value from the component data
   *
   * @param propertyName - The property name (supports dot notation)
   *
   * @example
   * ```js
   * console.log(response.livewire().get('count')) // 5
   * console.log(response.livewire().get('user.name')) // 'John'
   * ```
   */
  get(propertyName: string): any {
    const data = this.#currentComponent().snapshot.data
    return propertyName.split('.').reduce((obj, key) => obj?.[key], data)
  }

  /**
   * Get all component data
   *
   * @example
   * ```js
   * console.log(response.livewire().getData()) // { count: 5, name: 'John' }
   * ```
   */
  getData(): Record<string, any> {
    return this.#currentComponent().snapshot.data
  }

  /**
   * Get the component snapshot
   *
   * @example
   * ```js
   * console.log(response.livewire().snapshot())
   * ```
   */
  snapshot(): ComponentSnapshot {
    return this.#currentComponent().snapshot
  }

  /**
   * Get the component effects
   *
   * @example
   * ```js
   * console.log(response.livewire().effects())
   * ```
   */
  effects(): ComponentEffects {
    return this.#currentComponent().effects
  }

  /**
   * Get the rendered HTML
   *
   * @example
   * ```js
   * console.log(response.livewire().html()) // '<div>Count: 5</div>'
   * ```
   */
  html(): string {
    return this.#currentComponent().effects.html || ''
  }

  /**
   * Get all parsed components
   *
   * @example
   * ```js
   * console.log(response.livewire().components())
   * ```
   */
  components(): ParsedLivewireComponents {
    return this.#components
  }

  /**
   * Get testable for a specific component by index
   *
   * @param index - Component index
   *
   * @example
   * ```js
   * response.livewire().component(1).assertSet('count', 10)
   * ```
   */
  component(index: number): TestableResponse {
    if (index < 0 || index >= this.#components.length) {
      throw new Error(
        `Component index ${index} out of bounds. Available: 0-${this.#components.length - 1}`
      )
    }
    return new TestableResponse(this.#response, this.#components, index)
  }

  // ==========================================
  // Property Assertions
  // ==========================================

  /**
   * Assert that a property is set to a specific value
   *
   * @param name - Property name (supports dot notation)
   * @param value - Expected value or callback
   *
   * @example
   * ```js
   * response.livewire()
   *   .assertSet('count', 5)
   *   .assertSet('user.name', 'John')
   *   .assertSet('items', (items) => items.length > 0)
   * ```
   */
  assertSet(name: string, value: any | ((actual: any) => boolean)): this {
    const actual = this.get(name)
    const assert = this.#getAssert()

    if (typeof value === 'function') {
      assert.isTrue(value(actual), `Property "${name}" did not pass the callback assertion`)
    } else {
      assert.deepEqual(actual, value, `Property "${name}" does not match expected value`)
    }

    return this
  }

  /**
   * Assert that a property is NOT set to a specific value
   *
   * @param name - Property name (supports dot notation)
   * @param value - Value that should not match
   *
   * @example
   * ```js
   * response.livewire().assertNotSet('count', 0)
   * ```
   */
  assertNotSet(name: string, value: any): this {
    const actual = this.get(name)
    const assert = this.#getAssert()
    assert.notDeepEqual(actual, value, `Property "${name}" should not equal the given value`)
    return this
  }

  /**
   * Assert array property has specific count
   *
   * @param name - Property name
   * @param count - Expected count
   *
   * @example
   * ```js
   * response.livewire().assertCount('items', 5)
   * ```
   */
  assertCount(name: string, count: number): this {
    const actual = this.get(name)
    const assert = this.#getAssert()
    assert.isArray(actual, `Property "${name}" is not an array`)
    assert.lengthOf(actual, count, `Property "${name}" count mismatch`)
    return this
  }

  /**
   * Assert that snapshot data contains a property with value
   *
   * @param name - Property name in snapshot data
   * @param value - Expected value
   *
   * @example
   * ```js
   * response.livewire().assertSnapshotSet('count', 5)
   * ```
   */
  assertSnapshotSet(name: string, value: any): this {
    const snapshot = this.snapshot()
    const actual = name.split('.').reduce((obj, key) => obj?.[key], snapshot.data as any)
    const assert = this.#getAssert()
    assert.deepEqual(actual, value, `Snapshot property "${name}" does not match expected value`)
    return this
  }

  /**
   * Assert that snapshot data does NOT contain a property with value
   *
   * @param name - Property name in snapshot data
   * @param value - Value that should not match
   *
   * @example
   * ```js
   * response.livewire().assertSnapshotNotSet('count', 0)
   * ```
   */
  assertSnapshotNotSet(name: string, value: any): this {
    const snapshot = this.snapshot()
    const actual = name.split('.').reduce((obj, key) => obj?.[key], snapshot.data as any)
    const assert = this.#getAssert()
    assert.notDeepEqual(
      actual,
      value,
      `Snapshot property "${name}" should not equal the given value`
    )
    return this
  }

  // ==========================================
  // View/HTML Assertions
  // ==========================================

  /**
   * Assert that the rendered HTML contains a string
   *
   * @param value - String to search for (will be HTML escaped by default)
   * @param escape - Whether to HTML escape the value (default: true)
   *
   * @example
   * ```js
   * response.livewire()
   *   .assertSee('Hello World')
   *   .assertSee('<strong>Bold</strong>', false)
   * ```
   */
  assertSee(value: string, escape = true): this {
    const html = this.html()
    const searchValue = escape ? this.#escapeHtml(value) : value
    const assert = this.#getAssert()
    assert.include(html, searchValue, `HTML does not contain "${value}"`)
    return this
  }

  /**
   * Assert that the rendered HTML does NOT contain a string
   *
   * @param value - String that should not be present
   * @param escape - Whether to HTML escape the value (default: true)
   *
   * @example
   * ```js
   * response.livewire().assertDontSee('Error')
   * ```
   */
  assertDontSee(value: string, escape = true): this {
    const html = this.html()
    const searchValue = escape ? this.#escapeHtml(value) : value
    const assert = this.#getAssert()
    assert.notInclude(html, searchValue, `HTML should not contain "${value}"`)
    return this
  }

  /**
   * Assert that the raw HTML contains a string (no escaping)
   *
   * @param value - Raw HTML string to search for
   *
   * @example
   * ```js
   * response.livewire().assertSeeHtml('<div class="active">')
   * ```
   */
  assertSeeHtml(value: string): this {
    return this.assertSee(value, false)
  }

  /**
   * Assert that the raw HTML does NOT contain a string
   *
   * @param value - Raw HTML string that should not be present
   *
   * @example
   * ```js
   * response.livewire().assertDontSeeHtml('<div class="error">')
   * ```
   */
  assertDontSeeHtml(value: string): this {
    return this.assertDontSee(value, false)
  }

  /**
   * Assert that HTML contains strings in order
   *
   * @param values - Array of strings that should appear in order
   *
   * @example
   * ```js
   * response.livewire().assertSeeInOrder(['First', 'Second', 'Third'])
   * ```
   */
  assertSeeInOrder(values: string[]): this {
    const html = this.html()
    const assert = this.#getAssert()
    let lastIndex = -1

    for (const value of values) {
      const escapedValue = this.#escapeHtml(value)
      const index = html.indexOf(escapedValue, lastIndex + 1)
      assert.notEqual(index, -1, `HTML does not contain "${value}" in expected order`)
      lastIndex = index
    }

    return this
  }

  /**
   * Assert that raw HTML contains strings in order
   *
   * @param values - Array of HTML strings that should appear in order
   *
   * @example
   * ```js
   * response.livewire().assertSeeHtmlInOrder(['<h1>', '<p>', '</div>'])
   * ```
   */
  assertSeeHtmlInOrder(values: string[]): this {
    const html = this.html()
    const assert = this.#getAssert()
    let lastIndex = -1

    for (const value of values) {
      const index = html.indexOf(value, lastIndex + 1)
      assert.notEqual(index, -1, `HTML does not contain "${value}" in expected order`)
      lastIndex = index
    }

    return this
  }

  /**
   * Assert that text content (stripped of HTML tags) contains a string
   *
   * @param value - Text to search for
   *
   * @example
   * ```js
   * response.livewire().assertSeeText('Hello World')
   * ```
   */
  assertSeeText(value: string): this {
    const text = this.#stripTags(this.html())
    const assert = this.#getAssert()
    assert.include(text, value, `Text content does not contain "${value}"`)
    return this
  }

  /**
   * Assert that text content does NOT contain a string
   *
   * @param value - Text that should not be present
   *
   * @example
   * ```js
   * response.livewire().assertDontSeeText('Error')
   * ```
   */
  assertDontSeeText(value: string): this {
    const text = this.#stripTags(this.html())
    const assert = this.#getAssert()
    assert.notInclude(text, value, `Text content should not contain "${value}"`)
    return this
  }

  // ==========================================
  // Event Assertions
  // ==========================================

  /**
   * Assert that an event was dispatched
   *
   * @param event - Event name
   * @param params - Optional event parameters to match
   *
   * @example
   * ```js
   * response.livewire()
   *   .assertDispatched('user-updated')
   *   .assertDispatched('post-created', { id: 1 })
   * ```
   */
  assertDispatched(event: string, params?: Record<string, any>): this {
    const effects = this.effects()
    const dispatches = effects.dispatches || []
    const assert = this.#getAssert()

    assert.include(dispatches, event, `Event "${event}" was not dispatched`)

    // TODO: Add params matching when dispatches contains event data objects
    if (params) {
      // For future implementation when dispatches contain { event, params }
    }

    return this
  }

  /**
   * Assert that an event was NOT dispatched
   *
   * @param event - Event name
   *
   * @example
   * ```js
   * response.livewire().assertNotDispatched('error-occurred')
   * ```
   */
  assertNotDispatched(event: string): this {
    const effects = this.effects()
    const dispatches = effects.dispatches || []
    const assert = this.#getAssert()
    assert.notInclude(dispatches, event, `Event "${event}" should not have been dispatched`)
    return this
  }

  // ==========================================
  // Redirect Assertions
  // ==========================================

  /**
   * Assert that a redirect was triggered
   *
   * @param url - Optional specific URL to match
   *
   * @example
   * ```js
   * response.livewire()
   *   .assertRedirect()
   *   .assertRedirect('/dashboard')
   * ```
   */
  assertRedirect(url?: string): this {
    const effects = this.effects()
    const assert = this.#getAssert()

    assert.isDefined(effects.redirect, 'No redirect was triggered')

    if (url) {
      assert.equal(effects.redirect, url, `Redirect URL does not match expected "${url}"`)
    }

    return this
  }

  /**
   * Assert that redirect URL contains a string
   *
   * @param uri - String that should be in the redirect URL
   *
   * @example
   * ```js
   * response.livewire().assertRedirectContains('/users')
   * ```
   */
  assertRedirectContains(uri: string): this {
    const effects = this.effects()
    const assert = this.#getAssert()
    assert.isDefined(effects.redirect, 'No redirect was triggered')
    assert.include(effects.redirect, uri, `Redirect URL does not contain "${uri}"`)
    return this
  }

  /**
   * Assert that no redirect was triggered
   *
   * @example
   * ```js
   * response.livewire().assertNoRedirect()
   * ```
   */
  assertNoRedirect(): this {
    const effects = this.effects()
    const assert = this.#getAssert()
    assert.isUndefined(effects.redirect, 'A redirect was triggered but should not have been')
    return this
  }

  // ==========================================
  // Validation Assertions
  // ==========================================

  /**
   * Assert that there are validation errors
   *
   * @param keys - Optional specific keys that should have errors
   *
   * @example
   * ```js
   * response.livewire()
   *   .assertHasErrors()
   *   .assertHasErrors(['email', 'password'])
   * ```
   */
  assertHasErrors(keys?: string | string[]): this {
    const errors = this.snapshot().memo.errors || {}
    const assert = this.#getAssert()
    const errorKeys = Object.keys(errors)

    assert.isNotEmpty(errorKeys, 'No validation errors present')

    if (keys) {
      const checkKeys = Array.isArray(keys) ? keys : [keys]
      for (const key of checkKeys) {
        assert.include(errorKeys, key, `No validation error for "${key}"`)
      }
    }

    return this
  }

  /**
   * Assert that there are no validation errors
   *
   * @param keys - Optional specific keys that should not have errors
   *
   * @example
   * ```js
   * response.livewire()
   *   .assertHasNoErrors()
   *   .assertHasNoErrors(['email'])
   * ```
   */
  assertHasNoErrors(keys?: string | string[]): this {
    const errors = this.snapshot().memo.errors || {}
    const assert = this.#getAssert()
    const errorKeys = Object.keys(errors)

    if (keys) {
      const checkKeys = Array.isArray(keys) ? keys : [keys]
      for (const key of checkKeys) {
        assert.notInclude(errorKeys, key, `Validation error exists for "${key}"`)
      }
    } else {
      assert.isEmpty(errorKeys, 'Validation errors are present')
    }

    return this
  }

  // ==========================================
  // File Download Assertions
  // ==========================================

  /**
   * Assert that a file download was triggered
   *
   * @param filename - Optional expected filename
   *
   * @example
   * ```js
   * response.livewire()
   *   .assertFileDownloaded()
   *   .assertFileDownloaded('report.pdf')
   * ```
   */
  assertFileDownloaded(filename?: string): this {
    const effects = this.effects()
    const assert = this.#getAssert()

    assert.isDefined(effects.download, 'No file download was triggered')

    if (filename) {
      assert.equal(
        effects.download?.filename,
        filename,
        `Downloaded filename does not match "${filename}"`
      )
    }

    return this
  }

  /**
   * Assert that no file download was triggered
   *
   * @example
   * ```js
   * response.livewire().assertNoFileDownloaded()
   * ```
   */
  assertNoFileDownloaded(): this {
    const effects = this.effects()
    const assert = this.#getAssert()
    assert.isUndefined(effects.download, 'A file download was triggered but should not have been')
    return this
  }

  // ==========================================
  // Return Value Assertions
  // ==========================================

  /**
   * Assert the return value from the last method call
   *
   * @param value - Expected return value
   *
   * @example
   * ```js
   * response.livewire().assertReturned('success')
   * ```
   */
  assertReturned(value: any): this {
    const effects = this.effects()
    const returns = effects.returns || []
    const assert = this.#getAssert()

    assert.isNotEmpty(returns, 'No return value present')
    assert.deepEqual(returns[returns.length - 1], value, 'Return value does not match expected')

    return this
  }

  // ==========================================
  // HTTP Status Assertions
  // ==========================================

  /**
   * Assert the HTTP status code
   *
   * @param code - Expected status code
   *
   * @example
   * ```js
   * response.livewire().assertStatus(200)
   * ```
   */
  assertStatus(code: number): this {
    this.#response.assertStatus(code)
    return this
  }

  /**
   * Assert successful HTTP status (2xx)
   *
   * @example
   * ```js
   * response.livewire().assertOk()
   * ```
   */
  assertOk(): this {
    const status = this.#response.status()
    const assert = this.#getAssert()
    assert.isTrue(status >= 200 && status < 300, `Expected 2xx status, got ${status}`)
    return this
  }

  /**
   * Assert unauthorized status (401)
   *
   * @example
   * ```js
   * response.livewire().assertUnauthorized()
   * ```
   */
  assertUnauthorized(): this {
    return this.assertStatus(401)
  }

  /**
   * Assert forbidden status (403)
   *
   * @example
   * ```js
   * response.livewire().assertForbidden()
   * ```
   */
  assertForbidden(): this {
    return this.assertStatus(403)
  }

  // ==========================================
  // Snapshot/Effects Assertions (Legacy-compatible)
  // ==========================================

  /**
   * Assert that snapshot matches exactly
   *
   * @param snapshot - Expected snapshot
   *
   * @example
   * ```js
   * response.livewire().assertSnapshot({ ... })
   * ```
   */
  assertSnapshot(snapshot: ComponentSnapshot): this {
    const assert = this.#getAssert()
    assert.deepEqual(this.snapshot(), snapshot)
    return this
  }

  /**
   * Assert that snapshot contains subset
   *
   * @param partial - Partial snapshot to match
   *
   * @example
   * ```js
   * response.livewire().assertSnapshotContains({ memo: { name: 'Users/Index' } })
   * ```
   */
  assertSnapshotContains(partial: Partial<ComponentSnapshot>): this {
    const assert = this.#getAssert()
    assert.containSubset(this.snapshot(), partial)
    return this
  }

  /**
   * Assert that effects match exactly
   *
   * @param effects - Expected effects
   *
   * @example
   * ```js
   * response.livewire().assertEffects({ html: '<div>...</div>' })
   * ```
   */
  assertEffects(effects: ComponentEffects): this {
    const assert = this.#getAssert()
    assert.deepEqual(this.effects(), effects)
    return this
  }

  /**
   * Assert that effects contain subset
   *
   * @param partial - Partial effects to match
   *
   * @example
   * ```js
   * response.livewire().assertEffectsContains({ redirect: '/dashboard' })
   * ```
   */
  assertEffectsContains(partial: Partial<ComponentEffects>): this {
    const assert = this.#getAssert()
    assert.containSubset(this.effects(), partial)
    return this
  }

  // ==========================================
  // Helper methods
  // ==========================================

  #escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  #stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, '')
  }
}

declare module '@japa/api-client' {
  /**
   * Extended ApiRequest interface with Livewire specific methods
   *
   * Adds methods to configure requests for testing Livewire applications,
   * including setting required headers for Livewire requests.
   */
  export interface ApiRequest {
    /**
     * Set `X-Livewire` header on the request to mark it as a Livewire request
     *
     * This method configures the request to be treated as a Livewire AJAX request
     * by setting the required headers that Livewire uses for identification.
     *
     * @returns The ApiRequest instance for method chaining
     *
     * @example
     * ```js
     * const response = await client
     *   .post('/livewire/update')
     *   .withLivewire()
     * ```
     */
    withLivewire(this: ApiRequest): this

    /**
     * Set header for Livewire navigation requests
     *
     * Configures the request to be treated as a Livewire navigation request,
     * which enables features like progress bar and optimized navigation.
     *
     * @returns The ApiRequest instance for method chaining
     *
     * @example
     * ```js
     * const response = await client
     *   .get('/dashboard')
     *   .withLivewireNavigate()
     * ```
     */
    withLivewireNavigate(this: ApiRequest): this
  }

  /**
   * Extended ApiResponse interface with Livewire specific properties and assertions
   *
   * Provides access to a TestableResponse wrapper for PHP-like fluent testing API.
   */
  export interface ApiResponse {
    /**
     * Get a TestableResponse wrapper for PHP-like fluent Livewire testing
     *
     * Returns a wrapper that provides chainable assertion methods similar
     * to PHP Livewire's `Livewire::test()` API.
     *
     * @returns TestableResponse instance for method chaining
     *
     * @example
     * ```js
     * const response = await client.post('/livewire/update').withLivewire()
     *
     * response.livewire()
     *   .assertSet('count', 5)
     *   .assertSee('Hello World')
     *   .assertDispatched('user-updated')
     *   .assertRedirect('/dashboard')
     * ```
     */
    livewire(this: ApiResponse): TestableResponse
  }
}

/**
 * Ensure the response is a Livewire response, otherwise throw an error
 *
 * @throws Error when the response is not a Livewire response
 */
function ensureIsLivewireResponse(response: ApiResponse): void {
  const body = response.body()
  const hasLivewireHeader = response.header('x-livewire')
  const hasLivewireStructure =
    body && typeof body === 'object' && 'components' in body && Array.isArray(body.components)

  if (!hasLivewireHeader && !hasLivewireStructure) {
    throw new Error(
      'Not a Livewire response. Make sure to use "withLivewire()" method when making the request'
    )
  }
}

/**
 * Parse the Livewire response body and extract components
 */
function parseLivewireResponse(body: any): ParsedLivewireComponents | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  // Check if it's a Livewire update response structure
  if ('components' in body && Array.isArray(body.components)) {
    return body.components.map((component: any) => {
      let snapshot: ComponentSnapshot
      try {
        snapshot =
          typeof component.snapshot === 'string'
            ? JSON.parse(component.snapshot)
            : component.snapshot
      } catch {
        snapshot = component.snapshot
      }

      return {
        snapshot,
        effects: component.effects || {},
      }
    })
  }

  return null
}

/**
 * Japa plugin that extends the API client with Livewire testing capabilities
 *
 * This plugin adds methods to ApiRequest and ApiResponse classes to support
 * testing Livewire applications with a PHP-like fluent API.
 *
 * @param app - The AdonisJS application service instance
 * @returns Japa plugin function
 *
 * @example
 * ```js
 * // Configure in tests/bootstrap.ts
 * import { livewireApiClient } from '@adonisjs/livewire/plugins/japa/api_client'
 *
 * export const plugins: Config['plugins'] = [
 *   assert(),
 *   apiClient(app),
 *   livewireApiClient(app)
 * ]
 * ```
 *
 * @example
 * ```js
 * // Use in tests - PHP-like fluent API
 * test('updates user component', async ({ client }) => {
 *   const response = await client
 *     .post('/livewire/update')
 *     .withLivewire()
 *
 *   response.livewire()
 *     .assertSet('count', 5)
 *     .assertSee('Hello World')
 *     .assertDispatched('user-updated')
 *     .assertRedirect('/dashboard')
 * })
 * ```
 */
export function livewireApiClient(_app: ApplicationService): PluginFn {
  return async () => {
    ApiRequest.macro('withLivewire', function () {
      this.header(LivewireHeaders.Livewire, '1')
      return this
    })

    ApiRequest.macro('withLivewireNavigate', function () {
      this.header(LivewireHeaders.Navigate, '1')
      return this
    })

    /**
     * Main entry point - returns TestableResponse wrapper
     */
    ApiResponse.macro('livewire', function (this: ApiResponse) {
      ensureIsLivewireResponse(this)
      const components = parseLivewireResponse(this.body())

      if (!components || components.length === 0) {
        throw new Error('No Livewire components found in response')
      }

      return new TestableResponse(this, components)
    })
  }
}
