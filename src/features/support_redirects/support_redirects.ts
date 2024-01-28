import ComponentHook from '../../component_hook.js'
import { store } from '../../store.js'

export class SupportRedirects extends ComponentHook {
  async dehydrate(context) {
    let s = store(this.component)

    let to = s.get('redirect')[0]

    if (to) {
      context.addEffect('redirect', to)
    }

    if (s.has('redirectUsingNavigate')) {
      context.addEffect('redirectUsingNavigate', true)
    }
  }
}
