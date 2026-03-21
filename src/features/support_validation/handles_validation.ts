import type { Constructor } from '../../types.js'
import type { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'
import type { InferInput, Infer, ConstructableSchema } from '@vinejs/vine/types'
import type { InferValidationReturnType } from './types.js'

/**
 * Error bag for storing validation errors
 * Key: field name, Value: array of error messages
 */
export type ErrorBag = Record<string, string[]>

/**
 * Trait/mixin for handling validation errors on components
 *
 * Provides methods to manage validation errors (error bag) on components.
 * Uses the component's data store to persist error state.
 *
 * @example
 * ```typescript
 * class FormComponent extends Component {
 *   async submit() {
 *     try {
 *       await validator.validate(...)
 *     } catch (error) {
 *       if (error instanceof ValidationException) {
 *         this.setErrorBag(error.messages)
 *       }
 *     }
 *   }
 * }
 * ```
 */
export function HandlesValidation<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    /**
     * Extract component data for validation
     * Similar to Livewire.generateComponentData but as instance method
     */
    #getComponentData = (): Record<string, any> => {
      const data: Record<string, any> = {}
      const component = this as any

      // Properties to exclude from validation (internal/system properties)
      const excludedProps = ['app', 'ctx', 'viewPath', 'view', 'viewData']

      // Get own properties (excluding private fields and methods)
      for (const key of Object.keys(component)) {
        if (key.startsWith('_') || key.startsWith('#')) continue
        if (excludedProps.includes(key)) continue
        if (typeof component[key] === 'function') continue

        try {
          data[key] = component[key]
        } catch {
          // Skip properties that throw errors when accessed
          continue
        }
      }

      // Get properties from prototype (excluding methods)
      // This includes getters like id and name if they exist
      let prototype = Object.getPrototypeOf(component)
      while (prototype && prototype !== Object.prototype) {
        const props = Object.getOwnPropertyNames(prototype)
        for (const prop of props) {
          if (prop === 'constructor') continue
          if (excludedProps.includes(prop)) continue
          if (typeof component[prop] === 'function') continue
          if (prop.startsWith('_') || prop.startsWith('#')) continue
          if (prop in data) continue // Skip if already added from own properties

          const descriptor = Object.getOwnPropertyDescriptor(prototype, prop)
          if (descriptor && (descriptor.get || descriptor.set)) {
            // Handle getters/setters (like id, name if they exist as getters)
            try {
              data[prop] = component[prop]
            } catch {
              // Skip getters that throw (like uninitialized view)
            }
          } else {
            // Regular properties
            try {
              data[prop] = component[prop]
            } catch {
              // Skip properties that throw errors
            }
          }
        }
        prototype = Object.getPrototypeOf(prototype)
      }

      return data
    }

    /**
     * Extract validation errors from Vine.js error object
     * Follows the same pattern as Form.validate() in adonis project
     */
    #extractVineErrors = (error: any): ErrorBag => {
      const errorMessages: ErrorBag = {}

      // Vine.js errors typically have an 'issues' array
      if (error.issues && Array.isArray(error.issues)) {
        for (const issue of error.issues) {
          const field = issue.path?.join('.') || 'unknown'
          const message = typeof issue.message === 'string' ? issue.message : String(issue.message)
          if (!errorMessages[field]) {
            errorMessages[field] = []
          }
          errorMessages[field].push(message)
        }
      } else if (error.messages) {
        if (Array.isArray(error.messages)) {
          for (const msg of error.messages) {
            if (msg && typeof msg === 'object') {
              if (msg.path && Array.isArray(msg.path)) {
                const field = msg.path.join('.') || 'unknown'
                const message =
                  typeof msg.message === 'string' ? msg.message : String(msg.message || '')
                if (!errorMessages[field]) {
                  errorMessages[field] = []
                }
                errorMessages[field].push(message)
              } else {
                const field = msg.field || msg.name || msg.path || 'unknown'
                const message =
                  typeof msg.message === 'string'
                    ? msg.message
                    : typeof msg.error === 'string'
                      ? msg.error
                      : String(msg || '')
                if (!errorMessages[field]) {
                  errorMessages[field] = []
                }
                errorMessages[field].push(message)
              }
            }
          }
        } else {
          // Fallback to messages object
          for (const [field, messageOrArray] of Object.entries(error.messages)) {
            if (Array.isArray(messageOrArray)) {
              errorMessages[field] = messageOrArray.map(String)
            } else if (messageOrArray) {
              errorMessages[field] = [String(messageOrArray)]
            }
          }
        }
      }

      return errorMessages
    }
    /**
     * Get the error bag for this component
     * Returns an empty error bag if none exists
     *
     * @returns Error bag object with field names as keys and error messages as arrays
     *
     * @example
     * ```typescript
     * const errors = component.getErrorBag()
     * if (errors.email) {
     *   console.log('Email errors:', errors.email)
     * }
     * ```
     */
    getErrorBag(): ErrorBag {
      const s = store(this as any)
      const errorBag = s.get('errorBag')
      if (!errorBag) {
        return {}
      }
      const formatted: ErrorBag = {}
      for (const [key, value] of Object.entries(errorBag)) {
        formatted[key] = Array.isArray(value) ? value : [String(value)]
      }
      return formatted
    }

    /**
     * Set the error bag for this component
     * Accepts either an ErrorBag object or a plain object
     *
     * @param bag - Error bag object or plain object with error messages
     *
     * @example
     * ```typescript
     * component.setErrorBag({
     *   email: ['Email is required'],
     *   password: ['Password must be at least 8 characters']
     * })
     *
     * component.setErrorBag({ email: 'Invalid email' })
     * ```
     */
    setErrorBag(bag: ErrorBag | Record<string, string | string[]>): void {
      const s = store(this as any)
      const normalized: ErrorBag = {}
      for (const [key, value] of Object.entries(bag)) {
        normalized[key] = Array.isArray(value) ? value : [String(value)]
      }
      s.set('errorBag', normalized)
    }

    /**
     * Add an error to a specific field
     *
     * @param field - Field name
     * @param message - Error message
     *
     * @example
     * ```typescript
     * component.addError('email', 'Email is required')
     * component.addError('email', 'Email must be valid')
     * ```
     */
    addError(field: string, message: string): void {
      const s = store(this as any)
      const currentBag = this.getErrorBag()
      if (!currentBag[field]) {
        currentBag[field] = []
      }
      currentBag[field].push(message)
      s.set('errorBag', currentBag)
    }

    /**
     * Reset error bag, optionally for specific fields only
     *
     * @param fields - Optional field names to reset. If not provided, resets all errors
     *
     * @example
     * ```typescript
     * component.resetErrorBag()
     *
     * component.resetErrorBag(['email', 'password'])
     *
     * component.resetErrorBag('email')
     * ```
     */
    resetErrorBag(fields?: string | string[]): void {
      const s = store(this as any)
      if (!fields) {
        s.set('errorBag', {})
        return
      }
      const fieldArray = Array.isArray(fields) ? fields : [fields]
      const currentBag = this.getErrorBag()
      for (const field of fieldArray) {
        delete currentBag[field]
      }
      s.set('errorBag', currentBag)
    }

    /**
     * Clear validation errors for specific fields or all fields
     * Alias for resetErrorBag
     *
     * @param fields - Optional field names to clear. If not provided, clears all errors
     */
    clearValidation(fields?: string | string[]): void {
      this.resetErrorBag(fields)
    }

    /**
     * Reset validation errors for specific fields or all fields
     * Alias for resetErrorBag
     *
     * @param fields - Optional field names to reset. If not provided, resets all errors
     */
    resetValidation(fields?: string | string[]): void {
      this.resetErrorBag(fields)
    }

    /**
     * Check if a specific field has errors
     *
     * @param field - Field name to check
     * @returns True if the field has errors, false otherwise
     *
     * @example
     * ```typescript
     * if (component.hasError('email')) {
     *   console.log('Email field has errors')
     * }
     * ```
     */
    hasError(field: string): boolean {
      const errorBag = this.getErrorBag()
      const errors = errorBag[field]
      return errors !== undefined && errors.length > 0
    }

    /**
     * Get error messages for a specific field
     *
     * @param field - Field name
     * @returns Array of error messages for the field, or empty array if no errors
     *
     * @example
     * ```typescript
     * const emailErrors = component.getError('email')
     * ```
     */
    getError(field: string): string[] {
      const errorBag = this.getErrorBag()
      return errorBag[field] || []
    }

    /**
     * Get the first error message for a specific field
     *
     * @param field - Field name
     * @returns First error message, or undefined if no errors
     *
     * @example
     * ```typescript
     * const firstError = component.getFirstError('email')
     * ```
     */
    getFirstError(field: string): string | undefined {
      const errors = this.getError(field)
      return errors.length > 0 ? errors[0] : undefined
    }

    /**
     * Optional method to define validation rules as a Vine.js schema
     *
     * If defined, this method should return a ConstructableSchema that will be used
     * for validation when validate() is called.
     *
     * @returns Vine.js schema object or undefined
     *
     * @example
     * ```typescript
     * rules?() {
     *   return vine.object({
     *     name: vine.string().minLength(3),
     *     email: vine.string().email()
     *   })
     * }
     * ```
     */
    rules?(): ConstructableSchema<any, any, any> | undefined

    /**
     * Validate component data using schema from rules() method or @validator decorators
     *
     * This method automatically finds the validation schema from:
     * 1. The rules() method if defined (type inference from schema)
     * 2. @validator decorators on properties (builds schema from HasValidate properties)
     *
     * The return type is inferred from:
     * - rules() method return type if defined
     * - ValidatedProperties<this> if using @validator decorators
     *
     * @param data - Optional data to validate. If not provided, uses component properties
     * @returns Promise resolving to validated data with inferred types
     * @throws Error if no schema found (no rules() method and no @validator decorators)
     *
     * @example
     * ```typescript
     * class MyComponent extends Component {
     *   rules() {
     *     return vine.object({
     *       name: vine.string().minLength(3),
     *       email: vine.string().email()
     *     })
     *   }
     *
     *   async submit() {
     *     // validated is typed as { name: string, email: string } from rules()
     *     const validated = await this.validate()
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * class MyComponent extends Component {
     *   @validator(() => vine.string().minLength(3))
     *   declare name: HasValidate<string>
     *
     *   @validator(() => vine.string().email())
     *   declare email: HasValidate<string>
     *
     *   async submit() {
     *     // validated is typed as { name: string, email: string } from ValidatedProperties
     *     const validated = await this.validate()
     *   }
     * }
     * ```
     */
    async validate(data?: Record<string, any>): Promise<InferValidationReturnType<this>> {
      // Try to get schema from rules() method first
      let schema: ConstructableSchema<any, any, any> | undefined
      if (typeof (this as any).rules === 'function') {
        schema = (this as any).rules()
      }

      // If no schema from rules(), try to build from @validator decorators
      if (!schema) {
        schema = await this.#buildSchemaFromValidators()
      }

      if (!schema) {
        throw new Error(
          'No validation schema found. Either implement a rules() method or use @validator decorators on properties.'
        )
      }

      // Use validateUsing with the found schema
      // The return type will be inferred from rules() if available, otherwise ValidatedProperties<this>
      return this.validateUsing(schema, data) as Promise<InferValidationReturnType<this>>
    }

    /**
     * Build Vine.js schema from @validator decorators on properties
     */
    #buildSchemaFromValidators = async (): Promise<
      ConstructableSchema<any, any, any> | undefined
    > => {
      const { default: vine } = await import('@vinejs/vine')
      const component = this as any
      const decorators = component.getDecorators?.() || []

      const validatorDecorators = decorators.filter((d: any) => d.constructor.name === 'Validator')

      if (validatorDecorators.length === 0) {
        return undefined
      }

      // Build schema object from decorators
      const schemaFields: Record<string, any> = {}
      for (const decorator of validatorDecorators) {
        if (decorator.schemaFactory) {
          // Call the schema factory function to get the field schema
          const fieldSchema = decorator.schemaFactory()
          schemaFields[decorator.propertyName] = fieldSchema
        }
      }

      if (Object.keys(schemaFields).length === 0) {
        return undefined
      }

      return vine.object(schemaFields)
    }

    /**
     * Validate component data using a Vine.js schema
     *
     * @param schema - Vine.js validation schema (required)
     * @param data - Optional data to validate. If not provided, uses component properties
     * @returns Promise resolving to validated data with proper type inference
     * @throws Validation error if validation fails (errors are automatically set in error bag)
     *
     * @example
     * ```typescript
     * import vine from '@vinejs/vine'
     *
     * const schema = vine.object({
     *   name: vine.string().minLength(3),
     *   email: vine.string().email()
     * })
     *
     * const validated = await this.validateUsing(schema)
     * // validated is typed as { name: string, email: string }
     * ```
     */
    async validateUsing<TSchema extends ConstructableSchema<any, any, any>>(
      schema: TSchema,
      data?: InferInput<TSchema>
    ): Promise<Infer<TSchema>> {
      // Import vine dynamically
      const { default: vine } = await import('@vinejs/vine')

      // Extract data from component if not provided
      const dataToValidate = data ?? this.#getComponentData()

      try {
        const validated = await vine.validate({ schema, data: dataToValidate })
        this.resetErrorBag()
        return validated
      } catch (error: any) {
        // Convert Vine.js errors to error bag format
        const errorMessages = this.#extractVineErrors(error)
        this.setErrorBag(errorMessages)
        throw error
      }
    }
  }
}
