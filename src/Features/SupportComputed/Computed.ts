import { Decorator } from '../SupportDecorators/Decorator.js'

export default class Computed extends Decorator {
  constructor(
    public name: string,
    public method: string
  ) {
    super()
  }

  async render() {
    if (typeof this.component[this.method] !== 'function') {
      return
    }

    let value = await this.component[this.method]()

    this.component[this.name] = value
  }
}
