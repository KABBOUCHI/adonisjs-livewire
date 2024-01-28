import { Decorator } from '../support_decorators/decorator.js'

export default class Lazy extends Decorator {
  constructor(public isolate: boolean = true) {
    super()
  }
}
