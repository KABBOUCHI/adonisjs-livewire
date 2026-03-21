import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import Renderless from '../../src/features/support_renderless/renderless.js'

class RenderlessTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>Renderless Test</div>')
  }
}

test.group('Renderless Decorator', () => {
  test('should call skipRender when call is invoked', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RenderlessTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Renderless()
        decorator.__boot(component)

        decorator.call()

        assert.isTrue(store(component).has('skipRender'))
        assert.equal(store(component).get('skipRender'), true)
      }
    )
  })

  test('should set skipRender to true in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RenderlessTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Renderless()
        decorator.__boot(component)

        decorator.call()

        const skipRender = store(component).get('skipRender')
        assert.isTrue(skipRender === true)
      }
    )
  })
})
