import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { RedirectContract } from "@ioc:Adonis/Core/Response"

export class Component {
    protected __id;
    protected __name;
    protected __store = {
        js: [] as string[],
    };
    public __decorators: {
        type: string,
        [key: string]: any
    }[]
    protected __ctx: HttpContextContract | null = null;

    constructor(ctx: HttpContextContract | null = null) {
        this.__ctx = ctx;
    }

    get ctx() {
        return this.__ctx;
    }

    redirect(): RedirectContract;
    redirect(path: string, forwardQueryString?: boolean, statusCode?: number): void;
    public redirect(...args: any[]) {
        if (args.length === 0) return this.ctx!.response.redirect();

        return this.ctx!.response.redirect(args[0], args[1], args[2]);
    }

    public id() {
        return this.getId();
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
        return '<div></div>';
    }

    public async data(): Promise<any> {
        return {};
    }

    public js(expression: string) {
        this.__store.js.push(expression);
    }
}