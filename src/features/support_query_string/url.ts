import ComponentContext from '../../component_context.js'
import { Decorator } from '../support_decorators/decorator.js'

export default class Url extends Decorator {
  constructor(
    public name: string,
    public as: string | null = null
  ) {
    super()
  }

  mount() {
    let value = this.component.ctx.request.input(this.name)
    if (value) this.component[this.name] = value
  }

  dehydrate(context: ComponentContext) {
    if (!context.mounting) return

    let queryString = {
      as: this.as || null,
      use: 'replace',
      alwaysShow: false,
      except: null,
    }

    context.pushEffect('url', queryString, this.name)
  }
}
