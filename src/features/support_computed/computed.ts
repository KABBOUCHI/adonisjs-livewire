import { Decorator } from '../support_decorators/decorator.js'

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

    this.component.view.share({
      [this.name]: value,
    })
  }
}
