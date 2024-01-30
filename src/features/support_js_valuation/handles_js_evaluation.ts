import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'

export interface HandlesJsEvaluation extends BaseComponent {}
export class HandlesJsEvaluation {
  protected js(expression: string) {
    store(this).push('js', expression)
  }
}
