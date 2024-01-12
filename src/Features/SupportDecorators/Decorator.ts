import { Component } from "../../Component";

export abstract class Decorator {   
    protected component: Component;

    __boot(component: Component) {
        this.component = component;
    }
}