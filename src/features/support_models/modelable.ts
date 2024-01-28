import { store } from '../../store.js'
import { Decorator } from '../support_decorators/decorator.js'

export default class Modelable extends Decorator {
  constructor(
    public outer: string,
    public inner: string
  ) {
    super()
  }

  mount() {
    store(this.component).push('bindings', {
      outer: this.outer,
      inner: this.inner,
    })
  }
}
