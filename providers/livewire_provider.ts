import type { ApplicationService } from '@adonisjs/core/types'
// import packageJson from '../package.json' assert { type: 'json' }
import fs from 'node:fs'
import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext, Route } from '@adonisjs/core/http'
//@ts-ignore
import inspect from '@poppinss/inspect'
import { ComponentTagCompiler } from '../src/component_tag_compiler.js'
import { SupportLazyLoading } from '../src/features/support_lazy_loading/support_lazy_loading.js'
import { Constructor } from '@adonisjs/http-server/types'
import edge, { type Edge } from 'edge.js'

class DumpException extends Exception {
  async handle(error: this, ctx: HttpContext) {
    ctx.response.send(error.message)
  }
}

function dd(...args: any[]) {
  throw new DumpException(args.map(inspect.string.html).join('\n'))
}

// @ts-ignore
globalThis.dd = dd

declare module '@adonisjs/core/http' {
  interface Router {
    livewire: <T extends Constructor<any>>(
      pattern: string,
      component?: string | undefined,
      params?: object | Record<string, any> | undefined
    ) => Route<T>
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    view: ReturnType<Edge['createRenderer']>
    session: any
  }
}

const packageJson = {
  version: '0.1.0',
}

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SupportDecorators } from '../src/features/support_decorators/support_decorators.js'
import { SupportEvents } from '../src/features/support_events/support_events.js'
import { SupportJsEvaluation } from '../src/features/support_js_valuation/support_js_evaluation.js'
import { SupportRedirects } from '../src/features/support_redirects/support_redirects.js'
import { SupportScriptsAndAssets } from '../src/features/support_scripts_and_assets/support_scripts_and_assets.js'
import { SupportAutoInjectedAssets } from '../src/features/support_auto_injected_assets/support_auto_injected_assets.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default class LivewireProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    let livewireJs = fs
      .readFileSync(`${__dirname}/../assets/livewire.js`, 'utf-8')
      .replace('_token', '_csrf')

    const app = await this.app.container.make('app')
    const router = await this.app.container.make('router')

    app.config.set('app.http.generateRequestId', true)
    app.config.set('app.http.useAsyncLocalStorage', true)

    const Livewire = (await import('../src/livewire.js')).default
    const LivewireTag = (await import('../src/livewire_tag.js')).default

    const livewire = new Livewire(app)

    this.app.container.singleton('livewire', () => {
      return livewire
    })

    edge.global('livewire', livewire)
    edge.registerTag(new LivewireTag())

    edge.registerTag({
      tagName: 'livewireStyles',
      block: false,
      seekable: false,
      compile(_parser, buffer, _token) {
        buffer.outputRaw(`<link rel="stylesheet" href="/livewire.css?v=${packageJson.version}">`)
      },
    })

    edge.registerTag({
      tagName: 'livewireScripts',
      block: false,
      seekable: false,
      compile(_parser, buffer, _token) {
        //@ts-ignore
        let csrfToken = HttpContext.get()?.request.csrfToken

        buffer.outputRaw(
          `<script src="/livewire.js?v=${packageJson.version}" data-csrf="${csrfToken}" data-update-uri="/livewire/update" data-navigate-once="true"></script>`
        )
      },
    })

    let regex = /<livewire:([a-zA-Z0-9\.\-]+)([^>]*)\/>/g

    edge.processor.process('raw', (value) => {
      let raw = value.raw

      // raw = raw.replace("<livewire:styles/>", "@livewireStyles")
      // raw = raw.replace("<livewire:styles />", "@livewireStyles")
      // raw = raw.replace("<livewire:scripts/>", "@livewireScripts")
      // raw = raw.replace("<livewire:scripts />", "@livewireScripts")

      let matches = raw.match(regex)

      if (!matches) {
        return
      }

      for (const match of matches) {
        let [_, component, props] = match.match(/<livewire:([a-zA-Z0-9\.\-:.]+)([^>]*)\/>/) || []
        let attributes: any = {}
        let options: any = {}
        if (props) {
          let regex = /(@|:|wire:)?([a-zA-Z0-9\-:.]+)\s*=\s*['"]([^'"]*)['"]/g

          let matches = props.match(regex)
          let propsRemainder = props

          if (matches) {
            for (const match of matches) {
              let [m, prefix, key, value] =
                match.match(/(@|:|wire:)?([a-zA-Z0-9\-:.]+)\s*=\s*['"]([^'"]*)['"]/) || []
              if (prefix === ':' && key !== 'is' && key !== 'component') {
                attributes[key] = `_____${value}_____`
              } else if (prefix === 'wire:' && key === 'key') {
                options.key = `_____${value}_____`
              } else if (prefix === 'wire:') {
                if (key === 'model') {
                  attributes[`wire:${key}`] = '$parent.' + value
                } else {
                  attributes[`wire:${key}`] = value
                }
              } else if (prefix === '@') {
                attributes[`@${key}`] = value
              } else {
                attributes[key] = value
              }

              if (m) {
                propsRemainder = propsRemainder.replace(m, '')
              }
            }
          }

          propsRemainder
            .split(' ')
            .map((prop) => prop.trim())
            .filter(Boolean)
            .forEach((prop) => {
              attributes[prop] = true
            })
        }

        if (component === 'dynamic-component' || component === 'is') {
          component = attributes['component'] ?? attributes['is']
          delete attributes['component']
          delete attributes['is']
        } else {
          component = `'${component}'`
        }

        const attrs = JSON.stringify(attributes).replace(/"_____([^"]*)_____"/g, '$1')
        const opts = JSON.stringify(options).replace(/"_____([^"]*)_____"/g, '$1')

        raw = raw.replace(match, `@livewire(${component}, ${attrs}, ${opts})`)
      }
      return raw
    })

    router.get('/livewire.css', async ({ response }) => {
      response.type('text/css')
      response.header('Cache-Control', 'public, max-age=31536000')

      let progressBarColor = '#2299dd'

      return `
      [wire\:loading][wire\:loading], [wire\:loading\.delay][wire\:loading\.delay], [wire\:loading\.inline-block][wire\:loading\.inline-block], [wire\:loading\.inline][wire\:loading\.inline], [wire\:loading\.block][wire\:loading\.block], [wire\:loading\.flex][wire\:loading\.flex], [wire\:loading\.table][wire\:loading\.table], [wire\:loading\.grid][wire\:loading\.grid], [wire\:loading\.inline-flex][wire\:loading\.inline-flex] {
          display: none;
      }
      
      [wire\:loading\.delay\.none][wire\:loading\.delay\.none], [wire\:loading\.delay\.shortest][wire\:loading\.delay\.shortest], [wire\:loading\.delay\.shorter][wire\:loading\.delay\.shorter], [wire\:loading\.delay\.short][wire\:loading\.delay\.short], [wire\:loading\.delay\.default][wire\:loading\.delay\.default], [wire\:loading\.delay\.long][wire\:loading\.delay\.long], [wire\:loading\.delay\.longer][wire\:loading\.delay\.longer], [wire\:loading\.delay\.longest][wire\:loading\.delay\.longest] {
          display: none;
      }
      
      [wire\:offline][wire\:offline] {
          display: none;
      }
      
      [wire\:dirty]:not(textarea):not(input):not(select) {
          display: none;
      }
      
      :root {
          --livewire-progress-bar-color: ${progressBarColor};
      }
      
      [x-cloak] {
          display: none !important;
      }`
    })

    router.get('/livewire.js', async ({ response }) => {
      response.type('text/javascript')
      response.header('Cache-Control', 'public, max-age=31536000')

      return livewireJs
    })

    router.livewire = (
      pattern: string,
      component?: string | undefined,
      params: any[] | Record<string, any> | undefined = {}
    ) => {
      return router.get(pattern, async ({ view, request }) => {
        component = component || pattern

        component = component.replace(/^\//, '')
        component = component.replace(/\/$/, '')
        component = component.replace(/\//g, '.')

        let parameters = {
          ...request.params(),
          ...params,
        }

        return await view.renderRaw(
          `@livewire('${component}', ${JSON.stringify(parameters)}, { layout: { name: 'main' } })`
        )
      })
    }

    router.post('/livewire/update', async (ctx) => {
      let components = ctx.request.input('components', [])
      let result: any = {
        components: [],
        assets: [],
      }
      for (const component of components) {
        let snapshot = JSON.parse(component.snapshot)
        let [newSnapshot, effects] = await livewire.update(
          snapshot,
          component.updates,
          component.calls
        )
        result.components.push({
          snapshot: JSON.stringify(newSnapshot),
          effects,
        })
      }

      return result
    })

    edge.processor.process('raw', (value) => {
      return ComponentTagCompiler.compile(value.raw, this.app)
    })
  }

  async register() {
    const Livewire = (await import('../src/livewire.js')).default

    const FEATURES = [
      SupportDecorators,
      SupportEvents,
      SupportJsEvaluation,
      SupportRedirects,
      SupportScriptsAndAssets,
      SupportAutoInjectedAssets,
      SupportLazyLoading,
    ]

    for (const feature of FEATURES) {
      Livewire.componentHook(feature)

      //@ts-ignore
      if (feature['provide']) {
        //@ts-ignore
        await feature['provide'](this.app)
      }
    }
  }
}
