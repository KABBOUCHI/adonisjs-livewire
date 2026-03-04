import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import On from '../../src/features/support_events/on.js'
import { on } from '../../src/decorators/index.js'

/**
 * Test component for events
 */
class EventsTestComponent extends Component {
  eventCalled = false
  eventParams: any = null

  getListeners() {
    return {
      'test-event': 'handleTestEvent',
    }
  }

  handleTestEvent(params: any) {
    this.eventCalled = true
    this.eventParams = params
  }

  async render() {
    return Promise.resolve('<div>Events Test</div>')
  }
}

test.group('Support Events Feature', () => {
  test('should dispatch events and store them', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('user-created', { id: 123, name: 'John' })

        const dispatched = store(component).get('dispatched')
        assert.isArray(dispatched)
        assert.lengthOf(dispatched, 1)
        assert.deepEqual(dispatched[0], {
          name: 'user-created',
          params: { id: 123, name: 'John' },
          to: undefined,
          self: undefined,
        })
      }
    )
  })

  test('should dispatch events with to parameter', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('user-updated', { id: 456 }, 'other-component')

        const dispatched = store(component).get('dispatched')
        assert.deepEqual(dispatched[0].to, 'other-component')
      }
    )
  })

  test('should dispatch events with self parameter', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('user-deleted', { id: 789 }, undefined, true)

        const dispatched = store(component).get('dispatched')
        assert.isTrue(dispatched[0].self)
      }
    )
  })

  test('should dispatch multiple events', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('event1', { data: 1 })
        component.dispatch('event2', { data: 2 })
        component.dispatch('event3', { data: 3 })

        const dispatched = store(component).get('dispatched')
        assert.lengthOf(dispatched, 3)
      }
    )
  })

  test('should return empty listeners object by default', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const listeners = component.getListeners()
    assert.deepEqual(listeners, { 'test-event': 'handleTestEvent' })
  })

  test('should handle component without getListeners override', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    class SimpleComponent extends Component {
      async render() {
        return Promise.resolve('<div>Simple</div>')
      }
    }
    const component = new SimpleComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const listeners = component.getListeners()
    assert.deepEqual(listeners, {})
  })
})

test.group('On Decorator', () => {
  test('should create On decorator with name and event', async ({ assert }) => {
    const decorator = new On('user-created', 'handleUserCreated')

    assert.equal(decorator.name, 'user-created')
    assert.equal(decorator.event, 'handleUserCreated')
  })

  test('should push listener to store on boot', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator = new On('custom-event', 'handleCustomEvent')
        decorator.__boot(component)

        await decorator.boot()

        const listeners = store(component).get('listeners')
        assert.isArray(listeners)
        assert.lengthOf(listeners, 1)
        assert.deepEqual(listeners[0], {
          name: 'custom-event',
          event: 'handleCustomEvent',
        })
      }
    )
  })

  test('should register multiple listeners', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const decorator1 = new On('event-one', 'handleOne')
        const decorator2 = new On('event-two', 'handleTwo')
        decorator1.__boot(component)
        decorator2.__boot(component)

        await decorator1.boot()
        await decorator2.boot()

        const listeners = store(component).get('listeners')
        assert.lengthOf(listeners, 2)
        assert.deepEqual(listeners[0], { name: 'event-one', event: 'handleOne' })
        assert.deepEqual(listeners[1], { name: 'event-two', event: 'handleTwo' })
      }
    )
  })
})

test.group('On Decorator - Use @on', () => {
  test('should register listener via @on decorator', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      @on('user-created')
      handleUserCreated() {
        // handler method
      }

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        // Boot all decorators
        for (const decorator of component.getDecorators()) {
          decorator.__boot(component)
          if (typeof decorator['boot'] === 'function') {
            await decorator['boot']()
          }
        }

        const listeners = store(component).get('listeners')
        assert.isArray(listeners)
        assert.lengthOf(listeners, 1)
        assert.deepEqual(listeners[0], {
          name: 'user-created',
          event: 'handleUserCreated',
        })
      }
    )
  })

  test('should use method name as event name when not specified', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      @on()
      onUserDeleted() {
        // handler
      }

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        for (const decorator of component.getDecorators()) {
          decorator.__boot(component)
          if (typeof decorator['boot'] === 'function') {
            await decorator['boot']()
          }
        }

        const listeners = store(component).get('listeners')
        assert.deepEqual(listeners[0], {
          name: 'onUserDeleted',
          event: 'onUserDeleted',
        })
      }
    )
  })
})
