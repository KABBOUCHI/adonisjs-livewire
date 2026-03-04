import { AssertionError } from 'node:assert'
import { Constructor } from '../../types.js'
import { BaseTestable } from '../support_testing/base_testable.js'

/**
 * Dispatched event structure
 */
export interface DispatchedEvent {
  name: string
  params: Record<string, any>
  to?: string
  self?: boolean
}

/**
 * Provides event assertion methods for testing components
 * Equivalent to PHP's TestsEvents trait
 */
export function TestsEvents<TConstructor extends Constructor<BaseTestable>>(Base: TConstructor) {
  return class extends Base {
    /**
     * Dispatch an event to the component
     *
     * @param event - The event name to dispatch
     * @param params - Parameters to pass to the event handler
     *
     * @example
     * test.dispatch('userCreated', { id: 1 })
     */
    dispatch(event: string, ...params: any[]): this {
      this.call('__dispatch', event, params)
      return this
    }

    /**
     * Alias for dispatch
     * @deprecated Use dispatch instead
     */
    fireEvent(event: string, ...params: any[]): this {
      return this.dispatch(event, ...params)
    }

    /**
     * Assert that an event was dispatched
     *
     * @param event - The event name to check
     * @param params - Optional parameters or callback to verify
     *
     * @example
     * // Assert event was dispatched
     * test.assertDispatched('userCreated')
     *
     * // Assert event was dispatched with specific parameters
     * test.assertDispatched('userCreated', { id: 1 })
     *
     * // Assert event with callback verification
     * test.assertDispatched('userCreated', (name, params) => params.id === 1)
     */
    assertDispatched(
      event: string,
      ...params: any[] | [(name: string, params: Record<string, any>) => boolean]
    ): this {
      const result = this.#testDispatched(event, params)

      if (!result.test) {
        throw new AssertionError({
          message: `Failed asserting that an event [${event}] was fired${result.assertionSuffix}`,
          actual: this.#getDispatchedEvents(),
          expected: event,
          operator: 'dispatched',
        })
      }

      return this
    }

    /**
     * Assert that an event was NOT dispatched
     *
     * @param event - The event name to check
     * @param params - Optional parameters to verify
     *
     * @example
     * test.assertNotDispatched('userDeleted')
     * test.assertNotDispatched('userCreated', { id: 1 })
     */
    assertNotDispatched(
      event: string,
      ...params: any[] | [(name: string, params: Record<string, any>) => boolean]
    ): this {
      const result = this.#testDispatched(event, params)

      if (result.test) {
        throw new AssertionError({
          message: `Failed asserting that an event [${event}] was not fired${result.assertionSuffix}`,
          actual: this.#getDispatchedEvents(),
          expected: `no ${event} event`,
          operator: 'notDispatched',
        })
      }

      return this
    }

    /**
     * Assert that an event was dispatched to a specific component
     *
     * @param target - The target component name or class
     * @param event - The event name
     * @param params - Optional parameters to verify
     *
     * @example
     * test.assertDispatchedTo('user-list', 'refresh')
     * test.assertDispatchedTo(UserList, 'userCreated', { id: 1 })
     */
    assertDispatchedTo(target: string | Function, event: string, ...params: any[]): this {
      // First assert the event was dispatched
      this.assertDispatched(event, ...params)

      // Then check the target
      const result = this.#testDispatchedTo(target, event)

      if (!result) {
        const targetName = typeof target === 'function' ? target.name : target

        throw new AssertionError({
          message: `Failed asserting that an event [${event}] was fired to ${targetName}.`,
          actual: this.#getDispatchedEvents(),
          expected: `${event} dispatched to ${targetName}`,
          operator: 'dispatchedTo',
        })
      }

      return this
    }

    /**
     * Get all dispatched events from effects
     */
    #getDispatchedEvents(): DispatchedEvent[] {
      const effects = this.state.getEffects()
      return (effects.dispatched as DispatchedEvent[]) ?? []
    }

    /**
     * Test if an event was dispatched with optional parameter matching
     */
    #testDispatched(event: string, params: any[]): { test: boolean; assertionSuffix: string } {
      let assertionSuffix = '.'
      const dispatches = this.#getDispatchedEvents()

      if (params.length === 0) {
        // No params - just check if event exists
        const test = dispatches.some((d) => d.name === event)
        return { test, assertionSuffix }
      }

      // Check if first param is a callback
      if (params.length === 1 && typeof params[0] === 'function') {
        const callback = params[0] as (name: string, params: Record<string, any>) => boolean
        const matchingEvent = dispatches.find((d) => d.name === event)

        if (!matchingEvent) {
          return { test: false, assertionSuffix }
        }

        const test = callback(matchingEvent.name, matchingEvent.params)
        return { test, assertionSuffix }
      }

      // Check with parameter matching
      const expectedParams =
        params.length === 1 && typeof params[0] === 'object' ? params[0] : params

      const test = dispatches.some((d) => {
        if (d.name !== event) return false

        // Check if all expected params match
        const actualParams = d.params ?? {}

        if (Array.isArray(expectedParams)) {
          // Array comparison
          return JSON.stringify(actualParams) === JSON.stringify(expectedParams)
        }

        // Object comparison - check if expected params are subset of actual
        for (const [key, value] of Object.entries(expectedParams)) {
          if (!this.#isEqual(actualParams[key], value)) {
            return false
          }
        }
        return true
      })

      assertionSuffix = ` with parameters: ${JSON.stringify(expectedParams)}`
      return { test, assertionSuffix }
    }

    /**
     * Test if an event was dispatched to a specific component
     */
    #testDispatchedTo(target: string | Function, event: string): boolean {
      const dispatches = this.#getDispatchedEvents()

      // Resolve component name from class or string
      const targetName = typeof target === 'function' ? this.#resolveComponentName(target) : target

      return dispatches.some((d) => d.name === event && d.to === targetName)
    }

    /**
     * Resolve component name from class
     */
    #resolveComponentName(target: Function): string {
      // Try to get the component name from the class
      // This follows the convention of kebab-case from PascalCase
      const name = target.name
      return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
    }

    /**
     * Deep equality check
     */
    #isEqual(a: any, b: any): boolean {
      if (a === b) return true
      if (a === null || b === null) return false
      if (typeof a !== typeof b) return false

      if (typeof a === 'object') {
        return JSON.stringify(a) === JSON.stringify(b)
      }

      return false
    }
  }
}

/**
 * Interface for type safety when using TestsEvents mixin
 */
export interface TestsEvents {
  dispatch(event: string, ...params: any[]): this
  fireEvent(event: string, ...params: any[]): this
  assertDispatched(
    event: string,
    ...params: any[] | [(name: string, params: Record<string, any>) => boolean]
  ): this
  assertNotDispatched(
    event: string,
    ...params: any[] | [(name: string, params: Record<string, any>) => boolean]
  ): this
  assertDispatchedTo(target: string | Function, event: string, ...params: any[]): this
}
