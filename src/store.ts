import { AsyncLocalStorage } from 'async_hooks'
import { Component } from "./Component";

export class DataStore {
    public lookup: WeakMap<Component, any> = new Map();

    public push(component: Component, key: string, value: any) {
        if (!this.lookup.has(component)) this.lookup.set(component, {});
        if (!this.lookup.get(component)[key]) this.lookup.get(component)[key] = [];

        this.lookup.get(component)[key].push(value);
    }
}

export const dataStoreContext = new AsyncLocalStorage<DataStore>()

export const getStore = () => dataStoreContext.getStore()

export function store(component: Component) {
    return {
        get lookup() {
            return getStore()?.lookup
        },
        push: (key: string, value: any) => {
            getStore()?.push(component, key, value)
        },
        get: (key: string) => {
            return getStore()?.lookup.get(component)[key]
        },
        has: (key: string) => {
            return getStore()?.lookup.has(component) && getStore()?.lookup.get(component)[key] !== undefined
        },
    }
}