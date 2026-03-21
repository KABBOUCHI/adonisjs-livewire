import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import Computed from '../../src/features/support_computed/computed.js'
import { SupportDecorators } from '../../src/features/support_decorators/support_decorators.js'
import { DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { livewireContext } from '../../src/store.js'
import { Edge } from 'edge.js'
import { computed } from '../../src/decorators/index.js'

class ComputedTestComponent extends Component {
  firstName = 'John'
  lastName = 'Doe'

  async fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  async total() {
    return 100
  }

  async render() {
    return Promise.resolve('<div>Computed Test</div>')
  }
}

test.group('Computed Decorator', (group) => {
  const edge = Edge.create()
  const renderer = edge.createRenderer()
  let component: ComputedTestComponent
  let sharedData: Record<string, any>

  group.each.setup(async () => {
    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()

    component = new ComputedTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    component.view = renderer

    renderer.share = (data: Record<string, any>) => {
      sharedData = { ...sharedData, ...data }
      return renderer
    }

    return async function () {
      sharedData = {}
      await app.terminate()
    }
  })

  test('should create Computed decorator with name and method', async ({ assert }) => {
    const decorator = new Computed('fullName', 'fullName')

    assert.equal(decorator.name, 'fullName')
    assert.equal(decorator.method, 'fullName')
  })

  test('should share computed value with view on render', async ({ assert }) => {
    const decorator = new Computed('fullName', 'fullName')
    decorator.__boot(component)

    await decorator.render()

    assert.equal(sharedData.fullName, 'John Doe')
  })

  test('should not share if method does not exist', async ({ assert }) => {
    const decorator = new Computed('nonExistent', 'nonExistentMethod')
    decorator.__boot(component)

    let shareCalled = false
    renderer.share = () => {
      shareCalled = true
      return renderer
    }

    await decorator.render()

    assert.isFalse(shareCalled)
  })

  test('should handle async computed methods', async ({ assert }) => {
    const decorator = new Computed('total', 'total')
    decorator.__boot(component)

    await decorator.render()

    assert.equal(sharedData.total, 100)
  })

  test('should handle different value types', async ({ assert }) => {
    class TestComponent extends Component {
      async stringValue() {
        return 'string'
      }

      async numberValue() {
        return 42
      }

      async booleanValue() {
        return true
      }

      async objectValue() {
        return { nested: 'value' }
      }

      async arrayValue() {
        return [1, 2, 3]
      }

      async render() {
        return Promise.resolve('<div>Test</div>')
      }
    }

    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()

    const $component = new TestComponent({ ctx, app, router, id: 'test-id', name: 'test' })
    $component.view = renderer

    const decorator1 = new Computed('stringValue', 'stringValue')
    const decorator2 = new Computed('numberValue', 'numberValue')
    const decorator3 = new Computed('booleanValue', 'booleanValue')
    const decorator4 = new Computed('objectValue', 'objectValue')
    const decorator5 = new Computed('arrayValue', 'arrayValue')

    decorator1.__boot($component)
    decorator2.__boot($component)
    decorator3.__boot($component)
    decorator4.__boot($component)
    decorator5.__boot($component)

    renderer.share = (data: Record<string, any>) => {
      Object.assign(sharedData, data)
      return renderer
    }

    await decorator1.render()
    await decorator2.render()
    await decorator3.render()
    await decorator4.render()
    await decorator5.render()

    assert.equal(sharedData.stringValue, 'string')
    assert.equal(sharedData.numberValue, 42)
    assert.isTrue(sharedData.booleanValue)
    assert.deepEqual(sharedData.objectValue, { nested: 'value' })
    assert.deepEqual(sharedData.arrayValue, [1, 2, 3])
  })

  test('should memoize computed (PHP parity: method runs once per request)', async ({
    assert,
    cleanup,
  }) => {
    let count = 0
    class MemoTestComponent extends Component {
      async foo() {
        count++
        return 'memo'
      }

      async render() {
        return Promise.resolve('<div>Memo</div>')
      }
    }

    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()

    const $component = new MemoTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })
    $component.view = edge.createRenderer()

    const decorator = new Computed('foo', 'foo')
    decorator.__boot($component)

    await decorator.getValue()
    await decorator.getValue()
    await decorator.getValue()

    assert.equal(count, 1)
    assert.equal(await decorator.getValue(), 'memo')
  })

  test('should bust cache on clearCache (PHP parity: unset)', async ({ assert }) => {
    let count = 0
    class UnsetTestComponent extends Component {
      async bar() {
        count++
        return count
      }

      async render() {
        return Promise.resolve('<div>Unset</div>')
      }
    }
    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()

    const $component = new UnsetTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })
    $component.view = edge.createRenderer()

    const decorator = new Computed('bar', 'bar')
    decorator.__boot($component)

    assert.equal(await decorator.getValue(), 1)
    decorator.clearCache()
    assert.equal(await decorator.getValue(), 2)
    decorator.clearCache()
    assert.equal(await decorator.getValue(), 3)
  })

  test('should throw when computed method called as action (PHP parity)', async ({ assert }) => {
    const { app } = await setupApp()
    const ctx = new HttpContextFactory().create()
    const decorator = new Computed('fullName', 'fullName')
    decorator.__boot(component)
    component.addDecorator(decorator)

    const hook = new SupportDecorators()
    hook.setComponent(component)
    hook.setApp(app)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        try {
          await hook.call('fullName', [], () => {})
          console.log('Passou')
          assert.fail('Expected CannotCallComputedDirectlyException')
        } catch (err: any) {
          assert.equal(err.name, 'CannotCallComputedDirectlyException')
          assert.include(err.message, 'fullName')
          assert.include(err.message, 'test')
        }
      }
    )
  })
})

