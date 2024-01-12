
import { Decorator } from "../SupportDecorators/Decorator";
import { CannotUpdateLockedPropertyException } from "./CannotUpdateLockedPropertyException";

export default class Locked extends Decorator {
    constructor(public name: string) {
        super();
    }

    public update(property: string) {
        if (this.name !== property) {
            return;
        }
        throw new CannotUpdateLockedPropertyException(this.name);
    }
}