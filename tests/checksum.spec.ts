import { test } from '@japa/runner'
import { Checksum } from '../src/checksum.js'

test.group('Checksum', () => {
  test('should generate checksum for snapshot', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot = { name: 'test', id: '123', data: { count: 5 } }

    const result = checksum.generate(snapshot)

    assert.isString(result)
    assert.lengthOf(result, 64) // SHA256 produces 64 hex characters
  })

  test('should generate same checksum for same snapshot', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot = { name: 'test', id: '123', data: { count: 5 } }

    const result1 = checksum.generate(snapshot)
    const result2 = checksum.generate(snapshot)

    assert.equal(result1, result2)
  })

  test('should generate different checksum for different snapshots', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot1 = { name: 'test', id: '123', data: { count: 5 } }
    const snapshot2 = { name: 'test', id: '123', data: { count: 6 } }

    const result1 = checksum.generate(snapshot1)
    const result2 = checksum.generate(snapshot2)

    assert.notEqual(result1, result2)
  })

  test('should generate different checksum with different keys', async ({ assert }) => {
    const checksum1 = new Checksum('secret-key-1')
    const checksum2 = new Checksum('secret-key-2')
    const snapshot = { name: 'test', id: '123', data: { count: 5 } }

    const result1 = checksum1.generate(snapshot)
    const result2 = checksum2.generate(snapshot)

    assert.notEqual(result1, result2)
  })

  test('should verify valid checksum', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot = { name: 'test', id: '123', data: { count: 5 } }
    const generatedChecksum = checksum.generate(snapshot)

    const snapshotWithChecksum = { ...snapshot, checksum: generatedChecksum }

    assert.doesNotThrow(() => {
      checksum.verify(snapshotWithChecksum)
    })
  })

  test('should remove checksum from snapshot before verification', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot = { name: 'test', id: '123', data: { count: 5 } }
    const generatedChecksum = checksum.generate(snapshot)

    const snapshotWithChecksum = { ...snapshot, checksum: generatedChecksum }

    checksum.verify(snapshotWithChecksum)

    // Checksum should be removed from snapshot
    assert.isUndefined(snapshotWithChecksum.checksum)
  })

  test('should throw CorruptComponentPayloadException for invalid checksum', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot = { name: 'test', id: '123', data: { count: 5 } }
    const invalidChecksum = 'invalid-checksum-value'

    const snapshotWithInvalidChecksum = { ...snapshot, checksum: invalidChecksum }

    try {
      checksum.verify(snapshotWithInvalidChecksum)
      assert.fail('Expected CorruptComponentPayloadException to be thrown')
    } catch (error: any) {
      assert.equal(error.name, 'CorruptComponentPayloadException')
      assert.include(error.message, 'Livewire encountered corrupt data')
    }
  })

  test('should throw CorruptComponentPayloadException when checksum is missing', async ({
    assert,
  }) => {
    const checksum = new Checksum('secret-key')
    const snapshot = { name: 'test', id: '123', data: { count: 5 } }

    // Create snapshot without checksum
    const snapshotWithoutChecksum = { ...snapshot }

    try {
      checksum.verify(snapshotWithoutChecksum)
      assert.fail('Expected CorruptComponentPayloadException to be thrown')
    } catch (error: any) {
      assert.equal(error.name, 'CorruptComponentPayloadException')
    }
  })

  test('should handle different data types in snapshot', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot1 = { name: 'test', id: '123', data: { count: 5 } }
    const snapshot2 = { name: 'test', id: '123', data: { items: [1, 2, 3] } }
    const snapshot3 = { name: 'test', id: '123', data: { nested: { deep: 'value' } } }
    const snapshot4 = { name: 'test', id: '123', data: null }
    const snapshot5 = { name: 'test', id: '123', data: { bool: true, num: 42, str: 'text' } }

    const result1 = checksum.generate(snapshot1)
    const result2 = checksum.generate(snapshot2)
    const result3 = checksum.generate(snapshot3)
    const result4 = checksum.generate(snapshot4)
    const result5 = checksum.generate(snapshot5)

    // All should be valid checksums
    assert.isString(result1)
    assert.isString(result2)
    assert.isString(result3)
    assert.isString(result4)
    assert.isString(result5)

    // All should be different
    assert.notEqual(result1, result2)
    assert.notEqual(result2, result3)
    assert.notEqual(result3, result4)
    assert.notEqual(result4, result5)
  })

  test('should handle empty snapshot', async ({ assert }) => {
    const checksum = new Checksum('secret-key')
    const snapshot = {}

    const result = checksum.generate(snapshot)
    assert.isString(result)
    assert.lengthOf(result, 64)

    const snapshotWithChecksum = { ...snapshot, checksum: result }
    assert.doesNotThrow(() => {
      checksum.verify(snapshotWithChecksum)
    })
  })
})
