import { ViewContract } from "@ioc:Adonis/Core/View";
import { ApplicationContract } from "@ioc:Adonis/Core/Application";
import { HttpContextConstructorContract } from "@ioc:Adonis/Core/HttpContext";
import Helpers from "@ioc:Adonis/Core/Helpers";
import { Component } from "./Component";
import ComponentContext from "./ComponentContext";
import { DataStore, getLivewireContext, livewireContext, store } from "./store";
import { Checksum } from "./Checksum";
import { SupportDecorators } from "./Features/SupportDecorators/SupportDecorators";
import { SupportEvents } from "./Features/SupportEvents/SupportEvents";
import Layout from "./Features/SupportPageComponents/Layout";
import Computed from "./Features/SupportComputed/Computed";
import { SupportJsEvaluation } from "./Features/SupportJsEvaluation/SupportJsEvaluation";
import { SupportRedirects } from "./Features/SupportRedirects/SupportRedirects";


const FEATURES = [
    SupportDecorators,
    SupportEvents,
    SupportJsEvaluation,
    SupportRedirects,
]

export default class Livewire {
    app: ApplicationContract
    _view: ViewContract
    httpContext: HttpContextConstructorContract
    helpers: typeof Helpers
    components = new Map<string, typeof Component>();
    checksum: Checksum;

    constructor(app: ApplicationContract, view: ViewContract, helpers: typeof Helpers, httpContext: HttpContextConstructorContract) {
        this.app = app;
        this._view = view;
        this.helpers = helpers;
        this.httpContext = httpContext;
        this.checksum = new Checksum(
            this.app.env.get('APP_KEY')!,
        );
    }

    get view() {
        let ctx = this.httpContext.get();
        let v = this._view;

        if (ctx) {
            v = ctx.view as any;
        }

        return v;
    }

    async trigger(event: string, component: Component, ...params: any[]) {
        const { context, features } = getLivewireContext()!

        const callbacks = await Promise.all(
            features.map(async feature => {
                feature.setComponent(component);

                if (event === 'mount') {
                    await feature.callBoot();
                    await feature.callMount(...params);
                } else if (event === 'hydrate') {
                    await feature.callBoot();
                    await feature.callHydrate(context.memo, context);
                } else if (event === 'dehydrate') {
                    await feature.callDehydrate(context);
                } else if (event === 'render') {
                    return await feature.callRender(...params);
                } else if (event === 'update') {
                    await feature.callUpdate(params[0], params[1], params[2]);
                }
            })
        )

        return callbacks
    }

    public async mount(name: string, params: any[] = [], options: { layout?: any, key?: string } = {}) {
        let component = await this.new(name);
        let context = new ComponentContext(component, true);
        let dataStore = new DataStore(this.helpers.string.generateRandom(32));
        let features = FEATURES.map(Feature => {
            let feature = new Feature();
            feature.setComponent(component);
            return feature
        })
        return await livewireContext.run({ dataStore, context, features }, async () => {

            params = Array.isArray(params) ? params : [params];
            if (options.layout && (!component.__decorators || !component.__decorators.some(d => d instanceof Layout))) {
                component.addDecorator(new Layout(
                    options.layout.name,
                    options.layout.section || 'body'
                ));
            }

            await this.trigger('mount', component, params, options.key);
            //@ts-ignore
            if (typeof component.mount === 'function') {
                //@ts-ignore
                await component.mount(...params);
            }

            const s = store(component);

            await this.trigger('render', component, this.view, []) as any;

            let html = await this.render(component, '<div></div>');

            await this.trigger('dehydrate', component, context);

            let snapshot = this.snapshot(component, context);

            for (const param of params) {
                for (const key of Object.keys(param)) {
                    if (key.startsWith('@')) {
                        let value = param[key];
                        let fullEvent = this.helpers.string.dashCase(key.replace('@', ''));
                        let attributeKey = 'x-on:' + fullEvent;
                        let attributeValue = `$wire.$parent.${value}`;

                        html = insertAttributesIntoHtmlRoot(html, {
                            [attributeKey]: attributeValue,
                        });
                    } else if (key.startsWith('wire:')) {
                        let value = param[key];
                        let attributeKey = key;
                        let attributeValue = value;

                        html = insertAttributesIntoHtmlRoot(html, {
                            [attributeKey]: attributeValue,
                        });
                    }
                }
            }

            let binding = s.get("bindings")[0]
            if (binding) {
                html = insertAttributesIntoHtmlRoot(html, {
                    "x-modelable": `$wire.${binding.inner}`,
                });
            }

            html = insertAttributesIntoHtmlRoot(html, {
                'wire:snapshot': snapshot,
                'wire:effects': JSON.stringify(context.effects),
            });

            let decorators = component.getDecorators();
            let layout = decorators.find(d => d instanceof Layout) as Layout;

            // TODO: find a better way to do this
            if (layout) {
                html = await this.view.renderRaw(`@layout('${layout.path}')\n@section('${layout.section}')\n${html}\n@endsection`)
            }

            return html
        })
    }

