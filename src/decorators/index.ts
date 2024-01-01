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