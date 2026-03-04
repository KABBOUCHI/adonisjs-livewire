import { Decorator } from '../support_decorators/decorator.js'

export default class Title extends Decorator {
  constructor(public title: string) {
    super()
  }

  async render(...params: any[]) {
    const [view] = params

    view.share({
      title: this.title,
    })
  }
}
