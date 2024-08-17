import type { ApplicationService } from '@adonisjs/core/types'
import ComponentHook from '../../component_hook.js'
import { getLivewireContext, store } from '../../store.js'
import ComponentContext from '../../component_context.js'
import string from '@adonisjs/core/helpers/string'
import edge from 'edge.js'
import { HttpContext } from '@adonisjs/core/http'

export class SupportScriptsAndAssets extends ComponentHook {
  static alreadyRunAssetKeys = []
  static renderedAssets = new Map<string, any>()

  static getAssets() {
    return SupportScriptsAndAssets.renderedAssets
  }

  static async provide(app: ApplicationService) {
    // const Server  = await app.container.make('server')

    // TODO: implement to flush-state
    // Server.hooks.before(async () => {
    //   SupportScriptsAndAssets.alreadyRunAssetKeys = []
    //   SupportScriptsAndAssets.renderedAssets = []
    // })
    // on('flush-state', function () {
    //     SupportScriptsAndAssets.alreadyRunAssetKeys = [];
    //     SupportScriptsAndAssets.renderedAssets = [];
    // });

    edge.registerTag({
      tagName: 'script',
      block: true,
      seekable: false,
      compile: async (_parser, _buffer, token) => {
        let output = ''

        let key = string.generateRandom(32)

        for (let child of token.children) {
          if (child.type === 'raw') {
            output += child.value
          } else if (child.type === 'newline') {
            output += '\n'
          } else if (child.type === 'mustache') {
            output += `{{ ${child.properties.jsArg} }}`
          } else if (child.type === 's__mustache') {
            output += `{{{ ${child.properties.jsArg} }}}`
          } else {
            console.log(child.type, child)
          }
        }

        const { context } = getLivewireContext()!

        const s = store(context.component)

        s.push('scripts', await context.component.view.renderRaw(output), key)
      },
    })

    edge.registerTag({
      tagName: 'assets',
      block: true,
      seekable: false,
      compile(parser, _buffer, token) {
        let output = ''

        let key = string.generateRandom(32)

        const buff: any = {
          outputRaw: (str: string) => {
            output += str
          },
        }

        token.children.forEach((child) => parser.processToken(child, buff))

        const { context } = getLivewireContext()!

        const s = store(context.component)

        s.push('assets', output, key)
      },
    })
  }

  async hydrate(memo) {
    // Store the "scripts" and "assets" memos so they can be re-added later (persisted between requests)...
    if (memo['scripts']) {
      store(this.component).set('forwardScriptsToDehydrateMemo', memo['scripts'])
    }

    if (memo['assets']) {
      store(this.component).set('forwardAssetsToDehydrateMemo', memo['assets'])
    }
  }

  async dehydrate(context: ComponentContext) {
    let alreadyRunScriptKeys = store(this.component).get('forwardScriptsToDehydrateMemo') || []
    let reqId = HttpContext.get()?.request.id()!

    // Add any scripts to the payload that haven't been run yet for this component....
    let scripts = store(this.component).get('scripts') || {}

    for (const key of Object.keys(scripts)) {
      let script = scripts[key]

      if (!alreadyRunScriptKeys.includes(key)) {
        context.pushEffect('scripts', script, key)
        alreadyRunScriptKeys.push(key)
      }
    }

    context.addMemo('scripts', alreadyRunScriptKeys)
    // Add any assets to the payload that haven't been run yet for the entire page...

    let alreadyRunAssetKeys = store(this.component).get('forwardAssetsToDehydrateMemo') || []
    let assets = store(this.component).get('assets') || {}

    for (const key of Object.keys(assets)) {
      let asset = assets[key]

      if (!alreadyRunAssetKeys.includes(key)) {
        // These will either get injected into the HTML if it's an initial page load
        // or they will be added to the "assets" key in an ajax payload...
        let reqRenderedAssets = SupportScriptsAndAssets.renderedAssets.get(reqId) || {}
        reqRenderedAssets[key] = asset
        SupportScriptsAndAssets.renderedAssets.set(reqId, reqRenderedAssets)
        alreadyRunAssetKeys.push(key)
      }
    }

    context.addMemo('assets', alreadyRunAssetKeys)
  }
}
