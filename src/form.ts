import vine, { VineObject } from '@vinejs/vine'
import { InferInput } from '@vinejs/vine/types'
import { SchemaTypes } from '@vinejs/vine/types'
import { compareValues } from '@adonisjs/lucid/utils'
import { BaseComponent } from './base_component.js'

export function Form<T extends SchemaTypes>(schema: T) {
  interface FormHandler extends BaseComponent {}
  /**
   * FormComponent is a base class for handling forms in AdonisJS Livewire.
   * It provides methods for managing form state, validation, and error handling.
   */
  class FormHandler {
    declare __id: string
    declare __name: string
    declare __view_path: string

    form: InferInput<T> = {} as InferInput<T>
    errors: Partial<
      Record<
        keyof InferInput<T>,
        Array<{
          message: string
          rule?: string
        }>
      >
    > = {}

    __form = {
      defaultFormValues: {} as Partial<InferInput<T>>,
      schema: schema as unknown as VineObject<any, any, any, any>,
    }

    /**
     * Get the current form values that have been modified
     * compared to the default values.
     * This is useful for tracking changes in the form.
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
     * Check if the form has any errors
     */
    get hasErrors(): boolean {
      return Object.keys(this.errors).length > 0
    }

    /**
     * Check if the form is dirty (has unsaved changes)
     * If a key is provided, check if that specific field is dirty.
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
     * Get a copy of the form data
     */
    data(): InferInput<T> {
      return { ...this.__form.defaultFormValues, ...this.form }
    }

    /**
     * Compact the form data, removing undefined values
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
     * Set default values for the form
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
      } else {
        this.__form.defaultFormValues = {
          ...this.__form.defaultFormValues,
          ...(fieldOrFields as Partial<InferInput<T>>),
        }
      }

      this.form = this.compact(this.__form.defaultFormValues).data()

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
     * Set form errors
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
     * Clear form errors
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
     * Reset form and clear errors
     */
    resetAndClearErrors(...fields: (keyof InferInput<T>)[]): this {
      this.reset(...fields)
      this.clearErrors(...fields)
      return this
    }

    async validate(field?: keyof InferInput<T>): Promise<InferInput<T>> {
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
        data = { [field]: this.data()[field] }
      }

      return vine
        .compile(schematic)
        .validate(data)
        .then((validatedData) => {
          this.clearErrors()
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
