import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'
import { Constructor } from '../../types.js'
import debug from '../../debug.js'

/** PHP parity: js($expression, ...$params) stores { expression, params } */
export function HandlesJsEvaluation<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    js(expression: string, ...params: unknown[]) {
      debug('HandlesJsEvaluation.js: expression=%s params=%O', expression, params)
      store(this).push('js', { expression, params })
    }
  }
}
