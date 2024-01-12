import ComponentHook, { IComponentHook } from "../../ComponentHook";
import { store } from "../../store";

export class SupportJsEvaluation extends ComponentHook implements IComponentHook {
    async dehydrate(context) {
        if (!store(this.component).has('js')) return;

        context.addEffect('xjs', store(this.component).get('js'));
    }
}