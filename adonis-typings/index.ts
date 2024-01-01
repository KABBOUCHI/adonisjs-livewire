declare module '@ioc:Adonis/Core/Route' {
    interface RouterContract {
        livewire: (pattern: string, component?: string, params?: any[]) => RouterContract;
    }
}

declare module '@ioc:Adonis/Addons/Livewire' {
    export const Component: typeof import("../src/Component").Component;
    export const Livewire: import("../src/Livewire").default;
    export const { title, layout, computed }: typeof import("../src/decorators");
}

declare module 'adonisjs-livewire' {
    export const Component: typeof import("../src/Component").Component;
    export const { title, layout, computed }: typeof import("../src/decorators");
}