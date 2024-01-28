import { Component } from './component.js'
import ComponentContext from './component_context.js'
import { store } from './store.js'
import type { ApplicationService } from '@adonisjs/core/types'

export default abstract class ComponentHook {
  declare component: Component
  declare app: ApplicationService

  setComponent(component: Component): void {
    this.component = component
  }

  setApp(app: ApplicationService): void {
    this.app = app
  }

  async callBoot(...params: any[]) {
    if (typeof this['boot'] === 'function') {
      //@ts-ignore
      await this['boot'](...params)
    }
  }

  async callMount(params: object) {
    if (typeof this['mount'] === 'function') {
      await this['mount'](params)
    }
  }

  async callHydrate(...params: any[]) {
    if (typeof this['hydrate'] === 'function') {
      //@ts-ignore
      await this['hydrate'](...params)
    }
  }

  async callUpdate(propertyName: string, fullPath: string, newValue: any) {
    const callbacks: Function[] = []
    if (typeof this['update'] === 'function') {
      callbacks.push(await this['update'](propertyName, fullPath, newValue))
    }

    return async (...params: any[]) => {
      for (const callback of callbacks) {
        if (typeof callback === 'function') {
          await callback(...params)
        }
      }
    }
  }

  callCall(method: string, params: any[], returnEarly: boolean = false): any {
    const callbacks: any[] = []

    if (typeof this['call'] === 'function') {
      callbacks.push(this['call'](method, params, returnEarly))
    }

    return (...args: any[]) => {
      callbacks.forEach((callback) => {
        if (typeof callback === 'function') {
          callback(...args)
        }
      })
    }
  }

  async callRender(...params: any[]) {
    const callbacks: Function[] = []

    if (typeof this['render'] === 'function') {
      callbacks.push(await this['render'](...params))
    }

    return async (...args: any[]) => {
      for (const callback of callbacks) {
        if (typeof callback === 'function') {
          await callback(...args)
        }
      }
    }
  }

  async callDehydrate(context: ComponentContext) {
    if (typeof this['dehydrate'] === 'function') {
      await this['dehydrate'](context)
    }
  }

  async callDestroy(...params: any[]) {
    if (typeof this['destroy'] === 'function') {
      //@ts-ignore
      await this['destroy'](...params)
    }
  }

  async callException(...params: any[]) {
    if (typeof this['exception'] === 'function') {
      //@ts-ignore
      await this['exception'](...params)
    }
  }

  getProperties(): any {
    // return this.component?.all();
  }

  getProperty(name: string): any {
    return this.getProperties()?.[name]
  }

  storeSet(key: string, value: any): void {
    store(this.component).push(key, value)
  }

  storePush(key: string, value: any, iKey?: string): void {
    store(this.component).push(key, value, iKey)
  }

  storeGet(key: string, defaultValue: any = null): any {
    return store(this.component).get(key) ?? defaultValue
  }

  storeHas(key: string): boolean {
    return store(this.component).has(key)
  }

  protected async boot(params: any[]) {}

  protected async mount(params: object) {}

  protected async hydrate(params: any[]) {}

  protected async dehydrate(context: ComponentContext) {}

  protected async destroy(params: any[]) {}

  protected async exception(params: any[]) {}

  protected async call(method: string, params: any[], returnEarly: boolean) {}
}
