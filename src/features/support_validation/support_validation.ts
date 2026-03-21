import ComponentHook from '../../component_hook.js'
import ComponentContext from '../../component_context.js'

/**
 * Feature to support validation in components
 *
 * This feature handles validation errors by:
 * 1. Catching ValidationException in the exception hook
 * 2. Storing errors in the component's error bag
 * 3. Sharing errors with views during render
 * 4. Persisting/restoring errors in the component memo
 *
 * Errors are only persisted for component properties, not for custom
 * validators that don't correspond to component properties.
 */
export class SupportValidation extends ComponentHook {
  /**
   * Handle hydration - restore validation errors from memo
   */
  async hydrate(_data: any, memo: any, _context?: ComponentContext): Promise<void> {
    if (memo?.errors) {
      const component = this.component as any
      if (typeof component.setErrorBag === 'function') {
        component.setErrorBag(memo.errors)
      }
    }
  }

  /**
   * Handle render - share errors with views
   * Returns a callback to revert the sharing after render
   */
  async render(...params: any[]): Promise<Function | void> {
    const [view] = params
    const component = this.component as any
    if (!view || typeof view.share !== 'function') {
      return
    }
    const errorBag = typeof component.getErrorBag === 'function' ? component.getErrorBag() : {}
    const errors = {
      default: errorBag,
    }
    view.share({ errors })
  }

  /**
   * Handle dehydration - persist validation errors to memo
   * Only persists errors that correspond to component properties
   */
  async dehydrate(context: ComponentContext): Promise<void> {
    const component = this.component as any
    const errorBag = typeof component.getErrorBag === 'function' ? component.getErrorBag() : {}
    const filteredErrors: Record<string, string[]> = {}
    for (const [field, messages] of Object.entries(errorBag)) {
      if (this.hasComponentProperty(component, field)) {
        filteredErrors[field] = messages as string[]
      }
    }
    if (Object.keys(filteredErrors).length > 0) {
      context.addMemo('errors', filteredErrors)
    }
  }

  /**
   * Handle exception - catch ValidationException and set error bag
   */
  async exception(...params: any[]): Promise<void> {
    const [error, stopPropagation] = params
    const isValidationError =
      error?.name === 'ValidationException' ||
      error?.constructor?.name === 'ValidationException' ||
      error?.code === 'E_VALIDATION_FAILURE' ||
      (error?.messages && typeof error.messages === 'object') ||
      (error?.response?.body?.errors && typeof error.response.body.errors === 'object')

    if (!isValidationError) {
      return
    }

    const component = this.component as any
    let errorMessages: Record<string, string[]> = {}

    if (error.messages) {
      errorMessages = this.normalizeErrorMessages(error.messages)
    } else if (error.response?.body?.errors) {
      errorMessages = this.normalizeErrorMessages(error.response.body.errors)
    } else if (error.errors) {
      errorMessages = this.normalizeErrorMessages(error.errors)
    } else if (error.validator?.errors) {
      const validatorErrors = error.validator.errors
      if (typeof validatorErrors.toJSON === 'function') {
        errorMessages = this.normalizeErrorMessages(validatorErrors.toJSON())
      } else {
        errorMessages = this.normalizeErrorMessages(validatorErrors)
      }
    }

    if (typeof component.setErrorBag === 'function' && Object.keys(errorMessages).length > 0) {
      component.setErrorBag(errorMessages)
    }

    if (typeof stopPropagation === 'function') {
      stopPropagation()
    }
  }

  /**
   * Normalize error messages to consistent format
   */
  private normalizeErrorMessages(messages: any): Record<string, string[]> {
    const normalized: Record<string, string[]> = {}
    for (const [field, messageOrArray] of Object.entries(messages)) {
      if (Array.isArray(messageOrArray)) {
        normalized[field] = messageOrArray.map(String)
      } else if (messageOrArray) {
        normalized[field] = [String(messageOrArray)]
      }
    }
    return normalized
  }

  /**
   * Handle property update - validate property if it has @validator decorator with onUpdate: true
   */
  async update(
    propertyName: string,
    _fullPath: string,
    _newValue: any
  ): Promise<Function | undefined> {
    const component = this.component as any

    // Get all decorators
    const decorators = component.getDecorators?.() || []
    const validatorDecorator = decorators.find(
      (d: any) => d.constructor.name === 'Validator' && d.propertyName === propertyName
    )

    // If property has @validator decorator and onUpdate is true, validate it
    if (validatorDecorator && validatorDecorator.onUpdate) {
      // Validate only this property
      await this.#validateProperty(component, propertyName, validatorDecorator)
    }

    // Return undefined (no callback needed)
    return undefined
  }

  /**
   * Validate a single property using its validator decorator
   */
  async #validateProperty(
    component: any,
    propertyName: string,
    validatorDecorator: any
  ): Promise<void> {
    try {
      const { default: vine } = await import('@vinejs/vine')

      // Get the schema factory and create field schema
      const fieldSchema = validatorDecorator.schemaFactory()

      // Get the property value
      const propertyValue = component[propertyName]

      // Create a partial schema with just this field
      const partialSchema = vine.object({
        [propertyName]: fieldSchema,
      })

      // Validate only this field
      await vine.validate({ schema: partialSchema, data: { [propertyName]: propertyValue } })

      // Clear error for this field if validation passes
      if (typeof component.resetErrorBag === 'function') {
        component.resetErrorBag(propertyName)
      }
    } catch (error: any) {
      // Extract errors for this field only
      const errorMessages: Record<string, string[]> = {}

      if (error.issues && Array.isArray(error.issues)) {
        for (const issue of error.issues) {
          const field = issue.path?.join('.') || propertyName
          if (field === propertyName || field.startsWith(`${propertyName}.`)) {
            const message =
              typeof issue.message === 'string' ? issue.message : String(issue.message)
            if (!errorMessages[field]) {
              errorMessages[field] = []
            }
            errorMessages[field].push(message)
          }
        }
      }

      // Update error bag only for this property
      if (typeof component.setErrorBag === 'function') {
        const currentErrors = component.getErrorBag?.() || {}
        const updatedErrors = { ...currentErrors, ...errorMessages }
        component.setErrorBag(updatedErrors)
      }
    }
  }

  /**
   * Check if a component has a property with the given name
   */
  private hasComponentProperty(component: any, field: string): boolean {
    if (field in component) {
      return true
    }
    const ownKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(component))
    if (ownKeys.includes(field)) {
      return true
    }
    const parts = field.split('.')
    if (parts.length > 1) {
      const parentField = parts[0]
      return parentField in component
    }
    return false
  }
}
