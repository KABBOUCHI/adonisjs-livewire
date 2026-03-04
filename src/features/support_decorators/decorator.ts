import { Component } from '../../component.js'
import ComponentHook from '../../component_hook.js'

export abstract class Decorator extends ComponentHook {
  declare component: Component

  __boot(component: Component): void {
    this.component = component
  }
}
