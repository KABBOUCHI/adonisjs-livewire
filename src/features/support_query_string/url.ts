import { cuid } from '@adonisjs/core/helpers'
import ComponentContext from '../../component_context.js'
import { Decorator } from '../support_decorators/decorator.js'

export default class Url extends Decorator {
  constructor(
    public name: string,
    public as: string | null = null,
    public history = false,
    public keep = false,
    public except = null,
    public nullable: boolean | null = null
  ) {
    super()
  }

  mount() {
    let nonExistentValue = 'livewire:' + cuid()
    let value: any

    let initialValue = this.component.ctx.request.input(this.name, nonExistentValue)
    if (initialValue === nonExistentValue) {
      return
    }

    if (initialValue === null) {
      value = this.nullable ? null : ''
    } else {
      value = initialValue
    }

    this.component[this.name] = value
  }

  dehydrate(context: ComponentContext) {
    if (!context.mounting) return

    let queryString = {
      as: this.as || null,
      use: this.history ? 'push' : 'replace',
      alwaysShow: this.keep,
      except: this.except,
    }

    context.pushEffect('url', queryString, this.name)
  }

  async update(propertyName: string, newValue: any) {
    if (propertyName !== this.name) {
      return
    }

    if (newValue === null && !this.nullable && this.component) {
      this.component[this.name] = ''
    }
  }
}
