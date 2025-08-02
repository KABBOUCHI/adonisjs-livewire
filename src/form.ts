import vine, { VineObject } from '@vinejs/vine'
import { InferInput, Infer } from '@vinejs/vine/types'
import { SchemaTypes } from '@vinejs/vine/types'
import { compareValues } from '@adonisjs/lucid/utils'
import { BaseComponent } from './base_component.js'

/**
 * Form Mixin Factory
 *
 * Creates a Form handler class that integrates with AdonisJS Livewire components
 * for reactive form management with validation, error handling, and state tracking.
 *
 * @example
 * ```typescript
 * // Define a VineJS schema
 * const userSchema = vine.object({
 *   name: vine.string().minLength(3),
 *   email: vine.string().email(),
 *   age: vine.number().min(18)
 * })
 *
 * // Create a Livewire component with form capabilities
 * export default class UserForm extends Form(userSchema) {
 *   mount() {
 *     this.defaults({
 *       name: '',
 *       email: '',
 *       age: 18
 *     })
 *   }
 *
 *   async save() {
 *     try {
 *       const validatedData = await this.validate()
 *       // Save the user...
 *       this.resetAndClearErrors()
 *     } catch (error) {
 *       // Validation errors are automatically set on this.errors
 *     }
 *   }
 * }
 * ```
 *
 * @param schema - VineJS schema for form validation
 * @returns Form handler class with type-safe form management capabilities
 */
