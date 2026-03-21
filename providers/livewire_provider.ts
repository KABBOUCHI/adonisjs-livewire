/// <reference types="@adonisjs/session/session_middleware" />

import type { ApplicationService } from '@adonisjs/core/types'
import fs from 'node:fs'
import { Route } from '@adonisjs/core/http'
import { SupportLazyLoading } from '../src/features/support_lazy_loading/support_lazy_loading.js'
import edge, { type Edge } from 'edge.js'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SupportDecorators } from '../src/features/support_decorators/support_decorators.js'
import { SupportEvents } from '../src/features/support_events/support_events.js'
import { SupportJsEvaluation } from '../src/features/support_js_evaluation/support_js_evaluation.js'
import { SupportRedirects } from '../src/features/support_redirects/support_redirects.js'
import { SupportScriptsAndAssets } from '../src/features/support_scripts_and_assets/support_scripts_and_assets.js'
import { SupportValidation } from '../src/features/support_validation/support_validation.js'
import { SupportAutoInjectedAssets } from '../src/features/support_auto_injected_assets/support_auto_injected_assets.js'
import { SupportFormObjects } from '../src/features/support_form_objects/support_form_objects.js'
import { Config, defaultConfig } from '../src/define_config.js'
import type Livewire from '../src/livewire.js'
import { EventBus } from '../src/event_bus.js'
import { ModelSynth } from '../src/synthesizers/model.js'
import { ArraySynth } from '../src/synthesizers/array.js'
import { DateSynth } from '../src/synthesizers/date.js'
import { FormObjectSynth } from '../src/synthesizers/form_object.js'
import debug from '../src/debug.js'
import { Constructor } from '../src/types.js'

const currentDirname = dirname(fileURLToPath(import.meta.url))

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
  }
}

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    livewire: Livewire
  }
}

export default class LivewireProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    debug('booting Livewire provider')
    let livewireJs = fs
      .readFileSync(`${currentDirname}/../assets/livewire.js`, 'utf-8')
      .replace('_token', '_csrf')

    const app = await this.app.container.make('app')
    const router = await this.app.container.make('router')

    this.app.container.singleton(EventBus, () => new EventBus())

    app.config.set('app.http.generateRequestId', true)
    app.config.set('app.http.useAsyncLocalStorage', true)

    const Livewire = await import('../src/livewire.js').then((m) => m.default)
    const { edgePluginLivewire } = await import('../src/plugins/edge/plugin.js')

    const config = this.app.config.get<Config>('livewire', defaultConfig)
    const livewire = new Livewire(app, router, config)

    this.app.container.singleton('livewire', () => {
      return livewire
    })

    const packageJsonPath = path.join(fileURLToPath(this.app.appRoot), 'package.json')

    const packageJson: { version: string } = await import(packageJsonPath, {
      with: { type: 'json' },
    })

    /**
     * Register the Livewire Edge.js plugin
     * This registers all tags (@livewire, @livewireStyles, @livewireScripts, @script, @assets)
     * and the processor for <livewire:.../> syntax
     */
    edge.use(edgePluginLivewire(this.app, livewire, packageJson.version))
    debug('Livewire provider booted successfully')

    router.get('/livewire.css', async ({ response }) => {
      response.type('text/css')
      response.header('Cache-Control', 'public, max-age=31536000')

      let progressBarColor = config.navigate.progressBarColor

      return `[wire\\:loading][wire\\:loading], [wire\\:loading\\.delay][wire\\:loading\\.delay], [wire\\:loading\\.inline-block][wire\\:loading\\.inline-block], [wire\\:loading\\.inline][wire\\:loading\\.inline], [wire\\:loading\\.block][wire\\:loading\\.block], [wire\\:loading\\.flex][wire\\:loading\\.flex], [wire\\:loading\\.table][wire\\:loading\\.table], [wire\\:loading\\.grid][wire\\:loading\\.grid], [wire\\:loading\\.inline-flex][wire\\:loading\\.inline-flex] {
    display: none;
}

[wire\\:loading\\.delay\\.none][wire\\:loading\\.delay\\.none], [wire\\:loading\\.delay\\.shortest][wire\\:loading\\.delay\\.shortest], [wire\\:loading\\.delay\\.shorter][wire\\:loading\\.delay\\.shorter], [wire\\:loading\\.delay\\.short][wire\\:loading\\.delay\\.short], [wire\\:loading\\.delay\\.default][wire\\:loading\\.delay\\.default], [wire\\:loading\\.delay\\.long][wire\\:loading\\.delay\\.long], [wire\\:loading\\.delay\\.longer][wire\\:loading\\.delay\\.longer], [wire\\:loading\\.delay\\.longest][wire\\:loading\\.delay\\.longest] {
    display: none;
}

[wire\\:offline][wire\\:offline] {
    display: none;
}

[wire\\:dirty]:not(textarea):not(input):not(select) {
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
      return router.get(pattern, async (ctx) => {
        component = component || pattern

        component = component.replace(/^\//, '')
        component = component.replace(/\/$/, '')
        component = component.replace(/\//g, '.')

        let parameters = {
          ...ctx.request.params(),
          ...params,
        }

        return await livewire.mount(ctx, component, parameters, { layout: { name: config.layout } })
      })
    }

    router.post('/livewire/update', async (ctx) => {
      let components = ctx.request.input('components', [])
      debug('processing Livewire update request with %d components', components.length)

      let result: any = {
        components: [],
        assets: [],
      }
      let isRedirect = false
      for (const component of components) {
        let snapshot: any
        try {
          snapshot = JSON.parse(component.snapshot)
        } catch (err: any) {
          const raw =
            typeof component.snapshot === 'string' ? component.snapshot : String(component.snapshot)
          const pos = err.message?.match(/position (\d+)/)?.[1]
          debug(
            'Livewire update: JSON.parse failed on component snapshot. Error: %s. Snapshot length: %d. Around position %s: %s',
            err.message,
            raw.length,
            pos,
            pos ? raw.slice(Math.max(0, Number(pos) - 60), Number(pos) + 60) : raw.slice(0, 200)
          )
          throw err
        }
        let [newSnapshot, effects] = await livewire.update(
          ctx,
          snapshot,
          component.updates,
          component.calls
        )

        if (effects && effects.redirect) {
          isRedirect = true
        }

        debug('update response effects: %O', effects)
        debug('update response effects.xjs: %O', effects?.xjs)

        result.components.push({
          snapshot: JSON.stringify(newSnapshot),
          effects,
        })
      }

      // @ts-ignore
      if (ctx.session && !isRedirect) {
        // @ts-ignore
        ctx.session.responseFlashMessages.clear()
        // @ts-ignore
        ctx.session.flashMessages.clear()
      }

      return result
    })
  }

  async register() {
    debug('registering Livewire provider')
    const Livewire = await import('../src/livewire.js').then((m) => m.default)

    const FEATURES = [
      SupportDecorators,
      SupportEvents,
      SupportJsEvaluation,
      SupportRedirects,
      SupportScriptsAndAssets,
      SupportAutoInjectedAssets,
      SupportLazyLoading,
      SupportValidation,
      SupportFormObjects,
    ]

    for (const feature of FEATURES) {
      debug('registering feature: %s', feature.name)
      Livewire.componentHook(feature)

      //@ts-ignore
      if (feature['provide']) {
        //@ts-ignore
        await feature['provide'](this.app)
      }
    }

    debug('registering property synthesizers: ModelSynth, ArraySynth, DateSynth, FormObjectSynth')
    Livewire.registerPropertySynthesizer([ModelSynth, ArraySynth, DateSynth, FormObjectSynth])
  }
}