    public async fromSnapshot(snapshot: any) {
        this.checksum.verify(snapshot);

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

        let componentId = id ?? this.helpers.string.generateRandom(20)

        let component = new LivewireComponent({
            ctx: this.httpContext.get(),
            id: componentId,
            name
        })

        let viewPath = name.split('.').map(s => this.helpers.string.dashCase(s)).join('/');
        component.setViewPath(viewPath);

        return component
    }

    protected async hydrateProperties(component: Component, data: { [key: string]: any }, _context: ComponentContext) {
        Object.keys(data).forEach(key => {
            const child = data[key];

            component[key] = child;
        });
    }

    public async update(snapshot: any, updates: any, calls: any) {
        let dataStore = new DataStore(this.helpers.string.generateRandom(32));
        let [component, context] = await this.fromSnapshot(snapshot);
        let features = FEATURES.map(Feature => {
            let feature = new Feature();
            feature.setComponent(component);
            return feature
        })

        return await livewireContext.run({ dataStore, context, features }, async () => {
            let data = snapshot['data'];
            let memo = snapshot['memo'];

            await this.trigger('hydrate', component, memo, context);

            await this.updateProperties(component, updates, data, context);

            await this.callMethods(component, calls, context);

            let html = await this.render(component);

            if (html) {
                context.addEffect('html', html);
            }

            await this.trigger('dehydrate', component, context);

            let newSnapshot = this.snapshot(component, context);


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

                if (method === '__dispatch') {
                    const features = getLivewireContext()!.features;
                    let result = await features[1].callCall('__dispatch', params)
                    returns.push(result);
                } else {
                    let result = await component[method](...params);
                    returns.push(result);
                }
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

        let data = JSON.parse(JSON.stringify(component, (key, value) => {
            if (key.startsWith('__')) return undefined;

            return value;
        }));

        const s = store(component);

        // if (context.mounting) {
        //     if (component.listeners && Object.keys(component.listeners).length > 0) {
        //         context.addEffect('listeners', component.listeners);
        //     }
        // }

        if (s.has("dispatched")) {
            context.addEffect('dispatches', s.get("dispatched"));
        }

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

        snapshot['checksum'] = this.checksum.generate(snapshot);

        return snapshot;
    }

    protected async updateProperties(component: Component, updates: any, data: any, _context: ComponentContext) {
        const computedDecorators: Computed[] = component.getDecorators().filter(d => d instanceof Computed) as any
        Object.keys(data).forEach(key => {
            if (computedDecorators.some(d => d.name === key)) return;
            if (!(key in component)) return;

            const child = data[key];

            component[key] = child;
        });


        for (const key in updates) {
            if (!(key in component)) return;

            const child = updates[key];

            await this.trigger('update', component, key, key, child);

            if (typeof component["updating"] === 'function') {
                await component["updating"](key, child);
            }

            let updatingPropMethod = `updating${this.helpers.string.titleCase(key)}`;

            if (typeof component[updatingPropMethod] === 'function') {
                await component[updatingPropMethod](child);
            }

            component[key] = child;

            if (typeof component["updated"] === 'function') {
                await component["updated"](key, child);
            }

            let updatedPropMethod = `updated${this.helpers.string.titleCase(key)}`;

            if (typeof component[updatedPropMethod] === 'function') {
                await component[updatedPropMethod](child);
            }
        }
    }

    public async render(component: Component, defaultValue?: string) {
        let data = await component.data() || {};
        // let decorators = component.getDecorators();
        // let computedDecorators = decorators.filter(d => d.type === 'computed');

        // for (const decorator of computedDecorators) {
        //     data[decorator.name] = await component[decorator.function]();
        // }

        let ctx = this.httpContext.get();

        if (ctx) {
            await ctx.session.commit()
            ctx.session.initiated = false;
            ctx.session.responseFlashMessages.clear()
            await ctx.session.initiate(false)
        }

        component.data = async () => data;


        let content = await component.render() || defaultValue || "<div></div>";
        let finish = await this.trigger('render', component, this.view, []) as any;

        let html = await this.view.renderRaw(content, {
            ...component,
            ...data
        });

        html = insertAttributesIntoHtmlRoot(html, {
            'wire:id': component.getId(),
        });

        for (const callback of finish) {
            if (typeof callback === 'function') {
                await callback(html, (newHtml: string) => {
                    html = newHtml;
                })
            }
        }

        html = await this.view.renderRaw(html)

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