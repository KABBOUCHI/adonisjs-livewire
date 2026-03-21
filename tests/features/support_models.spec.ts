import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import Modelable from '../../src/features/support_models/modelable.js'

class ModelableTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>Modelable Test</div>')
  }
}

test.group('Modelable Decorator', () => {
  test('should create Modelable decorator with outer and inner', async ({ assert }) => {
    const decorator = new Modelable('user', 'id')

    assert.equal(decorator.outer, 'user')
    assert.equal(decorator.inner, 'id')
  })

  test('should add binding to store on mount', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ModelableTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Modelable('user', 'id')
        decorator.__boot(component)

        decorator.mount()

        const bindings = store(component).get('bindings')
        assert.isArray(bindings)
        assert.lengthOf(bindings, 1)
        assert.deepEqual(bindings[0], {
          outer: 'user',
          inner: 'id',
        })
      }
    )
  })

  test('should add multiple bindings when mount is called multiple times', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ModelableTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new Modelable('user', 'id')
        const decorator2 = new Modelable('post', 'slug')
        decorator1.__boot(component)
        decorator2.__boot(component)

        decorator1.mount()
        decorator2.mount()

        const bindings = store(component).get('bindings')
        assert.isArray(bindings)
        assert.lengthOf(bindings, 2)
        assert.deepEqual(bindings[0], {
          outer: 'user',
          inner: 'id',
        })
        assert.deepEqual(bindings[1], {
          outer: 'post',
          inner: 'slug',
        })
      }
    )
  })

  test('should handle different outer and inner values', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ModelableTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Modelable('post.author', 'authorId')
        decorator.__boot(component)

        decorator.mount()

        const bindings = store(component).get('bindings')
        assert.deepEqual(bindings[0], {
          outer: 'post.author',
          inner: 'authorId',
        })
      }
    )
  })
})
