
declare module '@ioc:Adonis/Core/Route' {
    interface RouterContract {
        livewire: (pattern: string, component: string, params?: any[]) => RouterContract;
    }
}

export { Component } from "../providers";
export * from '../src/decorators';