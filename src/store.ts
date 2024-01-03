import { AsyncLocalStorage } from 'async_hooks'
import { Component } from "./Component";

export class DataStore {
    public lookup: WeakMap<Component, any> = new WeakMap();
    constructor(public id: string) { }

    public push(component: Component, key: string, value: any) {
        if (!this.lookup.has(component)) this.lookup.set(component, {});
        if (!this.lookup.get(component)[key]) this.lookup.get(component)[key] = [];

        this.lookup.get(component)[key].push(value);
    }

    public get(component: Component, key: string) {
        return this.lookup.get(component)?.[key] || []
    }

    public has(component: Component, key: string) {
        return this.lookup.has(component) && this.lookup.get(component)?.[key] || false
    }
}

export const dataStoreContext = new AsyncLocalStorage<DataStore>()

export const getStore = () => dataStoreContext.getStore()

export function store(component: Component) {
    const s = () => {
        let st = getStore()

        if (!st) {
            throw new Error("No store found")
        }

        return st
    }
    return {
        get lookup() {
            return s().lookup
        },
        id() {
            return s().id
        },
        push: (key: string, value: any) => {
            s().push(component, key, value)
        },
        get: (key: string) => {
            return s().get(component, key)
        },
        has: (key: string) => {
            return s().has(component, key)
        },
    }
}