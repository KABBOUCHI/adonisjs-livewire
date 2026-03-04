import { Decorator } from '../support_decorators/decorator.js'

export default class Defer extends Decorator {
  constructor(
    public isolate: boolean = true,
    public bundle?: boolean
  ) {
    super()
  }
}
