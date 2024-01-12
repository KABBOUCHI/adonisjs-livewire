import { Component } from "../Component";
import Computed from "../Features/SupportComputed/Computed";
import On from "../Features/SupportEvents/On";
import Locked from "../Features/SupportLockedProperties/Locked";
import Modelable from "../Features/SupportModels/Modelable";
import Layout from "../Features/SupportPageComponents/Layout";
import Title from "../Features/SupportPageComponents/Title";
import Url from "../Features/SupportQueryString/Url";

export function title(title: string) {
    return function (constructor: typeof Component) {
        constructor.prototype.addDecorator(new Title(title))
    }
}

export function layout(path: string = "layouts/main", section: string = 'body') {
    return function (constructor: typeof Component) {
        constructor.prototype.addDecorator(new Layout(path, section))
    }
}

export function computed(name?: string) {
    return function (target: Component, propertyKey: string, _descriptor: PropertyDescriptor) {
        target.addDecorator(new Computed(name || propertyKey, propertyKey));
    }
}

export function on(name?: string) {
    return function (target: Component, propertyKey: string) {
        target.addDecorator(new On(name || propertyKey, propertyKey));
    }
}

export function modelable() {
    return function (target: Component, propertyKey: string) {
       target.addDecorator(new Modelable("wire:model", propertyKey));
    }
}

export function locked() {
    return function (target: Component, propertyKey: string) {
       target.addDecorator(new Locked(propertyKey));
    }
}


export function url() {
    return function (target: Component, propertyKey: string) {
       target.addDecorator(new Url(propertyKey));
    }
}
