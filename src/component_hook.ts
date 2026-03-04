import type { ApplicationService } from '@adonisjs/core/types'
import ComponentContext from './component_context.js'
import { store } from './store.js'
import { Component } from './component.js'
import debug from './debug.js'

/**
 * Base class for all Livewire features (hooks)
 * Features can hook into various lifecycle events of components
 */
export default abstract class ComponentHook {
  /**
   * The component instance this hook is attached to
   */
  declare component: Component

  /**
   * The application service instance
   */
  declare app: ApplicationService
  /**
   * Set the component instance
   */
  setComponent(component: Component): void {
    this.component = component
  }

  /**
   * Set the application service instance
   */
  setApp(app: ApplicationService): void {
    this.app = app
  }

  /**
   * Call the boot lifecycle hook if it exists
   */
  async callBoot(...params: any[]) {
    if (typeof this.boot === 'function') {
      debug(
        'callBoot: %s on component=%s',
        this.constructor.name,
        this.component?.getName?.() ?? 'unknown'
      )
      await this.boot(...params)
    }
  }

  /**
   * Call the mount lifecycle hook if it exists
   */
  async callMount(...params: any[]) {
    if (typeof this.mount === 'function') {
      debug(
        'callMount: %s on component=%s',
        this.constructor.name,
        this.component?.getName?.() ?? 'unknown'
      )
      await this.mount(...params)
    }
  }

  /**
   * Call the hydrate lifecycle hook if it exists
   */
  async callHydrate(...params: any[]) {
    if (typeof this.hydrate === 'function') {
      debug(
        'callHydrate: %s on component=%s',
        this.constructor.name,
        this.component?.getName?.() ?? 'unknown'
      )
      await this.hydrate(...params)
    }
  }

  /**
   * Call the update lifecycle hook if it exists
   */
  async callUpdate(propertyName: string, fullPath: string, newValue: any) {
    debug('callUpdate: %s property=%s path=%s', this.constructor.name, propertyName, fullPath)
    const callbacks: Function[] = []
    if (typeof this.update === 'function') {
      const callback = await this.update(propertyName, fullPath, newValue)
      if (callback) {
        callbacks.push(callback)
      }
    }
    return async (...params: any[]) => {
      for (const callback of callbacks) {
        if (typeof callback === 'function') {
          await callback(...params)
        }
      }
    }
  }

  /**
   * Call the call lifecycle hook if it exists (before method execution)
   * @param method - The method name being called
   * @param params - The parameters for the method
   * @param returnEarly - Function to return early from the method call
   * @param metadata - Optional metadata about the call
   * @param componentContext - Optional component context
   */
  async callCall(
    method: string,
    params: any[],
    returnEarly: (value?: any) => void,
    metadata?: any,
    componentContext?: ComponentContext
  ): Promise<any> {
    debug(
      'callCall: %s method=%s on component=%s',
      this.constructor.name,
      method,
      this.component?.getName?.() ?? 'unknown'
    )
    const callbacks: any[] = []
    if (typeof this.call === 'function') {
      const result = await this.call(method, params, returnEarly, metadata, componentContext)
      if (result) {
        callbacks.push(result)
      }
    }
    return (...args: any[]) => {
      callbacks.forEach((callback) => {
        if (typeof callback === 'function') {
          callback(...args)
        }
      })
    }
  }

  /**
   * Call the render lifecycle hook if it exists
   */
  async callRender(...params: any[]) {
    debug(
      'callRender: %s on component=%s',
      this.constructor.name,
      this.component?.getName?.() ?? 'unknown'
    )
    const callbacks: Function[] = []
    if (typeof this.render === 'function') {
      const callback = await this.render(...params)
      if (callback) {
        callbacks.push(callback)
      }
    }
    return async (...args: any[]) => {
      for (const callback of callbacks) {
        if (typeof callback === 'function') {
          await callback(...args)
        }
      }
    }
  }

  /**
   * Call the renderIsland lifecycle hook if it exists
   * PHP parity: callRenderIsland
   */
  async callRenderIsland(...params: any[]) {
    debug(
      'callRenderIsland: %s on component=%s',
      this.constructor.name,
      this.component?.getName?.() ?? 'unknown'
    )
    const callbacks: Function[] = []
    if (typeof this.renderIsland === 'function') {
      const callback = await this.renderIsland(...params)
      if (callback) {
        callbacks.push(callback)
      }
    }
    return async (...args: any[]) => {
      for (const callback of callbacks) {
        if (typeof callback === 'function') {
          await callback(...args)
        }
      }
    }
  }

  /**
   * Call the dehydrate lifecycle hook if it exists
   */
  async callDehydrate(...params: any[]) {
    if (typeof this.dehydrate === 'function') {
      debug(
        'callDehydrate: %s on component=%s',
        this.constructor.name,
        this.component?.getName?.() ?? 'unknown'
      )
      await this.dehydrate(...params)
    }
  }

