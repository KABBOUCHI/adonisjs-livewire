import { ViewContract } from "@ioc:Adonis/Core/View";
import { ApplicationContract } from "@ioc:Adonis/Core/Application";
import { HttpContextConstructorContract } from "@ioc:Adonis/Core/HttpContext";
import Helpers from "@ioc:Adonis/Core/Helpers";
import { Component } from "./Component";
import ComponentContext from "./ComponentContext";
import { DataStore, dataStoreContext, store } from "./store";

export default class Livewire {
    app: ApplicationContract
    _view: ViewContract
    httpContext: HttpContextConstructorContract
    helpers: typeof Helpers
    components = new Map<string, typeof Component>();

    constructor(app: ApplicationContract, view: ViewContract, helpers: typeof Helpers, httpContext: HttpContextConstructorContract) {
        this.app = app;
        this._view = view;
        this.helpers = helpers;
        this.httpContext = httpContext;
    }

    get view() {
        let ctx = this.httpContext.get();
        let v = this._view;

        if (ctx) {
            v = ctx.view as any;
        }

        return v;
    }

    public async mount(name: string, params: any[] = [], options: { layout?: any, key?: string } = {}) {
        return await dataStoreContext.run(new DataStore(), async () => {

            let component = await this.new(name);
            let context = new ComponentContext(component, true);
            params = Array.isArray(params) ? params : [params];

            //@ts-ignore
            if (typeof component.mount === 'function') {
                //@ts-ignore
                await component.mount(...params);
            }

            if (options.layout && (!component.__decorators || !component.__decorators.some(d => d.type === 'layout'))) {
                component.pushDecorator("layout", {
                    layout: options.layout.name,
                    section: options.layout.section || 'body'
                });
            }

            const listeners=  Object.keys(component.getListeners());

            if (listeners.length > 0) {
                context.addEffect('listeners', listeners);
            }

            let html = await this.render(component, '<div></div>');
            let snapshot = this.snapshot(component, context);

            for (const param of params) {
                for (const key of Object.keys(param)) {
                    if(key.startsWith('@')) {
                        let value = param[key];
                        let fullEvent = this.helpers.string.dashCase(key.replace('@', ''));
                        let attributeKey = 'x-on:' + fullEvent;
                        let attributeValue = `$wire.$parent.${value}`;

                        html = insertAttributesIntoHtmlRoot(html, {
                            [attributeKey]: attributeValue,
                        });
                    }
                }
            }
            

            html = insertAttributesIntoHtmlRoot(html, {
                'wire:snapshot': snapshot,
                'wire:effects': Object.keys(context.effects).length > 0 ? context.effects as any : [], // TODO: send scripts
            });

            let decorators = component.getDecorators();
            let pageTitle = decorators.find(d => d.type === 'title')?.title;
            let layout = decorators.find(d => d.type === 'layout');

            if (layout) {
                html = await this.view.renderRaw(`@layout('${layout.layout}')\n@set('title', ${pageTitle ? `'${pageTitle}'` : null})\n@section('${layout.section}')\n${html}\n@endsection`)
            }

            return html
        })
    }

    public async fromSnapshot(snapshot: any) {
        let data = snapshot['data'];
        let name = snapshot['memo']['name'];
        let id = snapshot['memo']['id'];

        let component = await this.new(name, id);
        let context = new ComponentContext(component)

        await this.hydrateProperties(component, data, context);

        return [component, context] as const
    }

    public async new(name: string, id: string | null = null) {
        let LivewireComponent: typeof Component;

        if (this.components.has(name)) {
            LivewireComponent = this.components.get(name)!;
        } else {
            let path = name.split('.').map(s => this.helpers.string.pascalCase(s)).join('/');
            LivewireComponent = await import(`${process.cwd()}/app/Livewire/${path}`).then(module => module.default);
        }

        let component = new LivewireComponent(
            this.httpContext.get()
        );

        component.setId(id ?? this.helpers.string.generateRandom(20));
        component.setName(name);

        return component
    }

    protected async hydrateProperties(component: Component, data: { [key: string]: any }, _context: ComponentContext) {
        Object.keys(data).forEach(key => {
            const child = data[key];

            component[key] = child;
        });
    }

    public async update(snapshot: any, updates: any, calls: any) {
        return await dataStoreContext.run(new DataStore(), async () => {
            let data = snapshot['data'];
            // let memo = snapshot['memo'];

            let [component, context] = await this.fromSnapshot(snapshot);

            // this.pushOntoComponentStack(component);

            this.updateProperties(component, updates, data, context);

            await this.callMethods(component, calls, context);


            let html = await this.render(component);
            if (html) {
                context.addEffect('html', html);
            }

            let newSnapshot = this.snapshot(component, context);


            // this.popOffComponentStack();

            return [newSnapshot, context.effects] as const;
        })
    }

