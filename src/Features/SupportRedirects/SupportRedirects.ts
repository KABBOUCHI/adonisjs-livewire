import ComponentHook, { IComponentHook } from "../../ComponentHook";
import { store } from "../../store";

export class SupportRedirects extends ComponentHook implements IComponentHook {
    async dehydrate(context) {
        let s = store(this.component);

        let to = s.get('redirect')[0];

        if (to) {
            context.addEffect('redirect', to);
        }

        if (s.has('redirectUsingNavigate')) {
            context.addEffect('redirectUsingNavigate', true);
        }
    }
}