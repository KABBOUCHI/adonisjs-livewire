import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { Component } from '../src/Component';
import * as decorators from '../src/decorators';
import fs from 'fs';

export default class LivewireProvider {
    public static needsApplication = true

    constructor(protected app: ApplicationContract) { }

    public async boot() {
        let livewireCss = fs.readFileSync(`${__dirname}/../assets/livewire.css`, 'utf-8')
        let livewireJs = fs.readFileSync(`${__dirname}/../assets/livewire.js`, 'utf-8')

        this.app.container.withBindings(
            [
                'Adonis/Core/Application',
                'Adonis/Core/Helpers',
                'Adonis/Core/View',
                'Adonis/Core/Route',
                'Adonis/Core/HttpContext',
            ],
            async (Application, Helpers, View, Route, HttpContext) => {
                const Livewire = (await import('../src/Livewire')).default;
                const LivewireTag = (await import('../src/LivewireTag')).default;

                const livewire = new Livewire(
                    Application,
                    View,
                    Helpers,
                    HttpContext,
                )
                this.app.container.singleton('Adonis/Addons/Livewire', () => ({
                    Livewire: livewire,
                    Component,
                    ...decorators,
                }))

                View.global("livewire", livewire);
                View.registerTag(new LivewireTag)

                View.registerTag({
                    tagName: 'livewireStyles',
                    block: false,
                    seekable: false,
                    compile(_parser, buffer, _token) {
                        buffer.outputRaw(`<link rel="stylesheet" href="livewire.css">`)
                    }
                })

                View.registerTag({
                    tagName: 'livewireScripts',
                    block: false,
                    seekable: false,
                    compile(_parser, buffer, _token) {
                        let csrfToken = "NA"

                        buffer.outputRaw(`<script src="livewire.js" data-csrf="${csrfToken}" data-update-uri="/livewire/update" data-navigate-once="true"></script>`)
                    }
                })

                let regex = /<livewire:([a-zA-Z0-9\.\-]+)([^>]*)\/>/g;

                View.processor.process('raw', (value) => {
                    let raw = value.raw;

                    raw = raw.replace("<livewire:styles/>", "@livewireStyles")
                    raw = raw.replace("<livewire:styles />", "@livewireStyles")
                    raw = raw.replace("<livewire:scripts/>", "@livewireScripts")
                    raw = raw.replace("<livewire:scripts />", "@livewireScripts")

                    let matches = raw.match(regex);

                    if (!matches) {
                        return;
                    }


                    for (const match of matches) {
                        let [_, component, props] = match.match(/<livewire:([a-zA-Z0-9\.\-]+)([^>]*)\/>/) || [];
                        let attributes: any = {};
                        let options: any = {};
                        if (props) {
                            let regex = /(@|:|wire:)?([a-zA-Z0-9\-]+)\s*=\s*['"]([^'"]*)['"]/g;

                            let matches = props.match(regex);

                            if (matches) {
                                for (const match of matches) {
                                    let [_, prefix, key, value] = match.match(/(@|:|wire:)?([a-zA-Z0-9\-]+)\s*=\s*['"]([^'"]*)['"]/) || [];
                                    if (prefix === ':') {
                                        attributes[key] = `_____${value}_____`
                                    } else if (prefix === 'wire:' && key === 'key') {
                                        options.key = `_____${value}_____`
                                    } else if (prefix === '@') {
                                        attributes[`@${key}`] = value
                                    }
                                    else {
                                        attributes[key] = value
                                    }
                                }
                            }
                        }

                        const attrs = JSON.stringify(attributes).replace(/"_____([^"]*)_____"/g, "$1")
                        const opts = JSON.stringify(options).replace(/"_____([^"]*)_____"/g, "$1")

                        raw = raw.replace(match, `@livewire('${component}', ${attrs}, ${opts})`);

                    }
                    return raw;
                })

                Route.get('/livewire.css', async ({ response }) => {
                    response.type('text/css')

                    return livewireCss
                })

                Route.get('/livewire.js', async ({ response }) => {
                    response.type('text/javascript')

                    return livewireJs
                })

                Route.livewire = (pattern: string, component?: string, params: any[] = []) => {
                    Route.get(pattern, async ({ view }) => {
                        component = component || pattern;

                        component = component.replace(/^\//, '');
                        component = component.replace(/\/$/, '');
                        component = component.replace(/\//g, '.');

                        return await view.renderRaw(`@livewire('${component}', ${JSON.stringify(params)}, { layout: { name: 'layouts/main', section: 'body' } })`);
                    });

                    return Route;
                };

                Route.post('/livewire/update', async (ctx) => {
                    let components = ctx.request.input('components', []);
                    let result: any = {
                        components: [],
                        assets: [],
                    }
                    for (const component of components) {
                        let snapshot = JSON.parse(component.snapshot);
                        let [newSnapshot, effects] = await livewire.update(snapshot, component.updates, component.calls)
                        result.components.push({
                            snapshot: JSON.stringify(newSnapshot),
                            effects,
                        });
                    }

                    return result;
                })
            },
        );



    }
}