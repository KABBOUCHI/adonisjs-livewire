import type { PluginFn } from '@japa/runner/types'
import { TestContext } from '@japa/runner/core'
import Livewire from '../livewire.js'
import { defineConfig } from '../define_config.js'
import { AppFactory } from '@adonisjs/core/factories/app'
import type { ApplicationService } from '@adonisjs/core/types'
import { Secret } from '@poppinss/utils'

declare module '@japa/runner/core' {
  interface TestContext {
    livewire: Livewire
  }
}

export function livewire(): PluginFn {
  return async function () {
    let app: ApplicationService
    let livewireInstance: Livewire

    app = new AppFactory().create(new URL('./', import.meta.url)) as ApplicationService

    app.initiating(() => {
      app.useConfig({
        appUrl: process.env.APP_URL || '',
        app: {
          appKey: new Secret(process.env.APP_KEY || 'zKXHe-Ahdb7aPK1ylAJlRgTtablektEaACi'),
          http: {},
        },
      })
    })
    await app.init()
    await app.boot()

    livewireInstance = new Livewire(
      app,
      defineConfig({
        class_namespace: 'app/livewire',
        layout: 'components.layouts.main',
        injectAssets: true,
        navigate: {
          showProgressBar: true,
          progressBarColor: '#2299dd',
        },
      })
    )

    TestContext.getter(
      'livewire',
      function () {
        return livewireInstance
      },
      true
    )
  }
}
