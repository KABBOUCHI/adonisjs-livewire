import type { ApplicationService } from '@adonisjs/core/types'
import ComponentHook from '../../ComponentHook.js'
import { Response } from '@adonisjs/core/http'
import { SupportScriptsAndAssets } from '../SupportScriptsAndAssets/SupportScriptsAndAssets.js'

export class SupportAutoInjectedAssets extends ComponentHook {
    static async provide(app: ApplicationService) {

        //@ts-ignore
        Response.getter('content', function () {

            //@ts-ignore
            let self = this
            let reqId = self.ctx.request.id()
            let assetsHead = ''
            let assetsBody = ''

            let assets = Object.values(SupportScriptsAndAssets.renderedAssets.get(reqId) || {})

            if (assets.length > 0) {
                for (let asset of assets) {
                    assetsHead += asset + '\n'
                }
            }

            if (!assetsHead && !assetsBody) {
                return self.lazyBody.content
            }

            let html: string = self.lazyBody.content?.[0] || ''
            if (typeof html === 'string' && html.includes('</html>')) {
                self.lazyBody.content[0] = SupportAutoInjectedAssets.injectAssets(
                    html,
                    assetsHead,
                    assetsBody
                )

                SupportScriptsAndAssets.renderedAssets.delete(reqId)
            }

            return self.lazyBody.content
        })

    }
    async dehydrate() { }

    static injectAssets(html: string, assetsHead: string, assetsBody: string) {
        let head = html.split('</head>')
        let body = head[1].split('</body>')

        head[1] = assetsHead + body[0]
        body[0] = assetsBody

        return head.join('</head>') + body.join('</body>')
    }
}
