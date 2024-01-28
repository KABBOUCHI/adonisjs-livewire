import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'

export class HandlesRedirects extends BaseComponent {
  redirect(url: string, navigate: boolean = false) {
    store(this).push('redirect', url)

    if (navigate) store(this).push('redirectUsingNavigate', true)
  }
}
