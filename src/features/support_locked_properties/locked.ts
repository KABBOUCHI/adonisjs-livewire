import { Decorator } from '../support_decorators/decorator.js'
import { CannotUpdateLockedPropertyException } from './cannot_update_locked_property_exception.js'

export default class Locked extends Decorator {
  constructor(public name: string) {
    super()
  }

  update(property: string) {
    if (this.name !== property) {
      return
    }
    throw new CannotUpdateLockedPropertyException(this.name)
  }
}
