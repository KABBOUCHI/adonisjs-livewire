import { AsyncLocalStorage } from 'node:async_hooks'
import { Component } from './Component.js'
import { BaseComponent } from './BaseComponent.js'
import ComponentContext from './ComponentContext.js'
import ComponentHook from './ComponentHook.js'

export class DataStore {
  lookup: WeakMap<Component | any, any> = new WeakMap()
  constructor(public id: string) {}

  push(component: Component | BaseComponent, key: string, value: any, iKey?: string) {
    if (!this.lookup.has(component)) this.lookup.set(component, {})
    if (!this.lookup.get(component)[key] && !iKey) this.lookup.get(component)[key] = []
    if (!this.lookup.get(component)[key] && iKey) this.lookup.get(component)[key] = {}

    if (iKey) {
      this.lookup.get(component)[key][iKey] = value
    } else {
      this.lookup.get(component)[key].push(value)
    }
  }

  set(component: Component | BaseComponent, key: string, value: any) {
    if (!this.lookup.has(component)) this.lookup.set(component, {})
    this.lookup.get(component)[key] = value
  }

  get(component: Component | BaseComponent, key: string) {
    return this.lookup.get(component)?.[key] || []
  }

  has(component: Component | BaseComponent, key: string) {
    return (this.lookup.has(component) && this.lookup.get(component)?.[key]) || false
  }
}

export const livewireContext = new AsyncLocalStorage<{
  dataStore: DataStore
  context: ComponentContext
  features: ComponentHook[]
}>()

export const getLivewireContext = () => livewireContext.getStore()

export function store(component: Component | BaseComponent) {
  const s = () => {
    let st = getLivewireContext()

    if (!st) {
      throw new Error('No store found')
    }

    return st.dataStore
  }
  return {
    get lookup() {
      return s().lookup
    },
    id() {
      return s().id
    },
    push: (key: string, value: any, iKey?: string) => {
      s().push(component, key, value, iKey)
    },
    get: (key: string) => {
      return s().get(component, key)
    },
    has: (key: string) => {
      return s().has(component, key)
    },
    set: (key: string, value: any) => {
      s().set(component, key, value)
    },
  }
}
