import { Decorator } from './Decorator.js'
import { BaseComponent } from '../../BaseComponent.js'

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
