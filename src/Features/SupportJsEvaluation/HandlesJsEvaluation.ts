import { BaseComponent } from "../../BaseComponent";
import { store } from "../../store";

export class HandlesJsEvaluation extends BaseComponent {
    protected js(expression: string) {
        store(this).push('js', expression);
    }
}