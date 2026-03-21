import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'
import { Constructor } from '../../types.js'

export function HandlesEvents<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    getListeners(): { [key: string]: string } {
      return {}
    }

    dispatch(name: string, params: any, to?: string, self?: boolean) {
      store(this).push('dispatched', {
        name,
        params,
        to,
        self,
      })
    }
  }
}
