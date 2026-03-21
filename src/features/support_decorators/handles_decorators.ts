import { Decorator } from './decorator.js'
import { BaseComponent } from '../../base_component.js'
import { Constructor } from '../../types.js'

/**
 * Symbol to store decorators on both prototype (for class decorators)
 * and instance (for runtime-added decorators)
 */
const DECORATORS_KEY = Symbol.for('livewire:decorators')
const INSTANCE_DECORATORS_KEY = Symbol.for('livewire:instance-decorators')

export function HandlesDecorators<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    /**
     * Get all decorators from both prototype chain and instance
     */
    getDecorators(): Decorator[] {
      // Get prototype decorators (set by @computed, @on, etc. decorators)
      // Only get decorators defined on this specific class, not inherited
      const prototypeDecorators: Decorator[] = Object.hasOwn(
        this.constructor.prototype,
        DECORATORS_KEY
      )
        ? (this.constructor.prototype as any)[DECORATORS_KEY]
        : []

      // Get instance decorators (added at runtime via addDecorator)
      const instanceDecorators: Decorator[] = (this as any)[INSTANCE_DECORATORS_KEY] || []

      return [...prototypeDecorators, ...instanceDecorators]
    }

    /**
     * Add a decorator - can be called on prototype (during class decoration)
     * or on instance (at runtime)
     */
    addDecorator(decorator: Decorator): void {
      // If called on prototype (during class decoration), store on prototype
      if (this === this.constructor.prototype) {
        const proto = this.constructor.prototype as any
        // Create own property if not exists (don't inherit from parent)
        if (!Object.hasOwn(proto, DECORATORS_KEY)) {
          proto[DECORATORS_KEY] = []
        }
        proto[DECORATORS_KEY].push(decorator)
      } else {
        // Called on instance, store on instance
        if (!(this as any)[INSTANCE_DECORATORS_KEY]) {
          ;(this as any)[INSTANCE_DECORATORS_KEY] = []
        }
        ;(this as any)[INSTANCE_DECORATORS_KEY].push(decorator)
      }
    }
  }
}
