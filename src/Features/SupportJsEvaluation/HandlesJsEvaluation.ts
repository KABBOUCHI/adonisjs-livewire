import { BaseComponent } from '../../BaseComponent.js'
import { store } from '../../store.js'

export class HandlesJsEvaluation extends BaseComponent {
  protected js(expression: string) {
    store(this).push('js', expression)
  }
}
