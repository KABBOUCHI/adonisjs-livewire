import ComponentHook from '../../component_hook.js'
import { Form } from '../../form.js'
import { beforeFirstDot, afterFirstDot, ucfirst } from './utils.js'
import { getFormMetadata } from './form_decorator.js'
import debug from '../../debug.js'

/**
 * Symbol to track if a Form has been booted
 */
const FORM_BOOTED = Symbol.for('livewire:form:booted')

export class SupportFormObjects extends ComponentHook {
  /**
   * Called during component initialization (mount)
   */
  async mount(params: any): Promise<void> {
    debug('SupportFormObjects.mount: calling initializeFormObjects')
    await this.initializeFormObjects()
  }

  /**
   * Called during hydration (subsequent requests)
   */
  async hydrate(): Promise<void> {
    debug('SupportFormObjects.hydrate: calling initializeFormObjects')
    await this.initializeFormObjects()
  }

  /**
   * Initialize all Form object properties on the component
   */
  private async initializeFormObjects(): Promise<void> {
    const component = this.component as any
    const formProps = this.getFormPropertyNames(component)

    debug(
      'SupportFormObjects.initializeFormObjects: found %d form properties: %O',
      formProps.length,
      formProps
    )

    for (const propertyName of formProps) {
      const form = component[propertyName]

      debug(
        'SupportFormObjects: checking property "%s", instanceof Form: %s',
        propertyName,
        form instanceof Form
      )

      if (form instanceof Form) {
        const wasBooted = (form as any)[FORM_BOOTED] === true

        debug('SupportFormObjects: initializing form "%s" (wasBooted: %s)', propertyName, wasBooted)

        // ALWAYS set component reference and create Proxy
        const proxied: any = form.setComponent(component, propertyName)
        component[propertyName] = proxied

        debug(
          'SupportFormObjects: proxied form "%s", typeof store: %s',
          propertyName,
          typeof proxied.store
        )

        // Call boot hook only ONCE
        if (!wasBooted && typeof form.boot === 'function') {
          debug('SupportFormObjects: calling boot() on form "%s"', propertyName)
          await form.boot()
          ;(form as any)[FORM_BOOTED] = true
        }

        // Call mount hook
        if (typeof form.mount === 'function') {
          debug('SupportFormObjects: calling mount() on form "%s"', propertyName)
          await form.mount()
        }
      } else {
        debug(
          'SupportFormObjects: property "%s" is NOT a Form instance (type: %s)',
          propertyName,
          typeof form
        )
      }
    }
  }

  /**
   * Get all property names that are Form instances
   */
  private getFormPropertyNames(component: any): string[] {
    const formProps: Set<string> = new Set()

    // First: Check metadata from @form() decorator
    const formMetadata = getFormMetadata(component)
    debug(
      'SupportFormObjects.getFormPropertyNames: found %d form metadata entries',
      formMetadata.length
    )
    for (const meta of formMetadata) {
      formProps.add(meta.propertyName)
      debug('SupportFormObjects.getFormPropertyNames: added "%s" from metadata', meta.propertyName)
    }

    // Second: Check Object.keys for runtime-defined forms
    const ownKeys = Object.keys(component)
    debug('SupportFormObjects.getFormPropertyNames: checking %d own keys', ownKeys.length)

    for (const key of ownKeys) {
      if (key.startsWith('_') || key.startsWith('#')) continue

      try {
        const value = component[key]
        if (value instanceof Form) {
          formProps.add(key)
          debug(
            'SupportFormObjects.getFormPropertyNames: added "%s" from own keys (instanceof Form)',
            key
          )
        }
      } catch {
        // Skip properties that throw when accessed
      }
    }

    return [...formProps]
  }

  /**
   * Called when a property is being updated
   */
  async update(
    propertyName: string,
    fullPath: string,
    value: any
  ): Promise<(() => Promise<void>) | void> {
    const component = this.component as any

    const formPropertyName = beforeFirstDot(fullPath)
    const nestedPath = afterFirstDot(fullPath)

    if (!nestedPath) {
      return
    }

    const form = component[formPropertyName]

    if (!(form instanceof Form)) {
      return
    }

    const formProperty = beforeFirstDot(nestedPath)

    if (typeof form.updating === 'function') {
      const result = await form.updating(formProperty, value)
      if (result === false) {
        return
      }
    }

    const specificUpdatingHook = `updating${ucfirst(formProperty)}`
    if (typeof (form as any)[specificUpdatingHook] === 'function') {
      const result = await (form as any)[specificUpdatingHook](value)
      if (result === false) {
        return
      }
    }

    return async () => {
      if (typeof form.updated === 'function') {
        await form.updated(formProperty, value)
      }

      const specificUpdatedHook = `updated${ucfirst(formProperty)}`
      if (typeof (form as any)[specificUpdatedHook] === 'function') {
        await (form as any)[specificUpdatedHook](value)
      }
    }
  }

  /**
   * Called before component is dehydrated
   */
  async dehydrate(): Promise<void> {
    const component = this.component as any

    for (const propertyName of this.getFormPropertyNames(component)) {
      const form = component[propertyName]

      if (form instanceof Form && typeof form.dehydrate === 'function') {
        await form.dehydrate()
      }
    }
  }
}
