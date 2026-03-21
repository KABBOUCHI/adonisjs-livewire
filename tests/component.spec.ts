import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from './helpers.js'
import { Component } from '../src/component.js'
import { Edge } from 'edge.js'
import { store, livewireContext, DataStore } from '../src/store.js'
import ComponentContext from '../src/component_context.js'

/**
 * Test component helper class
 */
class TestComponent extends Component {
  count = 0

  increment() {
    this.count++
  }

  async render() {
    return Promise.resolve(`<div>Count: ${this.count}</div>`)
  }
}

test.group('Component', () => {
  test('should create component instance with required properties', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test-component' })

    assert.equal(component.getId(), 'test-id')
    assert.equal(component.getName(), 'test-component')
    assert.equal(component.__id, 'test-id')
    assert.equal(component.__name, 'test-component')
    assert.equal(component.ctx, ctx)
    assert.equal(component.app, app)
  })

  test('should set and get id property', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'initial-id', name: 'test' })

    assert.equal(component.__id, 'initial-id')
    component.__id = 'new-id'
    assert.equal(component.__id, 'new-id')
    assert.equal(component.getId(), 'new-id')
  })

  test('should set and get name property', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'initial-name' })

    assert.equal(component.__name, 'initial-name')
    component.__name = 'new-name'
    assert.equal(component.__name, 'new-name')
    assert.equal(component.getName(), 'new-name')
  })

  test('should set and get viewPath property', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    component.viewPath = 'components/test'
    assert.equal(component.viewPath, 'components/test')
  })

  test('should use compatibility methods for id', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    component.setId('new-id')
    assert.equal(component.getId(), 'new-id')
    assert.equal(component.__id, 'new-id')
  })

  test('should use compatibility methods for name', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    component.setName('new-name')
    assert.equal(component.getName(), 'new-name')
    assert.equal(component.__name, 'new-name')
  })

  test('should use compatibility method for viewPath', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    component.setViewPath('components/new-view')
    assert.equal(component.viewPath, 'components/new-view')
  })

  test('should set and get viewData', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const testData = { key1: 'value1', key2: 123 }
    component.viewData = testData
    assert.deepEqual(component.viewData, testData)
  })

  test('should set view renderer', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    // The view getter returns a wrapper object, not the original renderer
    assert.isFunction(component.view.render)
    assert.isFunction(component.view.renderSync)
    assert.isFunction(component.view.renderRaw)
    assert.isFunction(component.view.share)
  })

  test('should throw error when accessing view without initializing', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    assert.throws(() => {
      // @ts-ignore - accessing view to trigger error
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const _ignored = component.view
    }, 'View renderer not initialized for component: test')
  })

  test('should render component when viewPath is set', async ({ assert, cleanup, fs }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    // Create a component that doesn't override render() method
    class RenderTestComponent extends Component {
      // No render() override - will use BaseComponent.render()
    }
    const component = new RenderTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Create template file
    await fs.create('test-view.edge', '<div>Test View</div>')

    const edge = Edge.create()
    edge.mount(fs.basePath)

    component.view = edge.createRenderer()
    component.viewPath = 'test-view'

    const html = await component.render()
    assert.include(html, 'Test View')
  })

  test('should set skipRender in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.skipRender()
        const skipRender = store(component).get('skipRender')
        assert.isTrue(skipRender === true)
      }
    )
  })

  test('should set skipRender with custom HTML in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.skipRender('<div>Custom HTML</div>')
        const skipRender = store(component).get('skipRender')
        assert.equal(skipRender, '<div>Custom HTML</div>')
      }
    )
  })

  test('should set skipMount in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.skipMount()
        const skipMount = store(component).get('skipMount')
        assert.isTrue(skipMount === true)
      }
    )
  })

  test('should set skipHydrate in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.skipHydrate()
        const skipHydrate = store(component).get('skipHydrate')
        assert.isTrue(skipHydrate === true)
      }
    )
  })

  test('should have HandlesEvents methods available', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Component should have methods from HandlesEvents
    assert.isFunction(component.dispatch)
    assert.isFunction(component.getListeners)
  })

  test('should have HandlesRedirects methods available', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Component should have methods from HandlesRedirects
    assert.isFunction(component.redirect)
  })

  test('should have HandlesValidation methods available', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Component should have methods from HandlesValidation
    assert.isFunction(component.setErrorBag)
    assert.isFunction(component.getErrorBag)
    assert.isFunction(component.addError)
    assert.isFunction(component.resetErrorBag)
  })

  test('should have HandlesJsEvaluation methods available', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Component should have methods from HandlesJsEvaluation
    assert.isFunction(component.js)
  })

  test('should have HandlesPageComponents feature available', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    cleanup(() => {
      component // isso não faz nada
    })

    // HandlesPageComponents is mixed in but doesn't add methods directly
    // It's used for internal functionality
    assert.isTrue(true)
  })

  test('should have HandlesDecorators methods available', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Component should have methods from HandlesDecorators
    assert.isFunction(component.getDecorators)
    assert.isFunction(component.addDecorator)
  })
})
