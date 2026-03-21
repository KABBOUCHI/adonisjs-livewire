import { test } from '@japa/runner'
import { ArraySynth } from '../../src/synthesizers/array.js'
import ComponentContext from '../../src/component_context.js'
import { setupApp } from '../helpers.js'

test.group('ArraySynth', () => {
  test('should have static key', async ({ assert }) => {
    const key = ArraySynth.getKey()

    assert.equal(key, 'arr')
  })

  test('should match arrays', async ({ assert }) => {
    assert.isTrue(ArraySynth.match([1, 2, 3]))
    assert.isTrue(ArraySynth.match([]))
    assert.isTrue(ArraySynth.match(['a', 'b', 'c']))
    assert.isTrue(ArraySynth.match([{ nested: 'object' }]))
  })

  test('should not match non-arrays', async ({ assert }) => {
    assert.isFalse(ArraySynth.match(null))
    assert.isFalse(ArraySynth.match(undefined))
    assert.isFalse(ArraySynth.match(123))
    assert.isFalse(ArraySynth.match('string'))
    assert.isFalse(ArraySynth.match(true))
    assert.isFalse(ArraySynth.match({}))
    assert.isFalse(ArraySynth.match({ length: 3 })) // Array-like object
  })

  test('should dehydrate array and process elements', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const processedValues: any[] = []
    const dehydrateChild = async (key: string, value: any) => {
      processedValues.push({ key, value })
      return value * 2 // Transform value
    }

    const target = [1, 2, 3]
    const [result, meta] = await synth.dehydrate(target, dehydrateChild)

    assert.deepEqual(processedValues, [
      { key: '0', value: 1 },
      { key: '1', value: 2 },
      { key: '2', value: 3 },
    ])
    assert.deepEqual(result, [2, 4, 6]) // Values transformed
    assert.deepEqual(meta, {})
  })

  test('should dehydrate empty array', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const dehydrateChild = async (key: string, value: any) => value

    const target: any[] = []
    const [result, meta] = await synth.dehydrate(target, dehydrateChild)

    assert.deepEqual(result, [])
    assert.deepEqual(meta, {})
  })

  test('should dehydrate array with different value types', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const dehydrateChild = async (key: string, value: any) => {
      if (typeof value === 'string') {
        return value.toUpperCase()
      }
      return value
    }

    const target = ['hello', 42, true, { nested: 'object' }]
    const [result, meta] = await synth.dehydrate(target, dehydrateChild)

    assert.equal(result[0], 'HELLO')
    assert.equal(result[1], 42)
    assert.equal(result[2], true)
    assert.deepEqual(result[3], { nested: 'object' })
    assert.deepEqual(meta, {})
  })

  test('should hydrate array and process elements', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const processedValues: any[] = []
    const hydrateChild = async (key: string, value: any) => {
      processedValues.push({ key, value })
      return value / 2 // Transform value
    }

    const value = [2, 4, 6]
    const result = await synth.hydrate(value, {}, hydrateChild)

    assert.deepEqual(processedValues, [
      { key: '0', value: 2 },
      { key: '1', value: 4 },
      { key: '2', value: 6 },
    ])
    assert.deepEqual(result, [1, 2, 3]) // Values transformed
  })

  test('should hydrate empty array', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const hydrateChild = async (key: string, value: any) => value

    const value: any[] = []
    const result = await synth.hydrate(value, {}, hydrateChild)

    assert.deepEqual(result, [])
  })

  test('should not process non-arrays in hydrate', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const hydrateChild = async (key: string, value: any) => {
      throw new Error('Should not be called')
    }

    const value1 = null
    const value2 = undefined
    const value3 = 123
    const value4 = 'string'
    const value5 = { object: 'value' }

    assert.equal(await synth.hydrate(value1, {}, hydrateChild), null)
    assert.equal(await synth.hydrate(value2, {}, hydrateChild), undefined)
    assert.equal(await synth.hydrate(value3, {}, hydrateChild), 123)
    assert.equal(await synth.hydrate(value4, {}, hydrateChild), 'string')
    assert.equal(await synth.hydrate(value5, {}, hydrateChild), value5)
  })

  test('should hydrate array with different value types', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const hydrateChild = async (key: string, value: any) => {
      if (typeof value === 'string') {
        return value.toLowerCase()
      }
      return value
    }

    const value = ['HELLO', 42, true, { nested: 'object' }]
    const result = await synth.hydrate(value, {}, hydrateChild)

    assert.equal(result[0], 'hello')
    assert.equal(result[1], 42)
    assert.equal(result[2], true)
    assert.deepEqual(result[3], { nested: 'object' })
  })

  test('should handle nested arrays in dehydrate', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const dehydrateChild = async (key: string, value: any) => {
      if (Array.isArray(value)) {
        return value.map((v) => v * 2)
      }
      return value
    }

    const target = [
      [1, 2],
      [3, 4],
    ]
    const [result, meta] = await synth.dehydrate(target, dehydrateChild)

    // dehydrateChild processes nested arrays
    assert.deepEqual(result, [
      [2, 4],
      [6, 8],
    ])
    assert.deepEqual(meta, {})
  })

  test('should handle nested arrays in hydrate', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const hydrateChild = async (key: string, value: any) => {
      if (Array.isArray(value)) {
        return value.map((v) => v / 2)
      }
      return value
    }

    const value = [
      [2, 4],
      [6, 8],
    ]
    const result = await synth.hydrate(value, {}, hydrateChild)

    // hydrateChild processes nested arrays
    assert.deepEqual(result, [
      [1, 2],
      [3, 4],
    ])
  })

  test('should preserve array indices during dehydrate', async ({ assert }) => {
    const { app } = await setupApp()
    const component = {}
    const context = new ComponentContext(component, false)
    const synth = new ArraySynth(context, 'path', app)

    const dehydrateChild = async (key: string, value: any) => value

    const target = ['a', 'b', 'c']
    target[10] = 'd' // Sparse array
    const [result, meta] = await synth.dehydrate(target, dehydrateChild)

    assert.equal(result[0], 'a')
    assert.equal(result[1], 'b')
    assert.equal(result[2], 'c')
    assert.equal(result[10], 'd')
    assert.deepEqual(meta, {})
  })
})
