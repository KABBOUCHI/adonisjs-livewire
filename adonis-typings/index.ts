declare module '@ioc:Adonis/Core/Route' {
    interface RouterContract {
        livewire: (pattern: string, component?: string | undefined, params?: any[] | Record<string, any> | undefined) => RouteContract;
    }
}

declare module '@ioc:Adonis/Addons/Livewire' {
    export const Component: typeof import("../src/Component").Component;
    export const Livewire: import("../src/Livewire").default;
    export const { title, layout, computed, modelable, on }: typeof import("../src/decorators");
}

declare module 'adonisjs-livewire' {
    export const Component: typeof import("../src/Component").Component;
    export const { title, layout, computed, modelable, on }: typeof import("../src/decorators");
}

declare const dd: (...args: any[]) => void