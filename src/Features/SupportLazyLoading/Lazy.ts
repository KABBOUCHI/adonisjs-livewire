import { Decorator } from '../SupportDecorators/Decorator.js'

export default class Lazy extends Decorator {
  constructor(public isolate: boolean = true) {
    super()
  }
}
