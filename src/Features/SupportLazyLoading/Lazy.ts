
import { Decorator } from "../SupportDecorators/Decorator";

export default class Lazy extends Decorator {
    constructor(public isolate: boolean = true) {
        super();
    }
}