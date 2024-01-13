import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import ComponentHook, { IComponentHook } from "../../ComponentHook";
import { SupportScriptsAndAssets } from '../SupportScriptsAndAssets/SupportScriptsAndAssets';

export class SupportAutoInjectedAssets extends ComponentHook implements IComponentHook {
    static hasRenderedAComponentThisRequest = false;

    public static async provide(app: ApplicationContract) {
        const Server = app.container.resolveBinding('Adonis/Core/Server');

        // TODO: implement to flush-state
        Server.hooks.before(async () => {
            SupportAutoInjectedAssets.hasRenderedAComponentThisRequest = false;
        })

        Server.hooks.after(async (ctx: HttpContextContract) => {
            let assetsHead = ''
            let assetsBody = ''

            let assets = Object.values(SupportScriptsAndAssets.renderedAssets);

            if (assets.length > 0) {
                for (let asset of assets) {
                    assetsHead += asset + '\n';
                }
            }

            if (!assetsHead && !assetsBody) return;

            let html: string = ctx.response.lazyBody[0] || '';
            if (html.includes('</html>')) {
                ctx.response.lazyBody[0] = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody);
            }
        })
    }
    async dehydrate() {
        SupportAutoInjectedAssets.hasRenderedAComponentThisRequest = true;
    }

    static injectAssets(html: string, assetsHead: string, assetsBody: string) {
        let head = html.split('</head>');
        let body = head[1].split('</body>');

        head[1] = assetsHead + body[0];
        body[0] = assetsBody;

        return head.join('</head>') + body.join('</body>');
    }
}