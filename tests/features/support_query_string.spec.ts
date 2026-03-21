import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import Url from '../../src/features/support_query_string/url.js'

class QueryStringTestComponent extends Component {
  search = ''
  page = 1
  filter: string | null = null

  async render() {
    return Promise.resolve('<div>Query String Test</div>')
  }
}

test.group('Url Decorator', () => {
  test('should create Url decorator with name', async ({ assert }) => {
    const decorator = new Url('search')

    assert.equal(decorator.name, 'search')
    assert.isNull(decorator.as)
    assert.isFalse(decorator.history)
    assert.isFalse(decorator.keep)
    assert.isNull(decorator.except)
    assert.isNull(decorator.nullable)
  })

  test('should create Url decorator with all parameters', async ({ assert }) => {
    const decorator = new Url('search', 'q', true, true, ['page'], true)

    assert.equal(decorator.name, 'search')
    assert.equal(decorator.as, 'q')
    assert.isTrue(decorator.history)
    assert.isTrue(decorator.keep)
    assert.deepEqual(decorator.except, ['page'])
    assert.isTrue(decorator.nullable)
  })

  test('should read value from query string on mount', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    ctx.request.updateQs({ search: 'test query' })
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('search')
        decorator.__boot(component)

        await decorator.mount()

        assert.equal(component.search, 'test query')
      }
    )
  })

  test('should not set value when query string parameter does not exist', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })
    component.search = 'initial'

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('nonExistent')
        decorator.__boot(component)

        await decorator.mount()

        // Should not change initial value
        assert.equal(component.search, 'initial')
      }
    )
  })

  test('should set to null when value is null and nullable is true', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    ctx.request.updateQs({ filter: null })
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('filter', null, false, false, null, true)
        decorator.__boot(component)

        await decorator.mount()

        assert.isNull(component.filter)
      }
    )
  })

  test('should set to empty string when value is null and nullable is false', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    ctx.request.updateQs({ filter: null })
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('filter', null, false, false, null, false)
        decorator.__boot(component)

        await decorator.mount()

        assert.equal(component.filter, '')
      }
    )
  })

  test('should add url effect on dehydrate when mounting', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, true) // mounting = true

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('search', 'q', true, true, ['page'], false)
        decorator.__boot(component)

        await decorator.dehydrate(componentContext)

        assert.deepEqual(componentContext.effects.url, {
          search: {
            as: 'q',
            use: 'push',
            alwaysShow: true,
            except: ['page'],
          },
        })
      }
    )
  })

  test('should not add url effect on dehydrate when not mounting', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false) // mounting = false

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('search')
        decorator.__boot(component)

        await decorator.dehydrate(componentContext)

        assert.isUndefined(componentContext.effects.url)
      }
    )
  })

  test('should set to empty string on update when value is null and nullable is false', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('filter', null, false, false, null, false)
        decorator.__boot(component)

        component.filter = null

        await decorator.update('filter', null)

        assert.equal(component.filter, '')
      }
    )
  })

  test('should not change value on update when nullable is true', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('filter', null, false, false, null, true)
        decorator.__boot(component)

        component.filter = null

        await decorator.update('filter', null)

        assert.isNull(component.filter)
      }
    )
  })

  test('should not update when property name does not match', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('search')
        decorator.__boot(component)

        component.filter = 'value'

        await decorator.update('filter', 'new value')

        assert.equal(component.filter, 'value') // Should not change
      }
    )
  })

  test('should handle queryString with use push when history is true', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, true)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('search', null, true) // history = true
        decorator.__boot(component)

        await decorator.dehydrate(componentContext)

        assert.equal(componentContext.effects.url.search.use, 'push')
      }
    )
  })

  test('should handle queryString with use replace when history is false', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new QueryStringTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, true)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new Url('search', null, false) // history = false
        decorator.__boot(component)

        await decorator.dehydrate(componentContext)

        assert.equal(componentContext.effects.url.search.use, 'replace')
      }
    )
  })
})
