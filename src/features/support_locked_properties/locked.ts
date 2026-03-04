import { Decorator } from '../support_decorators/decorator.js'
import { CannotUpdateLockedPropertyException } from './cannot_update_locked_property_exception.js'

export default class Locked extends Decorator {
  constructor(public name: string) {
    super()
  }

  async update(propertyName: string, __fullPath: string = propertyName, _newValue?: unknown) {
    if (propertyName === this.name) {
      throw new CannotUpdateLockedPropertyException(this.name)
    }
  }
}
