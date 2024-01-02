import { Component } from "../Component";
import { store } from "../store";

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
        store(target).push("listeners", {
            name: name || propertyKey,
            function: propertyKey
        })
    }
}