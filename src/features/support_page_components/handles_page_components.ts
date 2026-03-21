import { BaseComponent } from '../../base_component.js'
import { Constructor } from '../../types.js'

export function HandlesPageComponents<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {}
}
