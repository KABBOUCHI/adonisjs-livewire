import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import ComponentHook, { IComponentHook } from "../../ComponentHook";
import { getLivewireContext, store } from "../../store";
import ComponentContext from '../../ComponentContext';

export class SupportScriptsAndAssets extends ComponentHook implements IComponentHook {
    static alreadyRunAssetKeys = [];
    static renderedAssets = {};

    public static getAssets() {
        return SupportScriptsAndAssets.renderedAssets;
    }

    public static async provide(app: ApplicationContract) {
        const View = app.container.resolveBinding('Adonis/Core/View');
        const { string } = app.container.resolveBinding('Adonis/Core/Helpers');

        const Server = app.container.resolveBinding('Adonis/Core/Server');

        // TODO: implement to flush-state
        Server.hooks.before(async () => {
            SupportScriptsAndAssets.alreadyRunAssetKeys = [];
            SupportScriptsAndAssets.renderedAssets = [];
        })
        // on('flush-state', function () {
        //     SupportScriptsAndAssets.alreadyRunAssetKeys = [];
        //     SupportScriptsAndAssets.renderedAssets = [];
        // });

        View.registerTag({
            tagName: 'script',
            block: true,
            seekable: false,
            compile: (parser, _buffer, token) => {
                let output = ""

                let key = string.generateRandom(32);

                const buff: any = {
                    outputRaw: (str: string) => {
                        output += str
                    }
                }


                token.children.forEach((child) => parser.processToken(child, buff))

                const { context } = getLivewireContext()!;

                const s = store(context.component);

                s.push('scripts', output, key)
            }
        })

        View.registerTag({
            tagName: 'assets',
            block: true,
            seekable: false,
            compile(parser, _buffer, token) {
                let output = ""

                let key = string.generateRandom(32);

                const buff: any = {
                    outputRaw: (str: string) => {
                        output += str
                    }
                }

                token.children.forEach((child) => parser.processToken(child, buff))

                const { context } = getLivewireContext()!;

                const s = store(context.component);

                s.push('assets', output, key)
            }
        })
    }

    async hydrate(memo) {
        // Store the "scripts" and "assets" memos so they can be re-added later (persisted between requests)...
        if (memo['scripts']) {
            store(this.component).set('forwardScriptsToDehydrateMemo', memo['scripts']);
        }

        if (memo['assets']) {
            store(this.component).set('forwardAssetsToDehydrateMemo', memo['assets']);
        }
    }

    async dehydrate(context: ComponentContext) {
        let alreadyRunScriptKeys = store(this.component).get('forwardScriptsToDehydrateMemo') || [];

        // Add any scripts to the payload that haven't been run yet for this component....
        let scripts = store(this.component).get('scripts') || {}

        for (const key of Object.keys(scripts)) {
            let script = scripts[key];

            if (!alreadyRunScriptKeys.includes(key)) {
                context.pushEffect('scripts', script, key);
                alreadyRunScriptKeys.push(key);
            }
        }

        context.addMemo('scripts', alreadyRunScriptKeys);
        // Add any assets to the payload that haven't been run yet for the entire page...

        let alreadyRunAssetKeys = store(this.component).get('forwardAssetsToDehydrateMemo') || [];
        let assets = store(this.component).get('assets') || {}

        for (const key of Object.keys(assets)) {
            let asset = assets[key];

            if (!alreadyRunAssetKeys.includes(key)) {
                // These will either get injected into the HTML if it's an initial page load
                // or they will be added to the "assets" key in an ajax payload...
                SupportScriptsAndAssets.renderedAssets[key] = asset;
                alreadyRunAssetKeys.push(key);
            }
        }

        context.addMemo('assets', alreadyRunAssetKeys);
    }
}