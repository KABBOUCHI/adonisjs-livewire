import { Decorator } from '../SupportDecorators/Decorator.js'
import { CannotUpdateLockedPropertyException } from './CannotUpdateLockedPropertyException.js'

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
