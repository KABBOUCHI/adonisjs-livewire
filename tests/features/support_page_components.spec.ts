import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import Layout from '../../src/features/support_page_components/layout.js'
import Title from '../../src/features/support_page_components/title.js'

class PageComponentsTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>Page Components Test</div>')
  }
}

test.group('HandlesPageComponents', () => {
  test('should be a mixin that extends BaseComponent', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new PageComponentsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    // HandlesPageComponents is an empty mixin, just verify component works
    assert.isDefined(component)
    assert.isTrue(component instanceof PageComponentsTestComponent)
  })
})

test.group('Layout Decorator', () => {
  test('should create Layout decorator with default name', async ({ assert }) => {
    const decorator = new Layout()

    assert.equal(decorator.name, 'components/layouts/main')
    assert.deepEqual(decorator.props, {})
  })

  test('should create Layout decorator with custom name', async ({ assert }) => {
    const decorator = new Layout('custom/layout')

    assert.equal(decorator.name, 'custom/layout')
    assert.deepEqual(decorator.props, {})
  })

  test('should create Layout decorator with name and props', async ({ assert }) => {
    const decorator = new Layout('custom/layout', { theme: 'dark', sidebar: true })

    assert.equal(decorator.name, 'custom/layout')
    assert.deepEqual(decorator.props, { theme: 'dark', sidebar: true })
  })

  test('should add layout to store on boot', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new PageComponentsTestComponent({
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
        const decorator = new Layout('custom/layout', { theme: 'dark' })
        decorator.__boot(component)

        decorator.boot()

        const layouts = store(component).get('layout')
        assert.isArray(layouts)
        assert.lengthOf(layouts, 1)
        assert.deepEqual(layouts[0], {
          name: 'custom/layout',
          props: { theme: 'dark' },
        })
      }
    )
  })

  test('should add multiple layouts when boot is called multiple times', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new PageComponentsTestComponent({
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
        const decorator1 = new Layout('layout1')
        const decorator2 = new Layout('layout2', { prop: 'value' })
        decorator1.__boot(component)
        decorator2.__boot(component)

        decorator1.boot()
        decorator2.boot()

        const layouts = store(component).get('layout')
        assert.lengthOf(layouts, 2)
        assert.deepEqual(layouts[0], { name: 'layout1', props: {} })
        assert.deepEqual(layouts[1], { name: 'layout2', props: { prop: 'value' } })
      }
    )
  })
})

test.group('Title Decorator', () => {
  test('should create Title decorator with title', async ({ assert }) => {
    const decorator = new Title('My Page Title')

    assert.equal(decorator.title, 'My Page Title')
  })

  test('should share title with view on render', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new PageComponentsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const decorator = new Title('My Page Title')
    decorator.__boot(component)

    const mockView = {
      share: (data: Record<string, any>) => {
        assert.equal(data.title, 'My Page Title')
      },
    }

    await decorator.render(mockView)
  })

  test('should handle different title values', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new PageComponentsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const titles = ['Home', 'About Us', 'Contact', 'Dashboard']

    for (const title of titles) {
      const decorator = new Title(title)
      decorator.__boot(component)

      const mockView = {
        share: (data: Record<string, any>) => {
          assert.equal(data.title, title)
        },
      }

      await decorator.render(mockView)
    }
  })
})
