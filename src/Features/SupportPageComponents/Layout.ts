import { store } from "../../store";
import { Decorator } from "../SupportDecorators/Decorator";

export default class Layout extends Decorator {
    constructor(public path: string, public section: string) {
        super();
    }

    boot() {
        store(this.component).push('layout', {
            path: this.path,
            section: this.section,
        });
    }
}