export function Form<T extends SchemaTypes>(schema: T) {
  interface FormHandler extends BaseComponent {}

  type ValidationErrors = Partial<
    Record<
      keyof InferInput<T>,
      Array<{
        message: string
        rule?: string
      }>
    >
  >

  /**
   * Form Handler Class
   *
   * Provides form management with validation, error handling, and state tracking.
   */
  class FormHandler {
    // Livewire component properties
    declare __id: string
    declare __name: string
    declare __view_path: string

    /**
     * Form data object containing current form values
     */
    form: InferInput<T> = {} as InferInput<T>

    /**
     * Form validation errors
     */
    errors: ValidationErrors = {}

    /**
     * Internal form management state
     */
    __form = {
      defaultFormValues: {} as Partial<InferInput<T>>,
      schema: schema as unknown as VineObject<any, any, any, any>,
      initializedFields: new Set<keyof InferInput<T>>(), // Track which fields have been set by user
    }

    /**
     * Check if a form field value is considered "empty" for defaults purposes
     */
    isFieldEmpty(value: any): boolean {
      return value === undefined || value === null
    }

    /**
     * Check if a field has been initialized/touched by the user
     */
    isFieldInitialized(fieldName: keyof InferInput<T>): boolean {
      return this.__form.initializedFields.has(fieldName)
    }

    /**
     * Mark a field as initialized/touched by the user
     */
    markFieldAsInitialized(fieldName: keyof InferInput<T>): void {
      this.__form.initializedFields.add(fieldName)
    }

    /**
     * Get the current form values that have been modified compared to the default values
     */
    get $dirty(): Partial<InferInput<T>> {
      const dirty: Partial<InferInput<T>> = {}

      Object.keys(this.form).forEach((key) => {
        const currentValue = this.form[key as keyof InferInput<T>]
        const originalValue = this.__form.defaultFormValues[key as keyof InferInput<T>]

        if (!compareValues(originalValue, currentValue)) {
          dirty[key as keyof InferInput<T>] = currentValue
        }
      })

      return dirty
    }

    /**
     * Check if the form has any validation errors
     */
    get hasErrors(): boolean {
      return Object.keys(this.errors).length > 0
    }

    /**
     * Check if the form has unsaved changes (is dirty)
     */
    isDirty(): boolean
    isDirty(key: keyof InferInput<T>): boolean
    isDirty(key?: keyof InferInput<T>): boolean {
      if (key) {
        return this.$dirty[key] !== undefined
      }
      return Object.keys(this.$dirty).length > 0
    }

    /**
     * Get a complete copy of the form data
     */
    data(): InferInput<T> {
      return { ...this.__form.defaultFormValues, ...this.form }
    }

    /**
     * Update form data with provided values, filtering out undefined values
     */
    compact(values: Partial<InferInput<T>>): this {
      Object.entries(values).forEach(([key, value]) => {
        const typedKey = key as keyof InferInput<T>
        if (value === undefined) return
        if (typedKey in this.form) {
          this.form[typedKey] = value as InferInput<T>[keyof InferInput<T>]
        }
      })

      return this
    }

    /**
     * Set default values for form fields
     *
     * Smart override prevention: Won't overwrite user input
     */
    defaults(): this
    defaults(field: keyof InferInput<T>, value: any): this
    defaults(fields: Partial<InferInput<T>>): this
    defaults(fieldOrFields?: keyof InferInput<T> | Partial<InferInput<T>>, maybeValue?: any): this {
      if (typeof fieldOrFields === 'undefined') {
        this.__form.defaultFormValues = { ...this.form }
      } else if (typeof fieldOrFields === 'string') {
        this.__form.defaultFormValues = {
          ...this.__form.defaultFormValues,
          [fieldOrFields]: maybeValue,
        }

        // Only set the actual form value if it doesn't exist or is empty AND hasn't been initialized by user
        if (
          !(fieldOrFields in this.form) ||
          (this.isFieldEmpty(this.form[fieldOrFields]) && !this.isFieldInitialized(fieldOrFields))
        ) {
          this.form[fieldOrFields] = maybeValue
        }
      } else {
        this.__form.defaultFormValues = {
          ...this.__form.defaultFormValues,
          ...(fieldOrFields as Partial<InferInput<T>>),
        }

        // Only set form values that don't exist or are empty AND haven't been initialized by user
        Object.entries(fieldOrFields as Partial<InferInput<T>>).forEach(([key, value]) => {
          const typedKey = key as keyof InferInput<T>
          if (
            !(typedKey in this.form) ||
            (this.isFieldEmpty(this.form[typedKey]) && !this.isFieldInitialized(typedKey))
          ) {
            this.form[typedKey] = value as InferInput<T>[keyof InferInput<T>]
          }
        })
      }

      return this
    }

    /**
     * Reset form fields to their default values
     */
    reset(...fields: (keyof InferInput<T>)[]): this {
      if (fields.length === 0) {
        if (Object.keys(this.__form.defaultFormValues).length === 0) {
          // If no default values are set, reset the form to initial state
          this.form = {} as InferInput<T>
        }

        // Reset all fields
        Object.keys(this.__form.defaultFormValues).forEach((key) => {
          const typedKey = key as keyof InferInput<T>
          this.form[typedKey] = this.__form.defaultFormValues[
            typedKey
          ] as InferInput<T>[keyof InferInput<T>]
        })
      } else {
        // Reset specific fields
        fields.forEach((field) => {
          if (field in this.__form.defaultFormValues) {
            this.form[field] = this.__form.defaultFormValues[
              field
            ] as InferInput<T>[keyof InferInput<T>]
          }
        })
      }
      return this
    }

    /**
     * Set form validation errors
     */
    setError(field: keyof InferInput<T>, value: { message: string; rule?: string }): this
    setError(errors: Record<keyof InferInput<T>, Array<{ message: string; rule?: string }>>): this
    setError(
      fieldOrErrors:
        | keyof InferInput<T>
        | Record<keyof InferInput<T>, Array<{ message: string; rule?: string }>>,
      maybeValue?: { message: string; rule?: string }
    ): this {
      if (typeof fieldOrErrors === 'string') {
        if (fieldOrErrors in this.errors && this.errors[fieldOrErrors]) {
          this.errors[fieldOrErrors]!.push(maybeValue!)
        } else {
          this.errors = {
            ...this.errors,
            [fieldOrErrors]: [maybeValue!],
          }
        }
      } else {
        Object.assign(this.errors, fieldOrErrors)
      }

      return this
    }

    /**
     * Clear form validation errors
     */
    clearErrors(...fields: (keyof InferInput<T>)[]): this {
      if (fields.length === 0) {
        this.errors = {}
      } else {
        fields.forEach((field) => {
          delete this.errors[field]
        })
      }
      return this
    }

    /**
     * Reset form data and clear all validation errors
     */
    resetAndClearErrors(...fields: (keyof InferInput<T>)[]): this {
      this.reset(...fields)
      this.clearErrors(...fields)
      return this
    }

    /**
     * Validate form data using VineJS schema
     *
     * Supports full form validation and field-level validation.
     * Automatically manages error state and integrates with Livewire's view system.
     */
    async validate(): Promise<Infer<T>>
    async validate<K extends keyof InferInput<T>>(field: K): Promise<Infer<T>[K]>
    async validate<K extends keyof InferInput<T>>(
      field: K,
      value: InferInput<T>[K]
    ): Promise<Infer<T>[K]>
    async validate(field?: keyof InferInput<T>, value?: any): Promise<InferInput<T>> {
      if (!this.__form) {
        throw new Error('Validation schema not provided. Cannot validate form.')
      }

      let schematic = this.__form.schema
      let data = this.data()

      if (field) {
        this.clearErrors(field)
        // Validate only the specified field
        schematic = vine.object({
          [field]: this.__form.schema.getProperties()[field],
        })
        data = { [field]: value ?? this.data()[field] }
      }

      return vine
        .compile(schematic)
        .validate(data)
        .then((validatedData) => {
          this.clearErrors()
          return field ? validatedData[field] : validatedData
        })
        .catch((error) => {
          for (const { field: errorField, rule, message } of error.messages) {
            this.setError(errorField, { message, rule })
          }

          throw error
        })
    }
  }

  return FormHandler
}
