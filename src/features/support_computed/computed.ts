import { Decorator } from '../support_decorators/decorator.js'
import { CannotCallComputedDirectlyException } from './cannot_call_computed_directly_exception.js'

/** PHP parity: request memoization, unset busts cache, cannot call method directly */
export default class Computed extends Decorator {
  protected requestCachedValue: unknown = undefined

  constructor(
    public name: string,
    public method: string
  ) {
    super()
  }

  /** Memoized get (PHP __get). Use in render or when reading computed. */
  async getValue(): Promise<unknown> {
    if (typeof this.component[this.method] !== 'function') return
    if (this.requestCachedValue !== undefined) return this.requestCachedValue

    this.requestCachedValue = await this.component[this.method]()

    return this.requestCachedValue
  }

  /** Bust request cache (PHP unset). */
  clearCache(): void {
    this.requestCachedValue = undefined
  }

  async render() {
    if (typeof this.component[this.method] !== 'function') return
    const value = await this.getValue()
    this.component.view.share({
      [this.name]: value,
    })
  }

  /** PHP parity: throw when computed method is invoked as action. */
  async call(method: string, _params: unknown[], _returnEarly: () => void) {
    if (method === this.method) {
      throw new CannotCallComputedDirectlyException(
        (this.component as any).__name ?? this.component.constructor.name,
        this.method
      )
    }
  }
}
