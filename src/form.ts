import vine, { VineObject } from '@vinejs/vine'
import { InferInput, Infer } from '@vinejs/vine/types'
import { SchemaTypes } from '@vinejs/vine/types'
import { compareValues, isObject } from '@adonisjs/lucid/utils'
import { Component } from './component.js'

type ErrorField = {
  message: string
  rule?: string
}

export type ValidationErrors<T extends SchemaTypes> = Partial<
  Record<keyof InferInput<T>, Array<ErrorField>>
>

export class FormStore<Schema extends SchemaTypes> {
  defaultValues: Partial<InferInput<Schema>> = {}
  values: InferInput<Schema> = {} as InferInput<Schema>
  errors: Partial<Record<keyof InferInput<Schema>, Array<ErrorField>>> = {}
  initializedFields: Set<keyof InferInput<Schema>> = new Set()

  keys: (keyof InferInput<Schema>)[] = []

  constructor(public schema: VineObject<any, any, any, any>) {
    this.keys = Object.keys(schema.getProperties()) as (keyof InferInput<Schema>)[]
    this.values = this.keys.reduce((acc, key) => {
      acc[key] = undefined as InferInput<Schema>[keyof InferInput<Schema>]
      return acc
    }, {} as InferInput<Schema>)
    this.defaultValues = { ...this.values }
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
  isFieldInitialized(fieldName: keyof InferInput<Schema>): boolean {
    return this.initializedFields.has(fieldName)
  }

  /**
   * Mark a field as initialized/touched by the user
   */
  markFieldAsInitialized(fieldName: keyof InferInput<Schema>): void {
    this.initializedFields.add(fieldName)
  }
}

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
export function Form<T extends SchemaTypes, Meta = Record<string, any>>(schema: T) {
  interface FormHandler extends Component {}

  /**
   * Form Handler Class
   *
   * Provides form management with validation, error handling, and state tracking.
   */
  abstract class FormHandler {
    // Livewire component properties
    abstract __id: string
    abstract __name: string
    abstract __view_path: string
    abstract js(): void

    /**
     * Internal form management state
     */
    __form = new FormStore<T>(schema as any)

    /**
     * Form data object containing current form values
     */
    form: InferInput<T> = new Proxy(this.__form.values, {
      set: (target, prop, value) => {
        // Handle symbols and non-string properties
        if (typeof prop !== 'string') {
          target[prop] = value
          return true
        }

        const typedProp = prop as keyof InferInput<T>
        if (typedProp in target || this.__form.keys.includes(typedProp)) {
          target[typedProp] = value as InferInput<T>[keyof InferInput<T>]

          // Mark field as initialized/touched by user
          if (!this.__form.isFieldEmpty(value)) {
            this.__form.markFieldAsInitialized(typedProp)
          }

          return true
        }

        return false
      },
      get: (target, prop) => {
        // Handle non-string properties
        if (typeof prop !== 'string') {
          return target[prop]
        }

        const typedProp = prop as keyof InferInput<T>

        // First check if the property exists in the target (current values)
        if (typedProp in target) {
          return target[typedProp]
        }

        // Then check if it's a valid schema field and return default value
        if (this.__form.keys.includes(typedProp)) {
          return this.__form.defaultValues[typedProp]
        }

        // For any other property, return undefined
        return undefined
      },
    })

    /**
     * Get the current form values that have been modified compared to the default values
     */
    get $dirty(): Partial<InferInput<T>> {
      const dirty: Partial<InferInput<T>> = {}

      Object.keys(this.form).forEach((key) => {
        const currentValue = this.form[key as keyof InferInput<T>]
        const originalValue = this.__form.defaultValues[key as keyof InferInput<T>]

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
      return Object.keys(this.__form.errors).length > 0
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
      return { ...this.__form.defaultValues, ...this.form }
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
        this.__form.defaultValues = { ...this.form }
      } else if (typeof fieldOrFields === 'string') {
        this.__form.defaultValues = {
          ...this.__form.defaultValues,
          [fieldOrFields]: maybeValue,
        }

        // Only set the actual form value if it doesn't exist or is empty AND hasn't been initialized by user
        if (
          !(fieldOrFields in this.form) ||
          (this.__form.isFieldEmpty(this.form[fieldOrFields]) &&
            !this.__form.isFieldInitialized(fieldOrFields))
        ) {
          this.form[fieldOrFields] = maybeValue
        }
      } else {
        this.__form.defaultValues = {
          ...this.__form.defaultValues,
          ...(fieldOrFields as Partial<InferInput<T>>),
        }

        // Only set form values that don't exist or are empty AND haven't been initialized by user
        Object.entries(fieldOrFields as Partial<InferInput<T>>).forEach(([key, value]) => {
          const typedKey = key as keyof InferInput<T>
          if (
            !(typedKey in this.form) ||
            (this.__form.isFieldEmpty(this.form[typedKey]) &&
              !this.__form.isFieldInitialized(typedKey))
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
        if (Object.keys(this.__form.defaultValues).length === 0) {
          // If no default values are set, reset the form to initial state
          this.form = {} as InferInput<T>
        }

        // Reset all fields
        Object.keys(this.__form.defaultValues).forEach((key) => {
          const typedKey = key as keyof InferInput<T>
          this.form[typedKey] = this.__form.defaultValues[
            typedKey
          ] as InferInput<T>[keyof InferInput<T>]
        })
      } else {
        // Reset specific fields
        fields.forEach((field) => {
          if (field in this.__form.defaultValues) {
            this.form[field] = this.__form.defaultValues[
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
    setError(field: keyof InferInput<T>, value: { message: string; rule: string }): this
    setError(errors: Record<keyof InferInput<T>, Array<{ message: string; rule: string }>>): this
    setError(
      fieldOrErrors:
        | keyof InferInput<T>
        | Record<keyof InferInput<T>, Array<{ message: string; rule: string }>>,
      maybeValue?: { message: string; rule: string }
    ): this {
      if (typeof fieldOrErrors === 'string') {
        if (fieldOrErrors in this.__form.errors && this.__form.errors[fieldOrErrors]) {
          this.__form.errors[fieldOrErrors]!.push(maybeValue!)
        } else {
          this.__form.errors = {
            ...this.__form.errors,
            [fieldOrErrors]: [maybeValue!],
          }
        }
      } else {
        Object.assign(this.__form.errors, fieldOrErrors)
      }

      // Also store errors in flash messages for the @validationError tag
      this.storeErrorsInFlash()

      return this
    }

    /**
     * Store current errors in flash messages
     *
     * @private
     */
    storeErrorsInFlash(): void {
      if (this.ctx && 'session' in this.ctx) {
        ;(this.ctx as any).session.flash('validationErrorsBags', this.__form.errors)
      }
    }

    /**
     * Clear form validation errors
     */
    clearErrors(...fields: (keyof InferInput<T>)[]): this {
      if (fields.length === 0) {
        this.__form.errors = {}
      } else {
        fields.forEach((field) => {
          delete this.__form.errors[field]
        })
      }

      // Also update flash messages
      this.storeErrorsInFlash()

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
    async validate(meta: Meta): Promise<Infer<T>>
    async validate<K extends keyof InferInput<T>>(field: K): Promise<Infer<T>[K]>
    async validate<K extends keyof InferInput<T>>(
      field: K,
      value: InferInput<T>[K]
    ): Promise<Infer<T>[K]>
    async validate(field?: any, value?: any) {
      if (!this.__form.schema) {
        throw new Error('Validation schema not provided. Cannot validate form.')
      }

      let schematic = this.__form.schema
      let data = this.data()

      if (field && !isObject(field)) {
        if (field) {
          this.clearErrors(field)
          // Validate only the specified field
          schematic = vine.object({
            [field]: this.__form.schema.getProperties()[field],
          })
          data = { [field]: value ?? this.data()[field] }
        }
      }

      return vine
        .compile(schematic)
        .validate(data, isObject(field) ? { meta: field } : {})
        .then((validatedData) => {
          this.clearErrors()
          // return field ? validatedData[field] : validatedData
          if (field) {
            return isObject(field) ? validatedData : validatedData[field]
          }

          return validatedData
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

export type Form<T extends SchemaTypes> = ReturnType<typeof Form<T>>['prototype']
