import Livewire from '../src/livewire.js'
import { defineConfig } from '../src/define_config.js'
import { AppFactory } from '@adonisjs/core/factories/app'
import type { ApplicationService } from '@adonisjs/core/types'
import { Secret } from '@poppinss/utils'

export class LivewireFactory {
  static async create() {
    const app = new AppFactory().create(new URL('./', import.meta.url)) as ApplicationService

    app.initiating(() => {
      app.useConfig({
        appUrl: process.env.APP_URL || '',
        app: {
          appKey: new Secret('zKXHe-Ahdb7aPK1ylAJlRgTtablektEaACi'),
          http: {},
        },
      })
    })
    await app.init()
    await app.boot()

    const livewire = new Livewire(
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

    return livewire
  }
}
