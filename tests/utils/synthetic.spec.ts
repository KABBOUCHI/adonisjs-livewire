import { test } from '@japa/runner'
import { isSyntheticTuple } from '../../src/utils/synthetic.js'

test.group('isSyntheticTuple', () => {
  test('should return true for array with 2 elements and second has property s', async ({
    assert,
  }) => {
    const data = [123, { s: 'model' }]

    const result = isSyntheticTuple(data)

    assert.isTrue(result)
  })

  test('should return true for array with different s property values', async ({ assert }) => {
    assert.isTrue(isSyntheticTuple([123, { s: 'model' }]))
    assert.isTrue(isSyntheticTuple([123, { s: 'collection' }]))
    assert.isTrue(isSyntheticTuple([123, { s: 'array' }]))
    assert.isTrue(isSyntheticTuple([123, { s: '' }]))
    assert.isTrue(isSyntheticTuple([123, { s: 0 }]))
    assert.isTrue(isSyntheticTuple([123, { s: false }]))
    assert.isTrue(isSyntheticTuple([123, { s: null }]))
  })

  test('should return false for array with 2 elements but second does not have property s', async ({
    assert,
  }) => {
    const data1 = [123, { other: 'property' }]
    const data2 = [123, { s: undefined }] // s exists but is undefined
    const data3 = [123, {}]

    assert.isFalse(isSyntheticTuple(data1))
    assert.isFalse(isSyntheticTuple(data2))
    assert.isFalse(isSyntheticTuple(data3))
  })

  test('should return false for array with less than 2 elements', async ({ assert }) => {
    assert.isFalse(isSyntheticTuple([]))
    assert.isFalse(isSyntheticTuple([123]))
  })

  test('should return false for array with more than 2 elements', async ({ assert }) => {
    const data = [123, { s: 'model' }, 'extra']

    assert.isFalse(isSyntheticTuple(data))
  })

  test('should return false for normal arrays', async ({ assert }) => {
    assert.isFalse(isSyntheticTuple([1, 2, 3]))
    assert.isFalse(isSyntheticTuple(['a', 'b', 'c']))
    assert.isFalse(isSyntheticTuple([{ a: 1 }, { b: 2 }]))
  })

  test('should return false for non-arrays', async ({ assert }) => {
    assert.isFalse(isSyntheticTuple(null))
    assert.isFalse(isSyntheticTuple(undefined))
    assert.isFalse(isSyntheticTuple(123))
    assert.isFalse(isSyntheticTuple('string'))
    assert.isFalse(isSyntheticTuple(true))
    assert.isFalse(isSyntheticTuple(false))
    assert.isFalse(isSyntheticTuple({}))
    assert.isFalse(isSyntheticTuple({ s: 'model' }))
  })

  test('should return false for object with s property but not an array', async ({ assert }) => {
    const data = { s: 'model', value: 123 }

    assert.isFalse(isSyntheticTuple(data))
  })

  test('should handle edge cases with second element', async ({ assert }) => {
    // Second element is null
    assert.isFalse(isSyntheticTuple([123, null]))

    // Second element is undefined
    assert.isFalse(isSyntheticTuple([123, undefined]))

    // Second element is a primitive
    assert.isFalse(isSyntheticTuple([123, 'string']))
    assert.isFalse(isSyntheticTuple([123, 456]))
    assert.isFalse(isSyntheticTuple([123, true]))

    // Second element is an array
    assert.isFalse(isSyntheticTuple([123, [1, 2, 3]]))
  })

  test('should return true when second element has s property even with other properties', async ({
    assert,
  }) => {
    const data = [123, { s: 'model', other: 'property', nested: { value: 1 } }]

    assert.isTrue(isSyntheticTuple(data))
  })

  test('should handle first element of any type', async ({ assert }) => {
    assert.isTrue(isSyntheticTuple([123, { s: 'model' }]))
    assert.isTrue(isSyntheticTuple(['string', { s: 'model' }]))
    assert.isTrue(isSyntheticTuple([{ nested: 'object' }, { s: 'model' }]))
    assert.isTrue(isSyntheticTuple([[1, 2, 3], { s: 'model' }]))
    assert.isTrue(isSyntheticTuple([null, { s: 'model' }]))
    assert.isTrue(isSyntheticTuple([undefined, { s: 'model' }]))
  })
})
