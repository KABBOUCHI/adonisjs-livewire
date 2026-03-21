import ComponentHook from '../../component_hook.js'
import { store } from '../../store.js'

export class SupportRedirects extends ComponentHook {
  async dehydrate(context: { addEffect: (k: string, v: any) => void }) {
    const s = store(this.component)
    if (!s.has('redirect')) return

    const to = s.get('redirect')
    if (!to) return

    context.addEffect('redirect', to)
    if (s.has('redirectUsingNavigate')) {
      context.addEffect('redirectUsingNavigate', true)
    }
  }
}
