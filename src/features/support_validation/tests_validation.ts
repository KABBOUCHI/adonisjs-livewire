import { AssertionError } from 'node:assert'
import { Constructor } from '../../types.js'
import { BaseTestable } from '../support_testing/base_testable.js'

/**
 * Validation error keys type
 * Supports: string, string[], or Record<string, string | string[]>
 */
export type ValidationErrorKeys = string | string[] | Record<string, string | string[]>

/**
 * MessageBag-like structure for validation errors
 */
export class MessageBag {
  #messages: Map<string, string[]>

  constructor(errors: Record<string, string[]> = {}) {
    this.#messages = new Map(Object.entries(errors))
  }

  /**
   * Check if there are any errors
   */
  isEmpty(): boolean {
    return this.#messages.size === 0
  }

  /**
   * Check if there are any errors
   */
  isNotEmpty(): boolean {
    return !this.isEmpty()
  }

  /**
   * Check if a key has errors
   */
  has(key: string): boolean {
    return this.#messages.has(key) && (this.#messages.get(key)?.length ?? 0) > 0
  }

  /**
   * Get error messages for a key
   */
  get(key: string): string[] {
    return this.#messages.get(key) ?? []
  }

  /**
   * Get all error keys
   */
  keys(): string[] {
    return Array.from(this.#messages.keys())
  }

  /**
   * Get all messages as a record
   */
  all(): Record<string, string[]> {
    return Object.fromEntries(this.#messages)
  }
}

/**
 * Provides validation assertion methods for testing components
 * Equivalent to PHP's TestsValidation trait
 */
export function TestsValidation<TConstructor extends Constructor<BaseTestable>>(
  Base: TConstructor
) {
  return class extends Base {
    /**
     * Get validation errors from component
     * Checks multiple sources: effects.errors, memo.errors, or component.getErrorBag()
     */
    errors(): MessageBag {
      // First check effects (for immediate responses)
      const effects = this.state.getEffects()
      if (effects.errors && Object.keys(effects.errors).length > 0) {
        return new MessageBag(effects.errors)
      }

      // Then check memo (for persisted errors in snapshot)
      const snapshot = this.state.getSnapshot()
      if (snapshot.memo?.errors && Object.keys(snapshot.memo.errors).length > 0) {
        return new MessageBag(snapshot.memo.errors)
      }

      // Finally check component's error bag directly
      const component = this.state.getComponent() as any
      if (typeof component.getErrorBag === 'function') {
        const errorBag = component.getErrorBag()
        if (errorBag && Object.keys(errorBag).length > 0) {
          return new MessageBag(errorBag)
        }
      }

      return new MessageBag({})
    }

    /**
     * Get failed validation rules
     */
    failedRules(): Record<string, string[]> {
      // Check effects first
      const effects = this.state.getEffects()
      if (effects.failedRules) {
        return effects.failedRules
      }

      // Then check memo
      const snapshot = this.state.getSnapshot()
      if (snapshot.memo?.failedRules) {
        return snapshot.memo.failedRules
      }

      return {}
    }

    /**
     * Assert the component has validation errors
     *
     * @example
     * // Assert component has any errors
     * test.assertHasErrors()
     *
     * // Assert component has errors for specific keys
     * test.assertHasErrors('name')
     * test.assertHasErrors(['name', 'email'])
     *
     * // Assert component has errors for specific keys with specific rules
     * test.assertHasErrors({ name: 'required', email: ['required', 'email'] })
     */
    assertHasErrors(keys: ValidationErrorKeys = []): this {
      const errors = this.errors()

      if (errors.isEmpty()) {
        throw new AssertionError({
          message: 'Component has no errors.',
          actual: errors.all(),
          expected: 'errors',
          operator: 'hasErrors',
        })
      }

      // If keys is empty, we just check that errors exist (done above)
      if (
        (typeof keys === 'string' && keys === '') ||
        (Array.isArray(keys) && keys.length === 0) ||
        (typeof keys === 'object' && !Array.isArray(keys) && Object.keys(keys).length === 0)
      ) {
        return this
      }

      // Convert to array if string
      const keysArray = typeof keys === 'string' ? [keys] : keys

      if (Array.isArray(keysArray)) {
        // Simple array of keys
        for (const key of keysArray) {
          this.#makeErrorAssertion(key)
        }
      } else {
        // Object with key => rule/rules mapping
        for (const [key, value] of Object.entries(keysArray)) {
          this.#makeErrorAssertion(key, value)
        }
      }

      return this
    }

    /**
     * Assert the component has no validation errors
     *
     * @example
     * // Assert component has no errors at all
     * test.assertHasNoErrors()
     *
     * // Assert component has no errors for specific keys
     * test.assertHasNoErrors('name')
     * test.assertHasNoErrors(['name', 'email'])
     *
     * // Assert component has no specific rule errors
     * test.assertHasNoErrors({ name: 'required' })
     */
    assertHasNoErrors(keys: ValidationErrorKeys = []): this {
      const errors = this.errors()

      // No keys specified - check for no errors at all
      if (
        (typeof keys === 'string' && keys === '') ||
        (Array.isArray(keys) && keys.length === 0) ||
        (typeof keys === 'object' && !Array.isArray(keys) && Object.keys(keys).length === 0)
      ) {
        if (errors.isNotEmpty()) {
          throw new AssertionError({
            message: `Component has errors: "${errors.keys().join('", "')}"`,
            actual: errors.all(),
            expected: 'no errors',
            operator: 'hasNoErrors',
          })
        }
        return this
      }

      // Convert to array if string
      const keysArray = typeof keys === 'string' ? [keys] : keys

      if (Array.isArray(keysArray)) {
        // Simple array of keys - assert no errors for these keys
        for (const key of keysArray) {
          if (errors.has(key)) {
            throw new AssertionError({
              message: `Component has error: ${key}`,
              actual: errors.get(key),
              expected: `no error for ${key}`,
              operator: 'hasNoErrors',
            })
          }
        }
      } else {
        // Object with key => rule/rules mapping - assert no specific rule errors
        for (const [key, value] of Object.entries(keysArray)) {
          const failed = this.failedRules()
          const rules = failed[key] ?? []

          const values = Array.isArray(value) ? value : [value]

          for (let rule of values) {
            // Handle rule:params format
            if (rule.includes(':')) {
              rule = rule.split(':')[0]
            }

            // Convert to studly case for comparison
            const studlyRule = this.#toStudlyCase(rule)

            if (rules.includes(studlyRule) || rules.includes(rule)) {
              throw new AssertionError({
                message: `Component has [${rule}] errors for [${key}] attribute.`,
                actual: rules,
                expected: `no ${rule} error for ${key}`,
                operator: 'hasNoErrors',
              })
            }
          }
        }
      }

      return this
    }

    /**
     * Internal method to make an error assertion for a specific key
     */
    #makeErrorAssertion(key: string, value?: string | string[]): void {
      const errors = this.errors()
      const messages = errors.get(key)
      const failed = this.failedRules()
      const failedRules = (failed[key] ?? []).map((rule) => this.#toSnakeCase(rule))

      // Check that errors exist
      if (errors.isEmpty()) {
        throw new AssertionError({
          message: 'Component has no errors.',
          actual: errors.all(),
          expected: 'errors',
          operator: 'hasErrors',
        })
      }

      // If no value specified, just check the key exists
      if (value === undefined) {
        if (!errors.has(key)) {
          throw new AssertionError({
            message: `Component missing error: ${key}`,
            actual: errors.keys(),
            expected: key,
            operator: 'hasError',
          })
        }
        return
      }

      // Check for specific rule/message
      const values = Array.isArray(value) ? value : [value]

      for (const ruleOrMessage of values) {
        this.#assertErrorMatchesRuleOrMessage(failedRules, messages, key, ruleOrMessage)
      }
    }

    /**
     * Assert that an error matches a specific rule or message
     */
    #assertErrorMatchesRuleOrMessage(
      rules: string[],
      messages: string[],
      key: string,
      ruleOrMessage: string
    ): void {
      let normalizedRule = ruleOrMessage

      // Handle rule:params format
      if (ruleOrMessage.includes(':')) {
        normalizedRule = ruleOrMessage.split(':')[0]
      }

      // Check if it matches a failed rule
      if (rules.includes(normalizedRule) || rules.includes(this.#toSnakeCase(normalizedRule))) {
        return // Assertion passes
      }

      // Check if it matches an error message
      if (messages.includes(ruleOrMessage)) {
        return // Assertion passes
      }

      throw new AssertionError({
        message: `Component has no matching failed rule or error message [${ruleOrMessage}] for [${key}] attribute.`,
        actual: { rules, messages },
        expected: ruleOrMessage,
        operator: 'matchesRuleOrMessage',
      })
    }

    /**
     * Convert string to snake_case
     */
    #toSnakeCase(str: string): string {
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase()
    }

    /**
     * Convert string to StudlyCase (PascalCase)
     */
    #toStudlyCase(str: string): string {
      return str
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .replace(/\s+/g, '')
    }
  }
}

/**
 * Interface for type safety when using TestsValidation mixin
 */
export interface TestsValidation {
  errors(): MessageBag
  failedRules(): Record<string, string[]>
  assertHasErrors(keys?: ValidationErrorKeys): this
  assertHasNoErrors(keys?: ValidationErrorKeys): this
}
