import { Decorator } from './decorator.js'
import { BaseComponent } from '../../base_component.js'

export class HandlesDecorators extends BaseComponent {
  declare __decorators: Decorator[]

  getDecorators() {
    return this.__decorators ?? []
  }

  addDecorator(decorator: Decorator) {
    if (!this.__decorators) this.__decorators = []

    this.__decorators.push(decorator)
  }
}
