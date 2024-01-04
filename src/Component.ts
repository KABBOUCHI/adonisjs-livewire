import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { TypedSchema, ParsedTypedSchema, CustomMessages } from '@ioc:Adonis/Core/Validator';
import { store } from './store';

interface ComponentOptions {
    ctx: HttpContextContract | null;
    id: string;
    name: string;
}

export class Component {
    protected __id;
    protected __name;
    protected __view_path;
    protected __assets: string[] = [];
    protected __scripts: string[] = [];
    public __decorators: {
        type: string,
        [key: string]: any
    }[]
    protected __ctx: HttpContextContract | null = null;
    constructor({ ctx, id, name }: ComponentOptions) {
        this.__ctx = ctx;
        this.__id = id;
        this.__name = name;
    }

    get ctx() {
        if (!this.__ctx) throw new Error("Cannot access http context. Please enable ASL.");

        return this.__ctx;
    }
    
    public redirect(url: string, navigate: boolean = false)
    {
        store(this).push('redirect', url);

        if (navigate) store(this).push('redirectUsingNavigate', true);
    }

    public setId(id: string) {
        this.__id = id;
    }

    public getId() {
        return this.__id;
    }

    public setName(name: string) {
        this.__name = name;
    }

    public setViewPath(view: string) {
        this.__view_path = view;
    }

    public getName() {
        return this.__name;
    }

    public getDecorators() {
        return this.__decorators || [];
    }

    public pushDecorator(type: string, decorator: any) {
        if (!this.__decorators) this.__decorators = [];

        this.__decorators.push({ type, ...decorator });
    }

    public async render(): Promise<string> {
        return this.view.render(this.__view_path);
    }

    get view() {
        return new Proxy(this.ctx.view, {
            get: (target, prop) => {
                if (prop === 'render') {
                    return async (templatePath: string, state?: any) => {
                        const rendered = await target.render(`livewire/${templatePath}`, {
                            ... await this.data(),
                            ...this,
                            ...state,
                        });

                        return rendered;
                    }
                }

                if (prop === 'renderRaw') {
                    return async (contents: string, state?: any) => {
                        const rendered = await target.renderRaw(contents, {
                            ... await this.data(),
                            ...this,
                            ...state,
                        });

                        return rendered;
                    }
                }

                return target[prop];
            }
        })
    }

    public async data(): Promise<any> {
        return {};
    }

    protected js(expression: string) {
        store(this).push('js', expression);
    }

    protected schema(): ParsedTypedSchema<TypedSchema> {
        throw new Error("Schema not implemented");
    }

    protected messages(): CustomMessages {
        return {}
    }

    protected async validate(bail: boolean = true) {
        await this.ctx.request.validate({
            schema: this.schema(),
            data: this,
            messages: this.messages(),
            bail,
        })
    }

    public getListeners(): { [key: string]: string } {
        return {};
    }

    protected dispatch(name: string, params: any, to?: string) {
        store(this).push('dispatched', {
            name,
            params,
            to,
        })
    }

    public async __dispatch(event: string, params: any) {
        let ev = store(this).get("listeners").find(l => l.name === event);

        if (ev) {
            await this[ev.function](params);
        }

        let ev2 = this.getListeners()[event];

        if (!ev2) return;

        await this[ev2](params);
    }
}