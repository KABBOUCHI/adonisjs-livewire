import type { Component } from '../../component.js'
import type { ComponentSnapshot, ComponentEffects } from '../../types.js'

/**
 * Encapsulates component state during testing
 * Manages component, response, view, HTML, snapshot and effects
 */
export class ComponentState {
  declare component: Component
  declare snapshot: ComponentSnapshot
  declare effects: ComponentEffects
  declare html: string
  declare view: any

  constructor(
    component: Component,
    snapshot: ComponentSnapshot,
    effects: ComponentEffects = {},
    html: string = ''
  ) {
    this.component = component
    this.snapshot = snapshot
    this.effects = effects
    this.html = html
  }

  /**
   * Get component property value
   * Supports nested properties like 'form.name'
   */
  get(propertyName: string): any {
    // First try from snapshot data
    if (propertyName in this.snapshot.data) {
      return this.snapshot.data[propertyName]
    }

    // Handle nested properties by accessing the component directly
    if (propertyName.includes('.')) {
      const parts = propertyName.split('.')
      let target: any = this.component
      for (const part of parts) {
        if (target === undefined || target === null) {
          return undefined
        }
        target = target[part]
      }
      return target
    }

    // Fallback to component property
    return (this.component as any)[propertyName]
  }

  /**
   * Get component memo data
   */
  getMemo(key: string): any {
    return this.snapshot.memo[key]
  }

  /**
   * Get all component data
   */
  getData(): Record<string, any> {
    return this.snapshot.data
  }

  /**
   * Get component effects
   */
  getEffects(): ComponentEffects {
    return this.effects
  }

  /**
   * Get rendered HTML
   */
  getHtml(): string {
    return this.html
  }

  /**
   * Get component instance
   */
  getComponent(): Component {
    return this.component
  }

  /**
   * Get component snapshot
   */
  getSnapshot(): ComponentSnapshot {
    return this.snapshot
  }

  /**
   * Update component state from new snapshot
   */
  update(snapshot: ComponentSnapshot, effects: ComponentEffects = {}, html: string = ''): void {
    this.snapshot = snapshot
    this.effects = effects
    this.html = html
  }
}
