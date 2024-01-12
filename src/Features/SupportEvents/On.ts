import { store } from "../../store";
import { Decorator } from "../SupportDecorators/Decorator";

export default class On extends Decorator {
    constructor(public name: string, public event: string) {
        super();
    }

    boot() {
        store(this.component).push('listeners', {
            name: this.name,
            event: this.event,
        });
    }
}