  /**
   * Call the destroy lifecycle hook if it exists
   */
  async callDestroy(...params: any[]) {
    if (typeof this.destroy === 'function') {
      debug(
        'callDestroy: %s on component=%s',
        this.constructor.name,
        this.component?.getName?.() ?? 'unknown'
      )
      await this.destroy(...params)
    }
  }

  /**
   * Call the exception lifecycle hook if it exists
   */
  async callException(...params: any[]) {
    if (typeof this.exception === 'function') {
      debug(
        'callException: %s on component=%s error=%O',
        this.constructor.name,
        this.component?.getName?.() ?? 'unknown',
        params[0]
      )
      await this.exception(...params)
    }
  }

  /**
   * Get all properties from the component
   * PHP parity: returns $this->component->all()
   */
  getProperties(): Record<string, any> {
    if (!this.component) return {}

    // Get all public properties from the component (excluding internal ones)
    const data: Record<string, any> = {}
    const ownKeys = Object.keys(this.component)

    for (const key of ownKeys) {
      // Skip internal properties (starting with _ or #)
      if (key.startsWith('_') || key.startsWith('#')) continue
      // Skip functions
      if (typeof (this.component as any)[key] === 'function') continue
      data[key] = (this.component as any)[key]
    }

    return data
  }

  /**
   * Get a specific property from the component
   * Supports dot notation for nested properties (PHP parity: data_get)
   * @param name - Property name, supports dot notation (e.g., 'user.name')
   */
  getProperty(name: string): any {
    const properties = this.getProperties()
    if (!properties) return undefined

    // Support dot notation like PHP's data_get
    const parts = name.split('.')
    let value: any = properties

    for (const part of parts) {
      if (value === null || value === undefined) return undefined
      value = value[part]
    }

    return value
  }

  /**
   * Set a value in the component's store
   */
  storeSet(key: string, value: any): void {
    store(this.component).set(key, value)
  }

  /**
   * Push a value to an array in the component's store
   */
  storePush(key: string, value: any, iKey?: string): void {
    store(this.component).push(key, value, iKey)
  }

  /**
   * Get a value from the component's store
   */
  storeGet(key: string, defaultValue: any = null): any {
    return store(this.component).get(key) ?? defaultValue
  }

  /**
   * Check if a key exists in the component's store
   */
  storeHas(key: string): boolean {
    return store(this.component).has(key)
  }

  /**
   * Optional boot lifecycle hook
   * Called once when the component is first initialized
   * Override this method in subclasses to implement boot logic
   */
  boot?(...params: any[]): Promise<void>

  /**
   * Optional mount lifecycle hook
   * Called when the component is mounted with initial parameters
   * Override this method in subclasses to implement mount logic
   */
  mount?(...params: any[]): Promise<void>

  /**
   * Optional hydrate lifecycle hook
   * Called when the component is hydrated from a snapshot
   * Override this method in subclasses to implement hydrate logic
   */
  hydrate?(...params: any[]): Promise<void>

  /**
   * Optional dehydrate lifecycle hook
   * Called when the component state is being serialized
   * Override this method in subclasses to implement dehydrate logic
   */
  dehydrate?(...params: any[]): Promise<void>

  /**
   * Optional destroy lifecycle hook
   * Called when the component is being destroyed
   * Override this method in subclasses to implement destroy logic
   */
  destroy?(...params: any[]): Promise<void>

  /**
   * Optional exception lifecycle hook
   * Called when an exception occurs in the component
   * Override this method in subclasses to implement exception handling
   */
  exception?(...params: any[]): Promise<void>

  /**
   * Optional call lifecycle hook
   * Called before a component method is executed
   * Override this method in subclasses to implement call logic
   * @param method - The method name being called
   * @param params - The parameters for the method
   * @param returnEarly - Function to return early from the method call, or boolean for compatibility
   * @param metadata - Optional metadata about the call
   * @param componentContext - Optional component context
   */
  call?(
    method: string,
    params: any[],
    returnEarly?: (value?: any) => void | boolean,
    metadata?: any,
    componentContext?: ComponentContext
  ): Promise<any>

  /**
   * Optional update lifecycle hook
   * Called when a component property is being updated
   * Override this method in subclasses to implement update logic
   * @param propertyName - The name of the property being updated
   * @param fullPath - The full path to the property (for nested properties)
   * @param newValue - The new value being set
   * @returns Optional callback function to execute after the update
   */
  update?(propertyName: string, fullPath: string, newValue: any): Promise<Function | void>

  /**
   * Optional render lifecycle hook
   * Called when the component is being rendered
   * Override this method in subclasses to implement render logic
   * @returns Optional callback function to execute after rendering
   */
  render?(...params: any[]): Promise<Function | void>

  /**
   * Optional renderIsland lifecycle hook
   * Called when rendering an island component
   * PHP parity: renderIsland
   * @returns Optional callback function to execute after rendering
   */
  renderIsland?(...params: any[]): Promise<Function | void>
}
