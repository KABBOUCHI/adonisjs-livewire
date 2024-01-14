import ComponentHook, { IComponentHook } from "../../ComponentHook";
import { getLivewireContext, store } from "../../store";
import Lazy from "./Lazy";

export class SupportLazyLoading extends ComponentHook implements IComponentHook {
    async mount(params) {
        // TODO: remove support for params as an array
        const args = params[0] ?? {};
        let hasLazyParam = args.hasOwnProperty('lazy');
        let lazyProperty = args.lazy ?? false;
        let isolate = false;

        const lazyDecorator = this.component.getDecorators().find((decorator) => decorator instanceof Lazy) as Lazy | undefined;

        if (hasLazyParam && !lazyProperty) return;

        if (!hasLazyParam && !lazyDecorator) return;

        if (lazyDecorator) {
            isolate = lazyDecorator.isolate;
        }

        this.component.skipMount()

        store(this.component).set('isLazyLoadMounting', true);
        store(this.component).set('isLazyIsolated', isolate);

        this.component.skipRender(
            await this.generatePlaceholderHtml(params)
        );
    }

    async hydrate(memo) {
        if (memo['lazyLoaded']) return;
        if (memo['lazyLoaded'] === true) return;

        this.component.skipHydrate();

        store(this.component).set('isLazyLoadHydrating', true);
    }

    async dehydrate(context) {
        if (store(this.component).get('isLazyLoadMounting') === true) {
            context.addMemo('lazyLoaded', false);
            context.addMemo('lazyIsolated', store(this.component).get('isLazyIsolated'));
        } else if (store(this.component).get('isLazyLoadHydrating') === true) {
            context.addMemo('lazyLoaded', true);
        }
    }

    async generatePlaceholderHtml(_params) {
        const { Livewire } = await this.app.container.resolveBinding('Adonis/Addons/Livewire')
        let { context } = getLivewireContext()!
        let placeholder = await this.getPlaceholderHtml();

        let encoded = JSON.stringify(
            await Livewire.snapshot(this.component, context)
        );

        return Livewire.insertAttributesIntoHtmlRoot(placeholder, {
            'x-intersect': `$wire.__lazyLoad('${encoded}')`
        })
    }

    async getPlaceholderHtml() {
        if (!this.component['placeholder']) {
            return "<div></div>";
        }

        return await this.component.view.renderRaw(await this.component['placeholder']());
    }

    async call(method, _params, _returnEarly) {
        if (method !== '__lazyLoad') return;

        // const { Livewire } = await this.app.container.resolveBinding('Adonis/Addons/Livewire')
        // let data = JSON.parse(params[0]);

        // call lifecycle mount hook
    }
}