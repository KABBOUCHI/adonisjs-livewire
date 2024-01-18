declare module '@ioc:Adonis/Core/Route' {
    interface RouterContract {
        livewire: (pattern: string, component?: string | undefined, params?: object | Record<string, any> | undefined) => RouteContract;
    }
}

declare module '@ioc:Adonis/Addons/Livewire' {
    export const Component: typeof import("../src/Component").Component;
    export const Livewire: import("../src/Livewire").default;
    export const { title, layout, computed, locked, modelable, on, url, lazy, bind }: typeof import("../src/decorators");
    export const {Mixin, hasMixin, decorate }: typeof import("ts-mixer");
}

declare module 'adonisjs-livewire' {
    export const Component: typeof import("../src/Component").Component;
    export const {Mixin, hasMixin, decorate }: typeof import("ts-mixer");
    // export const { title, layout, computed, locked, modelable, on }: typeof import("../src/decorators");
}

declare const dd: (...args: any[]) => void