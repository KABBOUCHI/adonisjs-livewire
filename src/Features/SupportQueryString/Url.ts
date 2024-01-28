import ComponentContext from '../../ComponentContext.js'
import { Decorator } from '../SupportDecorators/Decorator.js'

export default class Url extends Decorator {
  constructor(public name: string) {
    super()
  }

  mount() {
    let value = this.component.ctx.request.input(this.name)

    this.component[this.name] = value
  }

  dehydrate(context: ComponentContext) {
    if (!context.mounting) return

    let queryString = {
      as: null,
      use: 'replace',
      alwaysShow: false,
      except: null,
    }

    context.pushEffect('url', queryString, this.name)
  }
}
