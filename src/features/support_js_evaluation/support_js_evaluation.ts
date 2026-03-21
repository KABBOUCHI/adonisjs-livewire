import ComponentHook from '../../component_hook.js'
import { store } from '../../store.js'
import debug from '../../debug.js'

export class SupportJsEvaluation extends ComponentHook {
  async dehydrate(context: { addEffect: (k: string, v: unknown) => void }) {
    if (!store(this.component).has('js')) return

    const jsData = store(this.component).get('js')
    debug('SupportJsEvaluation.dehydrate: jsData=%O', jsData)
    context.addEffect('xjs', jsData)
  }
}
