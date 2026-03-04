import type { ApplicationService } from '@adonisjs/core/types'
import ComponentHook from '../../component_hook.js'
import { HttpResponse } from '@adonisjs/core/http'
import { SupportScriptsAndAssets } from '../support_scripts_and_assets/support_scripts_and_assets.js'

export class SupportAutoInjectedAssets extends ComponentHook {
  static async provide(app: ApplicationService) {
    //@ts-ignore
    HttpResponse.getter('content', function () {
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
  async dehydrate() {}

  /**
   * Injects assets before </head> and </body>. If HTML has no </head> or </body>,
   * injects before </html> / after <html> (fallback). Matches PHP SupportAutoInjectedAssets.
   */
  static injectAssets(html: string, assetsHead: string, assetsBody: string): string {
    const hasHead = /<\s*\/\s*head\s*>/i.test(html)
    const hasBody = /<\s*\/\s*body\s*>/i.test(html)

    if (hasHead && hasBody) {
      return html
        .replace(/(<\s*\/\s*head\s*>)/gi, assetsHead + '$1')
        .replace(/(<\s*\/\s*body\s*>)/gi, assetsBody + '$1')
    }

    return html
      .replace(/(<\s*html(?:\s[^>])*>)/gi, '$1' + assetsHead)
      .replace(/(<\s*\/\s*html\s*>)/gi, assetsBody + '$1')
  }
}
