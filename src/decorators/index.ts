import { Component } from "../Component";

export function title(title: string) {
    return function (constructor: typeof Component) {
        constructor.prototype.pushDecorator("title", {
            title
        });
    }
}

export function layout(layout: string = "layouts/main", section: string = 'body') {
    return function (constructor: typeof Component) {
        constructor.prototype.pushDecorator("layout", {
            layout,
            section
        });
    }
}

export function computed(name?: string) {
    return function (target: Component, propertyKey: string, _descriptor: PropertyDescriptor) {
        target.pushDecorator("computed", {
            name: name || propertyKey,
            function: propertyKey
        });
    }
}

export function on(name?: string) {
    return function (target: Component, propertyKey: string) {
        // @ts-ignore
        target.___store = target.___store || {};
        // @ts-ignore
        target.___store["listeners"] = target.___store["listeners"] || [];
        // @ts-ignore
        target.___store["listeners"].push({
            name: name || propertyKey,
            function: propertyKey
        })
    }
}

export function modelable() {
    return function (target: Component, propertyKey: string) {
        // target is not fully initialized yet..
        // so we have to store this in a temporary store

        // @ts-ignore
        target.___store = target.___store || {};
        // @ts-ignore
        target.___store["bindings"] = target.___store["bindings"] || [];
        // @ts-ignore
        target.___store["bindings"].push({
            outer: "wire:model",
            inner: propertyKey
        })

    }
}

export function locked() {
    return function (target: Component, propertyKey: string) {
        // @ts-ignore
        target.___store = target.___store || {};
        // @ts-ignore
        target.___store["locked"] = target.___store["locked"] || [];
        // @ts-ignore
        target.___store["locked"].push(propertyKey)
    }
}
