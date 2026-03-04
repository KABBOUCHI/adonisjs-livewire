import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import { SupportLazyLoading } from '../../src/features/support_lazy_loading/support_lazy_loading.js'
import Lazy from '../../src/features/support_lazy_loading/lazy.js'
import { insertAttributesIntoHtmlRoot } from '../../src/utils/html.js'
import { Edge } from 'edge.js'

class LazyTestComponent extends Component {
  count = 0

  async mount(params?: any) {
    if (params?.count) {
      this.count = params.count
    }
  }

  async placeholder(params?: any) {
    return '<div>Loading...</div>'
  }

  async render() {
    return Promise.resolve(`<div>Count: ${this.count}</div>`)
  }
}

test.group('Lazy Decorator', () => {
  test('should create Lazy decorator with isolate default true', async ({ assert }) => {
    const decorator = new Lazy()

    assert.isTrue(decorator.isolate)
  })

  test('should create Lazy decorator with isolate false', async ({ assert }) => {
    const decorator = new Lazy(false)

    assert.isFalse(decorator.isolate)
  })

  test('should create Lazy decorator with isolate true', async ({ assert }) => {
    const decorator = new Lazy(true)

    assert.isTrue(decorator.isolate)
  })
})

test.group('SupportLazyLoading', () => {
  test('should skip mount and render when lazy param is true', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Initialize view renderer
    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    // Mock Livewire instance
    const mockLivewire = {
      snapshot: async () => ({ memo: {}, data: {}, checksum: '' }),
      insertAttributesIntoHtmlRoot,
    } as any
    app.container.singleton('livewire', () => mockLivewire)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.mount({ lazy: true })

        assert.isTrue(store(component).has('skipMount'))
        assert.isTrue(store(component).has('skipRender'))
        assert.isTrue(store(component).get('isLazyLoadMounting'))
        assert.isTrue(store(component).get('isLazyIsolated')) // isolate=true by default (PHP parity)
      }
    )
  })

  test('should not skip mount when lazy param is false', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.mount({ lazy: false })

        assert.isFalse(store(component).has('skipMount'))
      }
    )
  })

  test('should skip mount when Lazy decorator exists', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Initialize view renderer
    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    // Mock Livewire instance
    const mockLivewire = {
      snapshot: async () => ({ memo: {}, data: {}, checksum: '' }),
      insertAttributesIntoHtmlRoot,
    } as any
    app.container.singleton('livewire', () => mockLivewire)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const lazyDecorator = new Lazy()
        lazyDecorator.__boot(component)
        component.addDecorator(lazyDecorator)

        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.mount({})

        assert.isTrue(store(component).has('skipMount'))
        assert.isTrue(store(component).get('isLazyLoadMounting'))
        assert.isTrue(store(component).get('isLazyIsolated'))
      }
    )
  })

  test('should use isolate from Lazy decorator', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Initialize view renderer
    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    // Mock Livewire instance
    const mockLivewire = {
      snapshot: async () => ({ memo: {}, data: {}, checksum: '' }),
      insertAttributesIntoHtmlRoot,
    } as any
    app.container.singleton('livewire', () => mockLivewire)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const lazyDecorator = new Lazy(false) // isolate = false
        lazyDecorator.__boot(component)
        component.addDecorator(lazyDecorator)

        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.mount({})

        assert.isFalse(store(component).get('isLazyIsolated'))
      }
    )
  })

  test('should skip hydrate when lazyLoaded is false in memo', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.hydrate({ lazyLoaded: false })

        assert.isTrue(store(component).has('skipHydrate'))
        assert.isTrue(store(component).get('isLazyLoadHydrating'))
      }
    )
  })

  test('should not skip hydrate when lazyLoaded is true in memo', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.hydrate({ lazyLoaded: true })

        assert.isFalse(store(component).has('skipHydrate'))
        // When lazyLoaded is true, the method returns early and doesn't set isLazyLoadHydrating
        // So the key doesn't exist in the store, and get() returns []
        assert.isFalse(store(component).has('isLazyLoadHydrating'))
      }
    )
  })

  test('should add lazyLoaded false memo when mounting', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        store(component).set('isLazyLoadMounting', true)
        store(component).set('isLazyIsolated', false)

        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.equal(componentContext.memo.lazyLoaded, false)
        assert.equal(componentContext.memo.lazyIsolated, false)
      }
    )
  })

  test('should add lazyLoaded true memo when hydrating', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        store(component).set('isLazyLoadHydrating', true)

        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.equal(componentContext.memo.lazyLoaded, true)
      }
    )
  })

  test('should not process call when method is not __lazyLoad', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new LazyTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportLazyLoading()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.call('increment', [], () => {})

        // Should not throw or modify component
        assert.equal(component.count, 0)
      }
    )
  })
})
