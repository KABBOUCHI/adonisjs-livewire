import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { Component } from '../src/Component';
import * as decorators from '../src/decorators';
import packageJson from '../package.json';
import fs from 'fs';
import { Exception } from '@adonisjs/core/build/standalone'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import inspect from '@poppinss/inspect'
import { SupportDecorators } from '../src/Features/SupportDecorators/SupportDecorators';
import { SupportEvents } from '../src/Features/SupportEvents/SupportEvents';
import { SupportJsEvaluation } from '../src/Features/SupportJsEvaluation/SupportJsEvaluation';
import { SupportRedirects } from '../src/Features/SupportRedirects/SupportRedirects';
import { SupportScriptsAndAssets } from '../src/Features/SupportScriptsAndAssets/SupportScriptsAndAssets';
import { SupportAutoInjectedAssets } from '../src/Features/SupportAutoInjectedAssets/SupportAutoInjectedAssets';
import { ComponentTagCompiler } from '../src/ComponentTagCompiler';

class DumpException extends Exception {
    public async handle(error: this, ctx: HttpContextContract) {
        ctx.response.send(error.message)
    }
}

function dd(...args: any[]) {
    throw new DumpException(
        args.map(inspect.string.html).join('\n'),
    );
}

// @ts-ignore
globalThis.dd = dd;

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
                        buffer.outputRaw(`<link rel="stylesheet" href="/livewire.css?v=${packageJson.version}">`)
                    }
                })

                View.registerTag({
                    tagName: 'livewireScripts',
                    block: false,
                    seekable: false,
                    compile(_parser, buffer, _token) {
                        let csrfToken = "NA"

                        buffer.outputRaw(`<script src="/livewire.js?v=${packageJson.version}" data-csrf="${csrfToken}" data-update-uri="/livewire/update" data-navigate-once="true"></script>`)
                    }
                })

                let regex = /<livewire:([a-zA-Z0-9\.\-]+)([^>]*)\/>/g;

                View.processor.process('raw', (value) => {
                    let raw = value.raw;

                    // raw = raw.replace("<livewire:styles/>", "@livewireStyles")
                    // raw = raw.replace("<livewire:styles />", "@livewireStyles")
                    // raw = raw.replace("<livewire:scripts/>", "@livewireScripts")
                    // raw = raw.replace("<livewire:scripts />", "@livewireScripts")

                    let matches = raw.match(regex);

                    if (!matches) {
                        return;
                    }


                    for (const match of matches) {
                        let [_, component, props] = match.match(/<livewire:([a-zA-Z0-9\.\-]+)([^>]*)\/>/) || [];
                        let attributes: any = {};
                        let options: any = {};
                        if (props) {
                            let regex = /(@|:|wire:)?([a-zA-Z0-9\-:]+)\s*=\s*['"]([^'"]*)['"]/g;

                            let matches = props.match(regex);

                            if (matches) {
                                for (const match of matches) {
                                    let [_, prefix, key, value] = match.match(/(@|:|wire:)?([a-zA-Z0-9\-:]+)\s*=\s*['"]([^'"]*)['"]/) || [];
                                    if (prefix === ':') {
                                        attributes[key] = `_____${value}_____`
                                    } else if (prefix === 'wire:' && key === 'key') {
                                        options.key = `_____${value}_____`
                                    } else if (prefix === 'wire:') {
                                        if (key === 'model') {
                                            attributes[`wire:${key}`] = "$parent." + value
                                        } else {
                                            attributes[`wire:${key}`] = value
                                        }
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
                    response.header('Cache-Control', 'public, max-age=31536000')

                    return livewireCss
                })

                Route.get('/livewire.js', async ({ response }) => {
                    response.type('text/javascript')
                    response.header('Cache-Control', 'public, max-age=31536000')

                    return livewireJs
                })


                Route.livewire = (pattern: string, component?: string | undefined, params: any[] | Record<string, any> | undefined = {}) => {
                    return Route.get(pattern, async ({ view, request }) => {
                        component = component || pattern;

                        component = component.replace(/^\//, '');
                        component = component.replace(/\/$/, '');
                        component = component.replace(/\//g, '.');

                        let parameters = {
                            ...request.params(),
                            ...params,
                        };

                        return await view.renderRaw(`@livewire('${component}', ${JSON.stringify(parameters)}, { layout: { name: 'layouts/main', section: 'body' } })`);
                    })
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

        this.app.container.withBindings(
            [
                'Adonis/Core/View',
            ],
            async (View) => {
                View.processor.process('raw', (value) => {
                    return ComponentTagCompiler.compile(value.raw, this.app);
                })
            })
    }

    public async register() {
        const Livewire = (await import('../src/Livewire')).default;

        const FEATURES = [
            SupportDecorators,
            SupportEvents,
            SupportJsEvaluation,
            SupportRedirects,
            SupportScriptsAndAssets,
            SupportAutoInjectedAssets,
        ]

        for (const feature of FEATURES) {
            Livewire.componentHook(feature);
            if (feature['provide']) {
                await feature['provide'](
                    this.app
                );
            }
        }
    }
}