import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'

export class HandlesEvents extends BaseComponent {
  getListeners(): { [key: string]: string } {
    return {}
  }

  dispatch(name: string, params: any, to?: string) {
    store(this).push('dispatched', {
      name,
      params,
      to,
    })
  }
}
