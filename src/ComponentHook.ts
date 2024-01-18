import { Component } from "./Component";
import ComponentContext from "./ComponentContext";
import { store } from "./store";
import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

export interface IComponentHook {
    boot?(params: any[]): Promise<void>;
    mount?(params: object): Promise<void>;
    hydrate?(params: any[]): Promise<void>;
    dehydrate?(context: ComponentContext): Promise<void>;
    destroy?(params: any[]): Promise<void>;
    exception?(params: any[]): Promise<void>;
    call?(method: string, params: any[], returnEarly: boolean): Promise<void>;
}

export default abstract class ComponentHook {
    protected component: Component;
    protected app: ApplicationContract;

    setComponent(component: Component): void {
        this.component = component;
    }

    setApp(app: ApplicationContract): void {
        this.app = app;
    }

    async callBoot(...params: any[]) {
        if (typeof this['boot'] === 'function') {
            await this['boot'](...params);
        }
    }

    async callMount(params: object) {
        if (typeof this['mount'] === 'function') {
            await this['mount'](params);
        }
    }

    async callHydrate(...params: any[]) {
        if (typeof this['hydrate'] === 'function') {
            await this['hydrate'](...params);
        }
    }

    async callUpdate(propertyName: string, fullPath: string, newValue: any) {
        const callbacks: Function[] = [];
        if (typeof this['update'] === 'function') {
            callbacks.push(await this['update'](propertyName, fullPath, newValue));
        }

        return async (...params: any[]) => {
            for (const callback of callbacks) {

                if (typeof callback === 'function') {
                    await callback(...params);
                }
            }
        };
    }

    callCall(method: string, params: any[], returnEarly: boolean = false): any {
        const callbacks: Function[] = [];

        if (typeof this['call'] === 'function') {
            callbacks.push(this['call'](method, params, returnEarly));
        }

        return (...params: any[]) => {
            callbacks.forEach(callback => {
                if (typeof callback === 'function') {
                    callback(...params);
                }
            });
        };
    }

    async callRender(...params: any[]) {
        const callbacks: Function[] = [];

        if (typeof this['render'] === 'function') {
            callbacks.push(await this['render'](...params));
        }

        return async (...params: any[]) => {
            for (const callback of callbacks) {
                if (typeof callback === 'function') {
                    await callback(...params);
                }
            }
        };
    }

    async callDehydrate(context: ComponentContext) {
        if (typeof this['dehydrate'] === 'function') {
            await this['dehydrate'](context);
        }
    }

    async callDestroy(...params: any[]) {
        if (typeof this['destroy'] === 'function') {
            await this['destroy'](...params);
        }
    }

    async callException(...params: any[]) {
        if (typeof this['exception'] === 'function') {
            await this['exception'](...params);
        }
    }

    getProperties(): any {
        // return this.component?.all();
    }

    getProperty(name: string): any {
        return this.getProperties()?.[name];
    }

    storeSet(key: string, value: any): void {
        store(this.component).push(key, value);
    }

    storePush(key: string, value: any, iKey?: string): void {
        store(this.component).push(key, value, iKey);
    }

    storeGet(key: string, defaultValue: any = null): any {
        return store(this.component).get(key) ?? defaultValue;
    }

    storeHas(key: string): boolean {
        return store(this.component).has(key);
    }
}
