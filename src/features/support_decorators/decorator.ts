import { Component } from '../../component.js'

export abstract class Decorator {
  declare component: Component

  __boot(component: Component) {
    this.component = component
  }
}
