import { test } from '@japa/runner'
import { EventBus } from '../src/event_bus.js'

test.group('EventBus', () => {
  test('should register listeners with on()', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    bus.on('test', () => {
      called = true
    })

    await bus.trigger('test')
    assert.isTrue(called)
  })

  test('on() should return unsubscribe function', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    const unsubscribe = bus.on('test', () => {
      called = true
    })

    await bus.trigger('test')
    assert.isTrue(called)

    called = false
    unsubscribe()
    await bus.trigger('test')
    assert.isFalse(called)
  })

  test('should allow multiple listeners for same event', async ({ assert }) => {
    const bus = new EventBus()
    const calls: number[] = []

    bus.on('test', () => {
      calls.push(1)
    })

    bus.on('test', () => {
      calls.push(2)
    })

    bus.on('test', () => {
      calls.push(3)
    })

    await bus.trigger('test')
    assert.deepEqual(calls, [1, 2, 3])
  })

  test('should pass parameters to listeners', async ({ assert }) => {
    const bus = new EventBus()
    let receivedParams: any[] = []

    bus.on('test', (...params: any[]) => {
      receivedParams = params
    })

    await bus.trigger('test', 'param1', 'param2', 123)
    assert.deepEqual(receivedParams, ['param1', 'param2', 123])
  })

  test('should support async listeners', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    bus.on('test', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      called = true
    })

    await bus.trigger('test')
    assert.isTrue(called)
  })

  test('off() should remove listener registered with on()', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    const listener = () => {
      called = true
    }

    bus.on('test', listener)
    await bus.trigger('test')
    assert.isTrue(called)

    called = false
    bus.off('test', listener)
    await bus.trigger('test')
    assert.isFalse(called)
  })

  test('off() should remove listener registered with before()', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    const listener = () => {
      called = true
    }

    bus.before('test', listener)
    await bus.trigger('test')
    assert.isTrue(called)

    called = false
    bus.off('test', listener)
    await bus.trigger('test')
    assert.isFalse(called)
  })

  test('off() should remove listener registered with after()', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    const listener = () => {
      called = true
    }

    bus.after('test', listener)
    await bus.trigger('test')
    assert.isTrue(called)

    called = false
    bus.off('test', listener)
    await bus.trigger('test')
    assert.isFalse(called)
  })

  test('off() should not fail if listener does not exist', async ({ assert }) => {
    const bus = new EventBus()
    const listener = () => {}

    // Should not throw
    bus.off('test', listener)
    bus.off('nonexistent', listener)
    assert.isTrue(true)
  })

  test('before() should register listeners that execute before main listeners', async ({
    assert,
  }) => {
    const bus = new EventBus()
    const executionOrder: string[] = []

    bus.before('test', () => {
      executionOrder.push('before1')
    })

    bus.on('test', () => {
      executionOrder.push('on1')
    })

    bus.before('test', () => {
      executionOrder.push('before2')
    })

    bus.on('test', () => {
      executionOrder.push('on2')
    })

    await bus.trigger('test')
    assert.deepEqual(executionOrder, ['before1', 'before2', 'on1', 'on2'])
  })

  test('before() should return unsubscribe function', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    const unsubscribe = bus.before('test', () => {
      called = true
    })

    await bus.trigger('test')
    assert.isTrue(called)

    called = false
    unsubscribe()
    await bus.trigger('test')
    assert.isFalse(called)
  })

  test('after() should register listeners that execute after main listeners', async ({
    assert,
  }) => {
    const bus = new EventBus()
    const executionOrder: string[] = []

    bus.on('test', () => {
      executionOrder.push('on1')
    })

    bus.after('test', () => {
      executionOrder.push('after1')
    })

    bus.on('test', () => {
      executionOrder.push('on2')
    })

    bus.after('test', () => {
      executionOrder.push('after2')
    })

    await bus.trigger('test')
    assert.deepEqual(executionOrder, ['on1', 'on2', 'after1', 'after2'])
  })

  test('after() should return unsubscribe function', async ({ assert }) => {
    const bus = new EventBus()
    let called = false

    const unsubscribe = bus.after('test', () => {
      called = true
    })

    await bus.trigger('test')
    assert.isTrue(called)

    called = false
    unsubscribe()
    await bus.trigger('test')
    assert.isFalse(called)
  })

  test('trigger() should execute listeners in correct order: before → on → after', async ({
    assert,
  }) => {
    const bus = new EventBus()
    const executionOrder: string[] = []

    bus.after('test', () => {
      executionOrder.push('after')
    })

    bus.on('test', () => {
      executionOrder.push('on')
    })

    bus.before('test', () => {
      executionOrder.push('before')
    })

    await bus.trigger('test')
    assert.deepEqual(executionOrder, ['before', 'on', 'after'])
  })

  test('trigger() should pass parameters correctly to all listeners', async ({ assert }) => {
    const bus = new EventBus()
    const receivedParams: any[][] = []

    bus.before('test', (...params: any[]) => {
      receivedParams.push(['before', ...params])
    })

    bus.on('test', (...params: any[]) => {
      receivedParams.push(['on', ...params])
    })

    bus.after('test', (...params: any[]) => {
      receivedParams.push(['after', ...params])
    })

    await bus.trigger('test', 'param1', 123, { key: 'value' })
    assert.deepEqual(receivedParams, [
      ['before', 'param1', 123, { key: 'value' }],
      ['on', 'param1', 123, { key: 'value' }],
      ['after', 'param1', 123, { key: 'value' }],
    ])
  })

  test('trigger() should collect middlewares returned by listeners', async ({ assert }) => {
    const bus = new EventBus()

    bus.on('test', () => {
      return async () => 'middleware1'
    })

    bus.on('test', () => {
      return async () => 'middleware2'
    })

    bus.on('test', () => {
      // No middleware
    })

    const finisher = await bus.trigger('test')
    assert.isFunction(finisher)

    const result = await finisher()
    // Should execute middlewares in order
    assert.equal(result, 'middleware2')
  })

  test('trigger() finisher should execute middlewares with forward value', async ({ assert }) => {
    const bus = new EventBus()

    bus.on('test', () => {
      return async (forward: any) => {
        return forward ? forward + 10 : 10
      }
    })

    bus.on('test', () => {
      return async (forward: any) => {
        return forward ? forward * 2 : 20
      }
    })

    const finisher = await bus.trigger('test')
    const result = await finisher(5)

    // First middleware: 5 + 10 = 15
    // Second middleware: 15 * 2 = 30
    assert.equal(result, 30)
  })

  test('trigger() finisher should handle extras parameters', async ({ assert }) => {
    const bus = new EventBus()

    bus.on('test', () => {
      return async (forward: any, ...extras: any[]) => {
        return { forward, extras }
      }
    })

    const finisher = await bus.trigger('test')
    const result = await finisher('initial', 'extra1', 'extra2', 123)

    assert.deepEqual(result, {
      forward: 'initial',
      extras: ['extra1', 'extra2', 123],
    })
  })

  test('trigger() finisher should handle array middlewares', async ({ assert }) => {
    const bus = new EventBus()

    bus.on('test', () => {
      return [async () => 'first', async () => 'second', async () => 'last']
    })

    const finisher = await bus.trigger('test')
    const result = await finisher()

    // Should use the last callback in the array
    assert.equal(result, 'last')
  })

  test('trigger() finisher should skip null/undefined middlewares', async ({ assert }) => {
    const bus = new EventBus()

    bus.on('test', () => {
      return async () => 'valid'
    })

    bus.on('test', () => {
      return null
    })

    bus.on('test', () => {
      return undefined
    })

    const finisher = await bus.trigger('test')
    const result = await finisher()

    // Should only execute valid middleware
    assert.equal(result, 'valid')
  })

  test('trigger() finisher should return forward if middleware returns null/undefined', async ({
    assert,
  }) => {
    const bus = new EventBus()

    bus.on('test', () => {
      return async (forward: any) => {
        return null
      }
    })

    bus.on('test', () => {
      return async (forward: any) => {
        return undefined
      }
    })

    const finisher = await bus.trigger('test')
    const result = await finisher('original')

    // Should preserve forward value when middleware returns null/undefined
    assert.equal(result, 'original')
  })

  test('trigger() should handle events with no listeners', async ({ assert }) => {
    const bus = new EventBus()

    const finisher = await bus.trigger('nonexistent')
    const result = await finisher('test')

    // Should return forward value when no listeners
    assert.equal(result, 'test')
  })

  test('trigger() should handle multiple events independently', async ({ assert }) => {
    const bus = new EventBus()
    const event1Calls: string[] = []
    const event2Calls: string[] = []

    bus.on('event1', () => {
      event1Calls.push('event1')
    })

    bus.on('event2', () => {
      event2Calls.push('event2')
    })

    await bus.trigger('event1')
    await bus.trigger('event2')

    assert.deepEqual(event1Calls, ['event1'])
    assert.deepEqual(event2Calls, ['event2'])
  })
})
