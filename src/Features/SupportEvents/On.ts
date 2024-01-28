import { store } from '../../store.js'
import { Decorator } from '../SupportDecorators/Decorator.js'

export default class On extends Decorator {
  constructor(
    public name: string,
    public event: string
  ) {
    super()
  }

  boot() {
    store(this.component).push('listeners', {
      name: this.name,
      event: this.event,
    })
  }
}
