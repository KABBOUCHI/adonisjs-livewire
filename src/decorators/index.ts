import { Component } from '../component.js'
import Computed from '../features/support_computed/computed.js'
import On from '../features/support_events/on.js'
import Lazy from '../features/support_lazy_loading/lazy.js'
import Locked from '../features/support_locked_properties/locked.js'
import Modelable from '../features/support_models/modelable.js'
import Layout from '../features/support_page_components/layout.js'
import Title from '../features/support_page_components/title.js'
import Url from '../features/support_query_string/url.js'

export function title(value: string) {
  return function (constructor: typeof Component) {
    constructor.prototype.addDecorator(new Title(value))
  }
}

export function layout(name: string = 'main') {
  return function (constructor: typeof Component) {
    constructor.prototype.addDecorator(new Layout(name))
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

export function url() {
  return function (target: Component, propertyKey: string) {
    target.addDecorator(new Url(propertyKey))
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
