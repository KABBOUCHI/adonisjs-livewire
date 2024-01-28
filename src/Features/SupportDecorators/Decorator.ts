import { Component } from '../../Component.js'

export abstract class Decorator {
  declare component: Component

  __boot(component: Component) {
    this.component = component
  }
}
