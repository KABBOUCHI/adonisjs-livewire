import { test } from '@japa/runner'
import { DataStore, livewireContext, store as storeByComponent } from '../src/store.js'
import { BaseComponent } from '../src/base_component.js'
import ComponentContext from '../src/component_context.js'

test.group('DataStore', () => {
  test('should create DataStore with id', async ({ assert }) => {
    const dataStore = new DataStore('test-id')

    assert.equal(dataStore.id, 'test-id')
    assert.instanceOf(dataStore.lookup, WeakMap)
  })

  test('should set value for component', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    dataStore.set(component, 'key1', 'value1')

    assert.equal(dataStore.get(component, 'key1'), 'value1')
  })

  test('should get default empty array when key does not exist', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    const result = dataStore.get(component, 'non-existent')

    assert.deepEqual(result, [])
  })

  test('should check if key exists', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    assert.isFalse(dataStore.has(component, 'key1'))

    dataStore.set(component, 'key1', 'value1')

    assert.isTrue(dataStore.has(component, 'key1'))
    assert.isFalse(dataStore.has(component, 'key2'))
  })

  test('should push value to array', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    dataStore.push(component, 'items', 'item1')
    dataStore.push(component, 'items', 'item2')
    dataStore.push(component, 'items', 'item3')

    const result = dataStore.get(component, 'items')

    assert.deepEqual(result, ['item1', 'item2', 'item3'])
  })

  test('should push value with iKey (index key)', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    dataStore.push(component, 'items', 'value1', 'key1')
    dataStore.push(component, 'items', 'value2', 'key2')
    dataStore.push(component, 'items', 'value3', 'key1') // Overwrites key1

    const result = dataStore.get(component, 'items')

    assert.deepEqual(result, { key1: 'value3', key2: 'value2' })
  })

  test('should handle different value types', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    dataStore.set(component, 'string', 'text')
    dataStore.set(component, 'number', 42)
    dataStore.set(component, 'boolean', true)
    dataStore.set(component, 'object', { nested: 'value' })
    dataStore.set(component, 'array', [1, 2, 3])
    dataStore.set(component, 'null', null)

    assert.equal(dataStore.get(component, 'string'), 'text')
    assert.equal(dataStore.get(component, 'number'), 42)
    assert.equal(dataStore.get(component, 'boolean'), true)
    assert.deepEqual(dataStore.get(component, 'object'), { nested: 'value' })
    assert.deepEqual(dataStore.get(component, 'array'), [1, 2, 3])
    assert.isNull(dataStore.get(component, 'null'))
  })

  test('should isolate data between different components', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component1 = new BaseComponent()
    component1.__id = 'comp-1'
    component1.__name = 'TestComponent1'
    const component2 = new BaseComponent()
    component2.__id = 'comp-2'
    component2.__name = 'TestComponent2'

    dataStore.set(component1, 'key', 'value1')
    dataStore.set(component2, 'key', 'value2')

    assert.equal(dataStore.get(component1, 'key'), 'value1')
    assert.equal(dataStore.get(component2, 'key'), 'value2')
  })
})

test.group('livewireContext', () => {
  test('should create AsyncLocalStorage context', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const context = new ComponentContext({}, false)

    await livewireContext.run({ dataStore, context, features: [], ctx: {} as any }, async () => {
      const store = livewireContext.getStore()

      assert.isDefined(store)
      assert.equal(store?.dataStore.id, 'test-id')
      assert.equal(store?.context, context)
    })
  })

  test('should return undefined when no context is active', async ({ assert }) => {
    const store = livewireContext.getStore()

    assert.isUndefined(store)
  })

  test('should isolate contexts between different runs', async ({ assert }) => {
    const dataStore1 = new DataStore('id-1')
    const dataStore2 = new DataStore('id-2')
    const context1 = new ComponentContext({}, false)
    const context2 = new ComponentContext({}, false)

    await livewireContext.run(
      { dataStore: dataStore1, context: context1, features: [], ctx: {} as any },
      async () => {
        const store1 = livewireContext.getStore()
        assert.equal(store1?.dataStore.id, 'id-1')

        await livewireContext.run(
          { dataStore: dataStore2, context: context2, features: [], ctx: {} as any },
          async () => {
            const store2 = livewireContext.getStore()
            assert.equal(store2?.dataStore.id, 'id-2')
          }
        )

        // Should still be id-1 in outer context
        const store1Again = livewireContext.getStore()
        assert.equal(store1Again?.dataStore.id, 'id-1')
      }
    )
  })
})

test.group('store() function', () => {
  test('should return store interface for component', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    const context = new ComponentContext(component, false)

    await livewireContext.run({ dataStore, context, features: [], ctx: {} as any }, async () => {
      const storeInterface = storeByComponent(component)

      assert.isDefined(storeInterface.lookup)
      assert.isFunction(storeInterface.id)
      assert.isFunction(storeInterface.push)
      assert.isFunction(storeInterface.get)
      assert.isFunction(storeInterface.has)
      assert.isFunction(storeInterface.set)

      assert.equal(storeInterface.id(), 'test-id')
    })
  })

  test('should throw error when no context is active', async ({ assert }) => {
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    assert.throws(() => {
      storeByComponent(component).id()
    }, 'No store found')
  })

  test('should set value using store interface', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    const context = new ComponentContext(component, false)

    await livewireContext.run({ dataStore, context, features: [], ctx: {} as any }, async () => {
      const storeInterface = storeByComponent(component)

      storeInterface.set('key1', 'value1')

      assert.equal(storeInterface.get('key1'), 'value1')
      assert.isTrue(storeInterface.has('key1'))
    })
  })

  test('should push value using store interface', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    const context = new ComponentContext(component, false)

    await livewireContext.run({ dataStore, context, features: [], ctx: {} as any }, async () => {
      const storeInterface = storeByComponent(component)

      storeInterface.push('items', 'item1')
      storeInterface.push('items', 'item2')

      const result = storeInterface.get('items')
      assert.deepEqual(result, ['item1', 'item2'])
    })
  })

  test('should push value with iKey using store interface', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    const context = new ComponentContext(component, false)

    await livewireContext.run({ dataStore, context, features: [], ctx: {} as any }, async () => {
      const storeInterface = storeByComponent(component)

      storeInterface.push('items', 'value1', 'key1')
      storeInterface.push('items', 'value2', 'key2')

      const result = storeInterface.get('items')
      assert.deepEqual(result, { key1: 'value1', key2: 'value2' })
    })
  })

  test('should handle multiple components in same context', async ({ assert }) => {
    const dataStore = new DataStore('test-id')
    const component1 = new BaseComponent()
    component1.__id = 'comp-1'
    component1.__name = 'TestComponent1'
    const component2 = new BaseComponent()
    component2.__id = 'comp-2'
    component2.__name = 'TestComponent2'
    const context = new ComponentContext(component1, false)

    await livewireContext.run({ dataStore, context, features: [], ctx: {} as any }, async () => {
      const store1 = storeByComponent(component1)
      const store2 = storeByComponent(component2)

      store1.set('key', 'value1')
      store2.set('key', 'value2')

      assert.equal(store1.get('key'), 'value1')
      assert.equal(store2.get('key'), 'value2')
    })
  })
})
