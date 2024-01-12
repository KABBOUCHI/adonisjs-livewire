import ComponentHook, { IComponentHook } from "../../ComponentHook";

export class SupportDecorators extends ComponentHook implements IComponentHook {
    async boot(params) {
        for (const decorator of this.component.getDecorators()) {
            decorator.__boot(this.component)
            
            if (typeof decorator['boot'] !== 'function') continue;

            await decorator['boot'](params);
        }
    }

    async mount(params) {
        for (const decorator of this.component.getDecorators()) {
            if (typeof decorator['mount'] !== 'function') continue;

            await decorator['mount'](params);
        }
    }

    async update(_propertyName: string, fullPath: string, newValue: any): Promise<Function> {
        const decorators = this.component.getDecorators();

        const callbacks = decorators
            .map(async (decorator) => {
                if (typeof decorator['update'] === 'function') {
                    return await decorator['update'](fullPath, newValue);
                }
            });

        const resolvedCallbacks = await Promise.all(callbacks);

        return async (...params: any[]) => {
            for (const callback of resolvedCallbacks) {
                if (typeof callback === 'function') {
                    await callback(...params);
                }
            }
        };
    }

    async hydrate(params) {
        for (const decorator of this.component.getDecorators()) {
            if (typeof decorator['hydrate'] !== 'function') continue;

            await decorator['hydrate'](params);
        }
    }

    async dehydrate(params) {
        for (const decorator of this.component.getDecorators()) {
            if (typeof decorator['dehydrate'] !== 'function') continue;

            await decorator['dehydrate'](params);
        }
    }

    async destroy(params) {
        for (const decorator of this.component.getDecorators()) {
            if (typeof decorator['destroy'] !== 'function') continue;

            await decorator['destroy'](params);
        }
    }

    async exception(params) {
        for (const decorator of this.component.getDecorators()) {
            if (typeof decorator['destroy'] !== 'function') continue;

            await decorator['destroy'](params);
        }
    }

    async render(...params: any[]) {
        const callbacks : any[]= []

        for (const decorator of this.component.getDecorators()) {
            if (typeof decorator['render'] !== 'function') continue;

            callbacks.push(await decorator['render'](...params));
        }

        return async function (...params: any[]) {
            for (let callback of callbacks) {
                if (typeof callback !== 'function') continue;
                await callback(...params)
            }
        };
    }
}