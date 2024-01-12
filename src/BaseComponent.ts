import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { TypedSchema, ParsedTypedSchema, CustomMessages } from '@ioc:Adonis/Core/Validator';

export class BaseComponent {
    protected __ctx: HttpContextContract | null = null;
    protected __id;
    protected __name;
    protected __view_path;
    protected __assets: string[] = [];
    protected __scripts: string[] = [];

    get ctx() {
        if (!this.__ctx) throw new Error("Cannot access http context. Please enable ASL.");

        return this.__ctx;
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

    public async render(): Promise<string> {
        return this.view.render(this.__view_path);
    }

    get view() {
        return new Proxy(this.ctx.view, {
            get: (target, prop) => {
                if (prop === 'render') {
                    return async (templatePath: string, state?: any) => {
                        const rendered = await target.render(`livewire/${templatePath}`, {
                            ...this,
                            ... await this.data(),
                            ...state || {},
                        });

                        return rendered;
                    }
                }

                if (prop === 'renderRaw') {
                    return async (contents: string, state?: any) => {
                        const rendered = await target.renderRaw(contents, {
                            ...this,
                            ... await this.data(),
                            ...state || {},
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
}