import { test } from '@japa/runner'
import { Synth } from '../../src/synthesizers/synth.js'
import ComponentContext from '../../src/component_context.js'
import { setupApp } from '../helpers.js'

// Test class that extends Synth
class TestSynth extends Synth {
  static key = 'test-synth'

  static match(target: any) {
    return false
  }

  static matchByType(type: string) {
    return false
  }
}

test.group('Synth', () => {
  test('should get static key', async ({ assert }) => {
    const key = TestSynth.getKey()

    assert.equal(key, 'test-synth')
  })

  test('should get instance key', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    const key = synth.getKey()

    assert.equal(key, 'test-synth')
  })

  test('should throw error when static key is not defined', async ({ assert }) => {
    class NoKeySynth extends Synth {
      static match(target: any) {
        return false
      }
    }

    assert.throws(() => {
      NoKeySynth.getKey()
    }, 'You need to define static $key property on: NoKeySynth')
  })

  test('should throw error when instance key is not defined', async ({ assert }) => {
    class NoKeySynth extends Synth {
      static match(target: any) {
        return false
      }
    }

    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new NoKeySynth(context, 'path', app)

    assert.throws(() => {
      synth.getKey()
    }, 'You need to define static $key property on: NoKeySynth')
  })

  test('should return false for match by default', async ({ assert }) => {
    const result = TestSynth.match({ any: 'target' })

    assert.isFalse(result)
  })

  test('should return false for matchByType by default', async ({ assert }) => {
    const result = TestSynth.matchByType('any-type')

    assert.isFalse(result)
  })

  test('should dehydrate to [target, {}] by default', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    const target = { value: 123 }
    const result = await synth.dehydrate(target, async () => {})

    assert.deepEqual(result, [target, {}])
  })

  test('should hydrate to value by default', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    const value = { value: 123 }
    const result = await synth.hydrate(value, {}, async () => {})

    assert.equal(result, value)
  })

  test('should get property from object', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    const target = { name: 'John', age: 30 }

    assert.equal(synth.get(target, 'name'), 'John')
    assert.equal(synth.get(target, 'age'), 30)
    assert.isUndefined(synth.get(target, 'nonExistent'))
  })

  test('should get property from array', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    const target = ['item1', 'item2', 'item3']

    assert.equal(synth.get(target, '0'), 'item1')
    assert.equal(synth.get(target, '1'), 'item2')
    assert.equal(synth.get(target, '2'), 'item3')
    assert.isNull(synth.get(target, '10')) // Non-existent index
  })

  test('should get property using numeric key from array', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    const target = ['item1', 'item2']

    assert.equal(synth.get(target, '0'), 'item1')
    assert.equal(synth.get(target, '1'), 'item2')
  })

  test('should return null for non-existent array index', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    const target: any[] = []

    assert.isNull(synth.get(target, '0'))
    assert.isNull(synth.get(target, '100'))
  })

  test('should store context, path, and app', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'test.path', app)

    assert.equal(synth.context, context)
    assert.equal(synth.path, 'test.path')
    assert.equal(synth.app, app)
  })

  test('should handle dehydrate with hydrateChild callback', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    let callbackCalled = false
    const hydrateChild = async (key: string, value: any) => {
      callbackCalled = true
      return value
    }

    const target = { value: 123 }
    const result = await synth.dehydrate(target, hydrateChild)

    // Default implementation doesn't call hydrateChild
    assert.isFalse(callbackCalled)
    assert.deepEqual(result, [target, {}])
  })

  test('should handle hydrate with hydrateChild callback', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new TestSynth(context, 'path', app)

    let callbackCalled = false
    const hydrateChild = async (key: string, value: any) => {
      callbackCalled = true
      return value
    }

    const value = { value: 123 }
    const result = await synth.hydrate(value, {}, hydrateChild)

    // Default implementation doesn't call hydrateChild
    assert.isFalse(callbackCalled)
    assert.equal(result, value)
  })
})