test.group('Computed Decorator - Use @computed', () => {
  test('should register computed via @computed decorator', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      firstName = 'John'
      lastName = 'Doe'

      @computed()
      async fullName() {
        return `${this.firstName} ${this.lastName}`
      }

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorators = component.getDecorators()
    assert.lengthOf(decorators, 1)

    const dec = decorators[0] as Computed
    assert.equal(dec.name, 'fullName')
    assert.equal(dec.method, 'fullName')
  })

  test('should use custom name in @computed decorator', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      @computed('total')
      async calculateTotal() {
        return 100
      }

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorators = component.getDecorators()
    const dec = decorators[0] as Computed

    assert.equal(dec.name, 'total')
    assert.equal(dec.method, 'calculateTotal')
  })

  test('should memoize computed value via @computed', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    let callCount = 0

    class DecoratedComponent extends Component {
      @computed()
      async expensiveComputation() {
        callCount++
        return 'result'
      }

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const edge = Edge.create()
    component.view = edge.createRenderer()

    // Boot the decorator
    const decorator = component.getDecorators()[0] as Computed
    decorator.__boot(component)

    // Call getValue multiple times
    await decorator.getValue()
    await decorator.getValue()
    await decorator.getValue()

    // Should only call the method once (memoization)
    assert.equal(callCount, 1)
  })

  test('should share computed value with view via @computed', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      items = [1, 2, 3, 4, 5]

      @computed()
      async itemCount() {
        return this.items.length
      }

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    let sharedData: Record<string, any> = {}
    renderer.share = (data: Record<string, any>) => {
      sharedData = { ...sharedData, ...data }
      return renderer
    }

    const decorator = component.getDecorators()[0] as Computed
    decorator.__boot(component)

    await decorator.render()

    assert.equal(sharedData.itemCount, 5)
  })

  test('should support multiple @computed decorators', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      firstName = 'John'
      lastName = 'Doe'
      items = [1, 2, 3]

      @computed()
      async fullName() {
        return `${this.firstName} ${this.lastName}`
      }

      @computed()
      async itemCount() {
        return this.items.length
      }

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorators = component.getDecorators()
    assert.lengthOf(decorators, 2)

    const names = decorators.map((d) => (d as Computed).name)
    assert.includeMembers(names, ['fullName', 'itemCount'])
  })
})