    public async callMethods(component: Component, calls: any, context: ComponentContext) {
        let returns: any[] = [];

        for (const call of calls) {
            try {
                let method = call['method'];
                let params = call['params'];

                let methods = getPublicMethods(component);
                methods = methods.filter(m => m !== 'render');
                methods.push('__dispatch');

                if (methods.includes(method) === false) {
                    throw new Error(`Method \`${method}\` does not exist on component ${component.getName()}`);
                }
                let result = await component[method](...params);

                returns.push(result);
            } catch (error) {
                console.error(error);
                if (error.name === 'ValidationException' && error.flashToSession) {
                    this.httpContext.get()?.session?.flash("errors", error.messages);
                } else {
                    throw error;
                }
            }
        }

        context.addEffect('returns', returns);
    }


    public snapshot(component: any, context: any = null): any {
        context = context ?? new ComponentContext(component);

        const s = store(component);

        // if (context.mounting) {
        //     if (component.listeners && Object.keys(component.listeners).length > 0) {
        //         context.addEffect('listeners', component.listeners);
        //     }
        // }

        if (s.has("dispatched")) {
            context.addEffect('dispatches', s.get("dispatched"));
        }

        if (s.has("js")) {
            context.addEffect('xjs', s.get("js"));
        }

        let data = JSON.parse(JSON.stringify(component, (key, value) => {
            if (key.startsWith('__')) return undefined;

            return value;
        }));

        let snapshot = {
            data: data,
            memo: {
                id: component.getId(),
                name: component.getName(),
                path: component.getName().toLowerCase(),
                method: "GET",
                children: [],
                scripts: [],
                assets: [],
                errors: [],
                locale: "en",
                ...context.memo,
            },
        };

        snapshot['checksum'] = '610bd7dc25db1d00eb50c18764fb10087823eaec952b98d8ebeb5829d6fb6081' // TODO

        return snapshot;
    }

    protected updateProperties(component: Component, updates: any, data: any, _context: ComponentContext) {
        Object.keys(data).forEach(key => {
            if (!(key in component)) return;

            const child = data[key];

            component[key] = child;
        });

        Object.keys(updates).forEach(key => {
            if (!(key in component)) return;

            const child = updates[key];

            component[key] = child;
        });
    }

    public async render(component: Component, defaultValue?: string) {
        let data = await component.data() || {};
        let decorators = component.getDecorators();
        let computedDecorators = decorators.filter(d => d.type === 'computed');

        for (const decorator of computedDecorators) {
            data[decorator.name] = await component[decorator.function]();
        }

        let content = await component.render() || defaultValue || "<div></div>";
        let ctx = this.httpContext.get();

        if (ctx) {
            await ctx.session.commit()
            ctx.session.initiated = false;
            ctx.session.responseFlashMessages.clear()
            await ctx.session.initiate(false)
        }

        let html = await this.view.renderRaw(content, {
            ...component,
            ...data
        });

        html = insertAttributesIntoHtmlRoot(html, {
            'wire:id': component.getId(),
        });

        if (ctx) {
            ctx.session.responseFlashMessages.clear()
            ctx.session.flashMessages.clear()
            ctx.session.clear()
        }

        return html;
    }

    public component(name: string, component: typeof Component) {
        return this.components.set(name, component);
    }
}


function insertAttributesIntoHtmlRoot(html: string, attributes: { [key: string]: string }): string {
    const attributesFormattedForHtmlElement = stringifyHtmlAttributes(attributes);

    const regex = /(?:\n\s*|^\s*)<([a-zA-Z0-9\-]+)/;
    const matches = html.match(regex);

    if (!matches || matches.length === 0) {
        throw new Error('Could not find HTML tag in HTML string.');
    }

    const tagName = matches[1];
    const lengthOfTagName = tagName.length;
    const positionOfFirstCharacterInTagName = html.indexOf(tagName);

    return html.substring(0, positionOfFirstCharacterInTagName + lengthOfTagName) +
        ' ' + attributesFormattedForHtmlElement +
        html.substring(positionOfFirstCharacterInTagName + lengthOfTagName);
}

function stringifyHtmlAttributes(attributes: { [key: string]: any }): string {
    return Object.entries(attributes)
        .map(([key, value]) => `${key}="${escapeStringForHtml(value)}"`)
        .join(' ');
}

function escapeStringForHtml(subject: any): string {
    if (typeof subject === 'string' || typeof subject === 'number') {
        return htmlspecialchars(subject as any);
    }

    return htmlspecialchars(JSON.stringify(subject));
}

function htmlspecialchars(text: string): string {
    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, m => map[m]);
}

function getPublicMethods(obj) {
    const proto = Object.getPrototypeOf(obj);
    return Object.getOwnPropertyNames(proto)
        .filter(prop => typeof proto[prop] === 'function' && prop !== 'constructor');
}