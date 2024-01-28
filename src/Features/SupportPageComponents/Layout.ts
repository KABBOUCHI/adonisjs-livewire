import { store } from '../../store.js'
import { Decorator } from '../SupportDecorators/Decorator.js'

export default class Layout extends Decorator {
  constructor(
    public name: string,
  ) {
    super()
  }

  boot() {
    store(this.component).push('layout', {
      name: this.name,
    })
  }
}
