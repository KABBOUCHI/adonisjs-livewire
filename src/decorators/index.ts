import { Component } from '../Component.js'
import Computed from '../Features/SupportComputed/Computed.js'
import On from '../Features/SupportEvents/On.js'
import Lazy from '../Features/SupportLazyLoading/Lazy.js'
import Locked from '../Features/SupportLockedProperties/Locked.js'
import Modelable from '../Features/SupportModels/Modelable.js'
import Layout from '../Features/SupportPageComponents/Layout.js'
import Title from '../Features/SupportPageComponents/Title.js'
import Url from '../Features/SupportQueryString/Url.js'

export function title(title: string) {
  return function (constructor: typeof Component) {
    constructor.prototype.addDecorator(new Title(title))
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
