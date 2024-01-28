import { store } from '../../store.js'
import { Decorator } from '../support_decorators/decorator.js'

export default class Layout extends Decorator {
  constructor(public name: string = 'components.layouts.main') {
    super()
  }

  boot() {
    store(this.component).push('layout', {
      name: this.name,
    })
  }
}
