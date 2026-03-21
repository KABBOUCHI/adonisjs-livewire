import { test } from '@japa/runner'
import ComponentContext from '../src/component_context.js'

test.group('ComponentContext', () => {
  test('should create ComponentContext with component and mounting flag', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, true)

    assert.equal(context.component, component)
    assert.isTrue(context.mounting)
    assert.deepEqual(context.effects, {})
    assert.deepEqual(context.memo, {})
  })

  test('should create ComponentContext with mounting false', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    assert.isFalse(context.mounting)
  })

  test('should add single effect', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addEffect('key1', 'value1')

    assert.equal(context.effects.key1, 'value1')
  })

  test('should add multiple effects via object', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addEffect({
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    })

    assert.equal(context.effects.key1, 'value1')
    assert.equal(context.effects.key2, 'value2')
    assert.equal(context.effects.key3, 'value3')
  })

  test('should push effect to array', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.pushEffect('items', 'item1')
    context.pushEffect('items', 'item2')

    assert.deepEqual(context.effects.items, ['item1', 'item2'])
  })

  test('should push effect with iKey (index key)', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.pushEffect('items', 'value1', 'key1')
    context.pushEffect('items', 'value2', 'key2')
    context.pushEffect('items', 'value3', 'key1') // Overwrites key1

    assert.deepEqual(context.effects.items, { key1: 'value3', key2: 'value2' })
  })

  test('should push effect with numeric iKey', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.pushEffect('items', 'value1', 0)
    context.pushEffect('items', 'value2', 1)

    assert.deepEqual(context.effects.items, { 0: 'value1', 1: 'value2' })
  })

  test('should add memo', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addMemo('key1', 'value1')

    assert.equal(context.memo.key1, 'value1')
  })

  test('should add multiple memos', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addMemo('key1', 'value1')
    context.addMemo('key2', 'value2')
    context.addMemo('key3', { nested: 'value' })

    assert.equal(context.memo.key1, 'value1')
    assert.equal(context.memo.key2, 'value2')
    assert.deepEqual(context.memo.key3, { nested: 'value' })
  })

  test('should push memo to array', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.pushMemo('items', 'item1')
    context.pushMemo('items', 'item2')
    context.pushMemo('items', 'item3')

    assert.deepEqual(context.memo.items, ['item1', 'item2', 'item3'])
  })

  test('should push memo with iKey (index key)', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.pushMemo('items', 'value1', 'key1')
    context.pushMemo('items', 'value2', 'key2')
    context.pushMemo('items', 'value3', 'key1') // Overwrites key1

    assert.deepEqual(context.memo.items, { key1: 'value3', key2: 'value2' })
  })

  test('should push memo with numeric iKey', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.pushMemo('items', 'value1', 0)
    context.pushMemo('items', 'value2', 1)

    assert.deepEqual(context.memo.items, { 0: 'value1', 1: 'value2' })
  })

  test('should handle different value types in effects', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addEffect('string', 'text')
    context.addEffect('number', 42)
    context.addEffect('boolean', true)
    context.addEffect('object', { nested: 'value' })
    context.addEffect('array', [1, 2, 3])
    context.addEffect('null', null)

    assert.equal(context.effects.string, 'text')
    assert.equal(context.effects.number, 42)
    assert.isTrue(context.effects.boolean)
    assert.deepEqual(context.effects.object, { nested: 'value' })
    assert.deepEqual(context.effects.array, [1, 2, 3])
    assert.isNull(context.effects.null)
  })

  test('should handle different value types in memo', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addMemo('string', 'text')
    context.addMemo('number', 42)
    context.addMemo('boolean', true)
    context.addMemo('object', { nested: 'value' })
    context.addMemo('array', [1, 2, 3])
    context.addMemo('null', null)

    assert.equal(context.memo.string, 'text')
    assert.equal(context.memo.number, 42)
    assert.isTrue(context.memo.boolean)
    assert.deepEqual(context.memo.object, { nested: 'value' })
    assert.deepEqual(context.memo.array, [1, 2, 3])
    assert.isNull(context.memo.null)
  })

  test('should overwrite effect when adding same key', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addEffect('key1', 'value1')
    context.addEffect('key1', 'value2')

    assert.equal(context.effects.key1, 'value2')
  })

  test('should overwrite memo when adding same key', async ({ assert }) => {
    const component = { id: 'comp-1', name: 'TestComponent' }
    const context = new ComponentContext(component, false)

    context.addMemo('key1', 'value1')
    context.addMemo('key1', 'value2')

    assert.equal(context.memo.key1, 'value2')
  })
})
