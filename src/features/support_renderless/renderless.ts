import { Decorator } from '../support_decorators/decorator.js'

export default class Renderless extends Decorator {
  async call() {
    this.component.skipRender()
  }
}
