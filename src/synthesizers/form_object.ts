import { Synth } from './synth.js'
import { getFormClass } from '../features/support_form_objects/constants.js'
import { Form } from '../form.js'

/**
 * FormObjectSynth - Synthesizer for Form objects
 * PHP parity: FormObjectSynth
 *
 * Handles serialization/deserialization of Form objects for Livewire's
 * request/response cycle.
 */
export class FormObjectSynth extends Synth {
  static key = 'form'

  /**
   * Match Form instances
   */
  static match(target: any): boolean {
    return target instanceof Form
  }

  /**
   * Dehydrate a Form object for transmission to client
   * PHP parity: FormObjectSynth->dehydrate
   *
   * Returns form data and metadata (class name, errors)
   */
  async dehydrate(
    target: Form,
    dehydrateChild: (name: string, value: any) => Promise<any>
  ): Promise<[Record<string, any>, Record<string, any>]> {
    // Call form's dehydrate hook if defined
    if (typeof target.dehydrate === 'function') {
      await target.dehydrate()
    }

    // Collect form data
    const data: Record<string, any> = {}
    const childMeta: Record<string, any> = {}

    for (const key of target.getPropertyNames()) {
      const value = target.getPropertyValue(key)

      // Dehydrate child values (handles nested forms, models, etc.)
      // dehydrateChild returns:
      // - For primitives: the value directly
      // - For complex types: [data, meta] tuple where meta has 's' key
      const result = await dehydrateChild(key, value)

      // Store result as-is - the livewire.ts dehydrate handles the format
      // Primitives come back as-is, complex types come back as [data, {s: 'key', ...}]
      data[key] = result

      // Track child metadata for complex types (arrays with synth marker)
      if (
        Array.isArray(result) &&
        result.length === 2 &&
        typeof result[1] === 'object' &&
        result[1] !== null &&
        's' in result[1]
      ) {
        childMeta[key] = result[1]
      }
    }

    // Build metadata
    const meta: Record<string, any> = {
      class: target.constructor.name,
    }

    // Include error bag if not empty
    const errorBag = target.getErrorBag()
    if (Object.keys(errorBag).length > 0) {
      meta.errors = errorBag
    }

    // Use "childMeta" to avoid collision with Livewire memo's "children" key.
    // The Livewire JS asset does a string replace on "children":{...} in the snapshot;
    // if we used "children" here, that replace would corrupt our form metadata JSON.
    if (Object.keys(childMeta).length > 0) {
      meta.childMeta = childMeta
    }

    return [data, meta]
  }

  /**
   * Hydrate a Form object from client data
   * PHP parity: FormObjectSynth->hydrate
   *
   * Reconstructs Form instance from data and metadata
   */
  async hydrate(
    data: Record<string, any>,
    meta: Record<string, any>,
    hydrateChild: (name: string, value: any) => Promise<any>
  ): Promise<Form> {
    const className = meta.class

    if (!className) {
      throw new Error('Form class name not found in metadata')
    }

    // Get form class constructor from registry
    const FormClass = getFormClass(className)

    if (!FormClass) {
      throw new Error(
        `Form class '${className}' not found in registry. ` +
          `Make sure to register it using Form.register() or @formClass decorator.`
      )
    }

    // Create new form instance
    const form = new FormClass() as Form

    // Hydrate child values
    // hydrateChild expects (name, value) and handles synthetic tuples internally
    for (const [key, value] of Object.entries(data)) {
      const hydratedValue = await hydrateChild(key, value)

      // Always set the value - even for 'declare' properties that don't exist yet
      // Properties with 'declare' keyword don't show up in hasProperty() until assigned
      // But they were serialized because they existed when the component was mounted
      ;(form as any)[key] = hydratedValue
    }

    // Note: Error bag is restored on component, not form (Form proxies to component)

    // Call form's hydrate hook if defined
    if (typeof form.hydrate === 'function') {
      await form.hydrate()
    }

    return form
  }

  /**
   * Get a property value from the form
   */
  get(target: Form, key: string): any {
    if (target.hasProperty(key)) {
      return target.getPropertyValue(key)
    }
    return undefined
  }

  /**
   * Set a property value on the form
   */
  set(target: Form, key: string, value: any): void {
    if (target.hasProperty(key)) {
      target.setPropertyValue(key, value)
    }
  }
}
