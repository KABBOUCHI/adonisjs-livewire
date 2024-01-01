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
    return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
        target.pushDecorator("computed", {
            name: name || propertyKey,
            function: propertyKey
        });
    }
}
