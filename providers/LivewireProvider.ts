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

                        console.log(`@livewire('${component}', ${JSON.stringify(params)}, { layout: { name: 'layouts/main', section: 'body' } })`);
                        
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