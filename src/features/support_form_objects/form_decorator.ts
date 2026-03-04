import 'reflect-metadata'
import { registerFormClass } from './constants.js'
import { Component } from '../../component.js'
import { Form } from '../../form.js'

/**
 * Metadata key for form decorator
 */
const FORM_METADATA_KEY = Symbol('livewire:form')

/**
 * Form metadata interface
 */
interface FormMetadata {
  formClass: new () => Form
  propertyName: string
}

/**
 * @form() decorator for component properties
 *
 * Marks a property as a Form object and registers the form class.
 * The form will be auto-instantiated and initialized when the component mounts.
 *
 * The Form class is automatically inferred from the property type using reflect-metadata.
 * No argument needed!
 *
 * @example
 * ```typescript
 * import { Component, form } from 'adonisjs-livewire'
 * import { PostForm } from './forms/post_form.js'
 *
 * class CreatePost extends Component {
 *   @form()
 *   declare postForm: PostForm
 *
 *   async save() {
 *     const data = await this.postForm.validate()
 *     // Save post...
 *   }
 * }
 * ```
 */
export function form() {
  return function (target: Component, propertyKey: string): void {
    // Use reflect-metadata to get the property type
    const designType = Reflect.getMetadata('design:type', target, propertyKey)

    if (!designType || designType === Object) {
      throw new Error(
        `@form() could not infer Form class for property '${propertyKey}'. ` +
          `Make sure 'emitDecoratorMetadata' is enabled in tsconfig.json and the property type is a Form class.`
      )
    }

    // Verify it's a Form subclass
    if (!(designType.prototype instanceof Form)) {
      throw new Error(
        `@form() property '${propertyKey}' must be typed as a Form class, got '${designType.name}'.`
      )
    }

    const resolvedFormClass = designType as new () => Form

    // Register the form class for hydration
    registerFormClass(resolvedFormClass.name, resolvedFormClass)

    // Store metadata about this form property
    const metadata: FormMetadata = {
      formClass: resolvedFormClass,
      propertyName: propertyKey,
    }

    // Get existing form metadata or create new array
    const existingForms: FormMetadata[] =
      Reflect.getMetadata(FORM_METADATA_KEY, target.constructor) || []

    // Add this form's metadata
    existingForms.push(metadata)

    // Store updated metadata
    Reflect.defineMetadata(FORM_METADATA_KEY, existingForms, target.constructor)

    // Define property that auto-instantiates the form
    // Use a WeakMap to store form instances per component instance
    // This avoids sharing formInstance across component instances (closure bug)
    const instanceMap = new WeakMap<object, Form>()
    const TheFormClass = resolvedFormClass

    Object.defineProperty(target, propertyKey, {
      get() {
        if (!instanceMap.has(this)) {
          instanceMap.set(this, new TheFormClass())
        }
        return instanceMap.get(this)
      },
      set(value: Form) {
        instanceMap.set(this, value)
      },
      enumerable: true,
      configurable: true,
    })
  }
}

/**
 * Get all form metadata for a component class
 */
export function getFormMetadata(target: any): FormMetadata[] {
  return Reflect.getMetadata(FORM_METADATA_KEY, target.constructor) || []
}

/**
 * Check if a property is a form property
 */
export function isFormProperty(target: any, propertyName: string): boolean {
  const metadata = getFormMetadata(target)
  return metadata.some((m) => m.propertyName === propertyName)
}
