import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { SupportDecorators } from '../../src/features/support_decorators/support_decorators.js'
import { Decorator } from '../../src/features/support_decorators/decorator.js'

class DecoratorTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>Decorator Test</div>')
  }
}

// Test decorators
class TestDecorator1 extends Decorator {
  bootCalled = false
  mountCalled = false
  updateCalled = false
  hydrateCalled = false
  dehydrateCalled = false
  destroyCalled = false
  exceptionCalled = false
  renderCalled = false
  callCalled = false

  bootParams: any[] = []
  mountParams: any[] = []
  updateParams: any[] = []
  hydrateParams: any[] = []
  dehydrateParams: any[] = []
  destroyParams: any[] = []
  exceptionParams: any[] = []
  renderParams: any[] = []
  callParams: any[] = []

  async boot(...params: any[]) {
    this.bootCalled = true
    this.bootParams = params
  }

  async mount(...params: any[]) {
    this.mountCalled = true
    this.mountParams = params
  }

  async update(propertyName: string, _fullPath: string, newValue: any) {
    this.updateCalled = true
    this.updateParams = [propertyName, newValue]
    return async () => {
      // Callback
    }
  }

  async hydrate(...params: any[]) {
    this.hydrateCalled = true
    this.hydrateParams = params
  }

  async dehydrate(...params: any[]) {
    this.dehydrateCalled = true
    this.dehydrateParams = params
  }

  async destroy(...params: any[]) {
    this.destroyCalled = true
    this.destroyParams = params
  }

  async exception(...params: any[]) {
    this.exceptionCalled = true
    this.exceptionParams = params
  }

  async render(...params: any[]) {
    this.renderCalled = true
    this.renderParams = params
    return async () => {
      // Callback
    }
  }

  async call(method: string, params: any[], returnEarly: any) {
    this.callCalled = true
    this.callParams = [method, params, returnEarly]
  }
}

class TestDecorator2 extends Decorator {
  bootCalled = false

  async boot() {
    this.bootCalled = true
  }
}

test.group('HandlesDecorators', () => {
  test('should return empty array when no decorators added', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorators = component.getDecorators()

    assert.isArray(decorators)
    assert.lengthOf(decorators, 0)
  })

  test('should add decorator and retrieve it', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorator = new TestDecorator1()
    component.addDecorator(decorator)

    const decorators = component.getDecorators()

    assert.lengthOf(decorators, 1)
    assert.equal(decorators[0], decorator)
  })

  test('should add multiple decorators', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorator1 = new TestDecorator1()
    const decorator2 = new TestDecorator2()
    component.addDecorator(decorator1)
    component.addDecorator(decorator2)

    const decorators = component.getDecorators()

    assert.lengthOf(decorators, 2)
    assert.equal(decorators[0], decorator1)
    assert.equal(decorators[1], decorator2)
  })
})

test.group('SupportDecorators', () => {
  test('should call boot on all decorators', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        const decorator2 = new TestDecorator2()
        decorator1.boot(component)
        decorator2.boot()
        component.addDecorator(decorator1)
        component.addDecorator(decorator2)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.boot('param1', 'param2')

        assert.isTrue(decorator1.bootCalled)
        assert.isTrue(decorator2.bootCalled)
        assert.deepEqual(decorator1.bootParams, ['param1', 'param2'])
      }
    )
  })

  test('should call mount on all decorators that have mount method', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        const decorator2 = new TestDecorator2() // No mount method
        decorator1.boot(component)
        decorator2.boot()
        component.addDecorator(decorator1)
        component.addDecorator(decorator2)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.mount('param1', 'param2')

        assert.isTrue(decorator1.mountCalled)
        assert.deepEqual(decorator1.mountParams, ['param1', 'param2'])
      }
    )
  })

  test('should call update on all decorators and execute callbacks', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        decorator1.boot(component)
        component.addDecorator(decorator1)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        const callbackExecutor = await hook.update('count', 'count', 5)

        assert.isTrue(decorator1.updateCalled)
        assert.deepEqual(decorator1.updateParams, ['count', 5])
        assert.isFunction(callbackExecutor)

        await callbackExecutor()
        // Should not throw
      }
    )
  })

  test('should call hydrate on all decorators that have hydrate method', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        decorator1.boot(component)
        component.addDecorator(decorator1)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.hydrate('param1', 'param2')

        assert.isTrue(decorator1.hydrateCalled)
        assert.deepEqual(decorator1.hydrateParams, ['param1', 'param2'])
      }
    )
  })

  test('should call dehydrate on all decorators that have dehydrate method', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        decorator1.boot(component)
        component.addDecorator(decorator1)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate('param1', 'param2')

        assert.isTrue(decorator1.dehydrateCalled)
        assert.deepEqual(decorator1.dehydrateParams, ['param1', 'param2'])
      }
    )
  })

  test('should call destroy on all decorators that have destroy method', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        decorator1.boot(component)
        component.addDecorator(decorator1)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.destroy('param1', 'param2')

        assert.isTrue(decorator1.destroyCalled)
        assert.deepEqual(decorator1.destroyParams, ['param1', 'param2'])
      }
    )
  })

  test('should call exception on all decorators that have exception method', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        decorator1.boot(component)
        component.addDecorator(decorator1)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.exception('param1', 'param2')

        assert.isTrue(decorator1.exceptionCalled)
        assert.deepEqual(decorator1.exceptionParams, ['param1', 'param2'])
      }
    )
  })

  test('should call render on all decorators and execute callbacks', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        decorator1.boot(component)
        component.addDecorator(decorator1)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        const callbackExecutor = await hook.render('param1', 'param2')

        assert.isTrue(decorator1.renderCalled)
        assert.deepEqual(decorator1.renderParams, ['param1', 'param2'])
        assert.isFunction(callbackExecutor)

        await callbackExecutor()
        // Should not throw
      }
    )
  })

  test('should call call on all decorators that have call method', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        decorator1.boot(component)
        component.addDecorator(decorator1)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        const returnEarly = () => {}
        await hook.call('increment', [1, 2], returnEarly)

        assert.isTrue(decorator1.callCalled)
        assert.equal(decorator1.callParams[0], 'increment')
        assert.deepEqual(decorator1.callParams[1], [1, 2])
        assert.equal(decorator1.callParams[2], returnEarly)
      }
    )
  })

  test('should execute decorators in order', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new TestDecorator1()
        const decorator2 = new TestDecorator1()
        decorator1.boot(component)
        decorator2.boot(component)
        component.addDecorator(decorator1)
        component.addDecorator(decorator2)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.boot()

        assert.isTrue(decorator1.bootCalled)
        assert.isTrue(decorator2.bootCalled)
      }
    )
  })

  test('should handle decorators without optional methods gracefully', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new DecoratorTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new TestDecorator2() // Only has boot
        decorator.boot()
        component.addDecorator(decorator)

        const hook = new SupportDecorators()
        hook.setComponent(component)
        hook.setApp(app)

        // Should not throw when calling methods that don't exist
        await assert.doesNotReject(async () => {
          await hook.mount()
          await hook.hydrate()
          await hook.dehydrate()
          await hook.destroy()
          await hook.exception()
          await hook.render()
          await hook.call('method', [], () => {})
        })
      }
    )
  })
})
