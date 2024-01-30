import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'

export interface HandlesRedirects extends BaseComponent {}
export class HandlesRedirects {
  redirect(url: string, navigate: boolean = false) {
    store(this).push('redirect', url)

    if (navigate) store(this).push('redirectUsingNavigate', true)
  }
}
