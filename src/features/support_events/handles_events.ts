import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'

export interface HandlesEvents extends BaseComponent {}
export class HandlesEvents {
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
