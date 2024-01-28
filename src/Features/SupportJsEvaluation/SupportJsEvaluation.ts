import ComponentHook from '../../ComponentHook.js'
import { store } from '../../store.js'

export class SupportJsEvaluation extends ComponentHook {
  async dehydrate(context) {
    if (!store(this.component).has('js')) return

    context.addEffect('xjs', store(this.component).get('js'))
  }
}
