import { AssertionError } from 'node:assert'
import { Constructor } from '../../types.js'
import { BaseTestable } from './base_testable.js'

/**
 * Provides assertion methods for testing components
 */
export function MakesAssertions<TConstructor extends Constructor<BaseTestable>>(
  Base: TConstructor
) {
  return class extends Base {
    /**
     * Assert that the HTML contains a specific string
     */
    assertSee(value: string, escape: boolean = true): this {
      const html = this.state.getHtml()
      const searchValue = escape ? this.#escapeHtml(value) : value

      if (!html.includes(searchValue)) {
        throw new AssertionError({
          message: `Failed asserting that '${searchValue}' is found in the component HTML output.`,
          actual: html,
          expected: searchValue,
          operator: 'includes',
        })
      }

      return this
    }

    /**
     * Assert that the HTML does not contain a specific string
     */
    assertDontSee(value: string, escape: boolean = true): this {
      const html = this.state.getHtml()
      const searchValue = escape ? this.#escapeHtml(value) : value

      if (html.includes(searchValue)) {
        throw new AssertionError({
          message: `Failed asserting that '${searchValue}' is not found in the component HTML output.`,
          actual: html,
          expected: `not to include ${searchValue}`,
          operator: 'notIncludes',
        })
      }

      return this
    }

    /**
     * Assert that a property has a specific value
     */
    assertSet(propertyName: string, value: any): this {
      const actual = this.state.get(propertyName)

      if (!this.#isEqual(actual, value)) {
        throw new AssertionError({
          message: `Failed asserting that property '${propertyName}' is set to ${JSON.stringify(value)}`,
          actual: actual,
          expected: value,
          operator: 'strictEqual',
        })
      }

      return this
    }

    /**
     * Assert that a property is not set to a specific value
     */
    assertNotSet(propertyName: string, value: any): this {
      const actual = this.state.get(propertyName)

      if (this.#isEqual(actual, value)) {
        throw new AssertionError({
          message: `Failed asserting that property '${propertyName}' is not set to ${JSON.stringify(value)}`,
          actual: actual,
          expected: `not ${JSON.stringify(value)}`,
          operator: 'notStrictEqual',
        })
      }

      return this
    }

    /**
     * Assert that an array property has a specific count
     */
    assertCount(propertyName: string, count: number): this {
      const actual = this.state.get(propertyName)

      if (!Array.isArray(actual)) {
        throw new AssertionError({
          message: `Failed asserting that property '${propertyName}' is an array`,
          actual: typeof actual,
          expected: 'array',
          operator: 'strictEqual',
        })
      }

      if (actual.length !== count) {
        throw new AssertionError({
          message: `Failed asserting that property '${propertyName}' has ${count} items`,
          actual: actual.length,
          expected: count,
          operator: 'strictEqual',
        })
      }

      return this
    }

    /**
     * Escape HTML special characters
     */
    #escapeHtml(value: string): string {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }

      return value.replace(/[&<>"']/g, (char) => map[char])
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

export interface MakesAssertions {
  assertSee(value: string, escape?: boolean): this
  assertDontSee(value: string, escape?: boolean): this
  assertSet(propertyName: string, value: any): this
  assertNotSet(propertyName: string, value: any): this
  assertCount(propertyName: string, count: number): this
}
