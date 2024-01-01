import { ViewContract } from "@ioc:Adonis/Core/View";
import { ApplicationContract } from "@ioc:Adonis/Core/Application";
import Helpers from "@ioc:Adonis/Core/Helpers";
import { Component } from "./Component";
import ComponentContext from "./ComponentContext";

export default class Livewire {
    app: ApplicationContract
    view: ViewContract
    helpers: typeof Helpers

    constructor(app: ApplicationContract, view: ViewContract, helpers: typeof Helpers) {
        this.app = app;
        this.view = view;
        this.helpers = helpers;
    }

    public async mount(name: string, params: any[] = [], _key?: string) {
        let component = await this.new(name);
        let context = new ComponentContext(component, true);
        params = Array.isArray(params) ? params : [params];
        if (component.mount) {
            await component.mount(...params);
        }

        let html = await this.render(component, '<div></div>');

        let snapshot = this.snapshot(component, context);

        html = insertAttributesIntoHtmlRoot(html, {
            'wire:snapshot': snapshot,
            'wire:effects': Object.keys(context.effects).length > 0 ? context.effects as any : [],
        });

        return html
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
        let Component = await import(`${process.cwd()}/app/Livewire/${name}`).then(module => module.default) as typeof Component;
        let component = new Component;

        component.setId(id ?? this.helpers.string.generateRandom(20));
        component.setName(name);

        return component
    }

    protected async hydrateProperties(component: Component, data: { [key: string]: any }, _context: ComponentContext) {
        Object.keys(data).forEach(key => {
            if (!(key in component)) return;

            const child = data[key];

            component[key] = child;
        });
    }

    public async update(snapshot: any, updates: any, calls: any) {
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
    }

    public async callMethods(component: Component, calls: any, context: ComponentContext) {
        let returns: any[] = [];

        for (const call of calls) {
            let method = call['method'];
            let params = call['params'];

            let result = await component[method](...params);

            returns.push(result);
        }

        context.addEffect('returns', returns);
    }


    public snapshot(component: any, context: any = null): any {
        context = context ?? new ComponentContext(component);

        let data = JSON.parse(JSON.stringify(component));

        if (data.__store) {
            if(data.__store.js.length > 0) {
                context.addEffect('xjs', data.__store.js);
            }
            delete data.__store;
        }

        delete data.__id;
        delete  data.__name;

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
        let html = await this.view.renderRaw(await component.render() || defaultValue || "<div></div>", {
            ...component,
            ...data
        });

        html = insertAttributesIntoHtmlRoot(html, {
            'wire:id': component.getId(),
        });

        return html;
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