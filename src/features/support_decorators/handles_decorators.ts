import { Decorator } from './decorator.js'
import { BaseComponent } from '../../base_component.js'

export interface HandlesDecorators extends BaseComponent {}
export class HandlesDecorators {
  declare __decorators: Decorator[]

  getDecorators() {
    return this.__decorators ?? []
  }

  addDecorator(decorator: Decorator) {
    if (!this.__decorators) this.__decorators = []

    this.__decorators.push(decorator)
  }
}
