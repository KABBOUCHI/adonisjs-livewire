import 'reflect-metadata'
import { Component } from '../component.js'
import Computed from '../features/support_computed/computed.js'
import On from '../features/support_events/on.js'
import Lazy from '../features/support_lazy_loading/lazy.js'
import Locked from '../features/support_locked_properties/locked.js'
import Modelable from '../features/support_models/modelable.js'
import Layout from '../features/support_page_components/layout.js'
import Title from '../features/support_page_components/title.js'
import Url from '../features/support_query_string/url.js'
import Renderless from '../features/support_renderless/renderless.js'
import Validator from '../features/support_validation/validator.js'
import type { HasValidate } from '../features/support_validation/types.js'
import type { ConstructableSchema, Infer } from '@vinejs/vine/types'

// Re-export form decorator from support_form_objects
export { form } from '../features/support_form_objects/form_decorator.js'

export function title(value: string) {
  return function (constructor: typeof Component) {
    constructor.prototype.addDecorator(new Title(value))
  }
}

export function layout(name: string = 'main', props: Record<string, any> = {}) {
  return function (constructor: typeof Component) {
    constructor.prototype.addDecorator(new Layout(name, props))
  }
}

export function lazy(isolate: boolean = true) {
  return function (constructor: typeof Component) {
    constructor.prototype.addDecorator(new Lazy(isolate))
  }
}

export function computed(name?: string) {
  return function (target: Component, propertyKey: string, _descriptor: PropertyDescriptor) {
    target.addDecorator(new Computed(name || propertyKey, propertyKey))
  }
}

export function on(name?: string) {
  return function (target: Component, propertyKey: string) {
    target.addDecorator(new On(name || propertyKey, propertyKey))
  }
}

export function modelable() {
  return function (target: Component, propertyKey: string) {
    target.addDecorator(new Modelable('wire:model', propertyKey))
  }
}

export function locked() {
  return function (target: Component, propertyKey: string) {
    target.addDecorator(new Locked(propertyKey))
  }
}

export function url(as: string | null = null) {
  return function (target: Component, propertyKey: string) {
    target.addDecorator(new Url(propertyKey, as))
  }
}

export function bind() {
  return function (target: Component, propertyKey: string, descriptor: PropertyDescriptor) {
    const methodParams = Reflect.getMetadata('design:paramtypes', target, propertyKey)

    if (!methodParams) {
      return
    }

    const functionString = descriptor.value.toString()
    const match = functionString.match(/\(([^)]*)\)/)
    if (!match || !match[1]) {
      return
    }

    const args = match[1].split(',').map((param: any) => param.trim())

    const parentBindings: any = target['bindings']

    if (!target.hasOwnProperty('bindings')) {
      Object.defineProperty(target, 'bindings', {
        value: parentBindings ? Object.assign({}, parentBindings) : {},
      })
    }

    target['bindings'][propertyKey] = target['bindings'][propertyKey] || []

    methodParams.forEach((param: any, index: number) => {
      target['bindings'][propertyKey].push({
        name: args[index],
        type: param,
      })
    })
  }
}

export function renderless() {
  return function (target: Component, propertyKey: string) {
    target.addDecorator(new Renderless())
  }
}

/**
 * Validator decorator for properties
 *
 * Forces the property to be typed as HasValidate<T> where T is inferred from the schema.
 * The schema factory function is called when building the validation schema.
 *
 * @param schemaFactory - Function that returns a Vine.js schema for this property
 * @param options - Optional configuration (onUpdate: whether to validate on property update)
 *
 * @example
 * ```typescript
 * class MyComponent extends Component {
 *   @validator(() => vine.string().minLength(3))
 *   declare name: HasValidate<string>
 *
 *   @validator(() => vine.string().email(), { onUpdate: false })
 *   declare email: HasValidate<string>
 * }
 * ```
 */
export function validator<TSchema extends ConstructableSchema<any, any, any>>(
  schemaFactory: () => TSchema,
  options?: { onUpdate?: boolean }
): <TKey extends string>(
  target: { [K in TKey]: HasValidate<Infer<TSchema>> },
  propertyKey: TKey
) => void {
  return function (target: Component, propertyKey: string) {
    target.addDecorator(new Validator(propertyKey, schemaFactory, options?.onUpdate ?? true))
  } as any
}
