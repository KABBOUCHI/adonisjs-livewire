import { Decorator } from '../support_decorators/decorator.js'

export default class Renderless extends Decorator {
  call() {
    this.component.skipRender()
  }
}
