
import { store } from "../../store";
import { Decorator } from "../SupportDecorators/Decorator";

export default class Modelable extends Decorator {
    constructor(public outer: string, public inner: string) {
        super();
    }

    mount(){
        store(this.component).push("bindings", {
            outer: this.outer,
            inner: this.inner
        })
    }
}