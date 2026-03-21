import { test } from '@japa/runner'
import { DateSynth } from '../../src/synthesizers/date.js'
import ComponentContext from '../../src/component_context.js'
import { Component } from '../../src/component.js'
import { ApplicationService } from '@adonisjs/core/types'

test.group('DateSynth', () => {
  test('should have static key', ({ assert }) => {
    assert.equal(DateSynth.key, 'date')
    assert.equal(DateSynth.getKey(), 'date')
  })

  test('should match Date instances', ({ assert }) => {
    assert.isTrue(DateSynth.match(new Date()))
    assert.isTrue(DateSynth.match(new Date('2024-01-01')))
    assert.isTrue(DateSynth.match(new Date(0)))
  })

  test('should not match non-Date values', ({ assert }) => {
    assert.isFalse(DateSynth.match('2024-01-01'))
    assert.isFalse(DateSynth.match(1704067200000))
    assert.isFalse(DateSynth.match({ date: '2024-01-01' }))
    assert.isFalse(DateSynth.match(null))
    assert.isFalse(DateSynth.match(undefined))
    assert.isFalse(DateSynth.match([]))
  })

  test('should dehydrate Date to ISO string', async ({ assert }) => {
    const mockComponent = { getId: () => 'test-id', getName: () => 'test' } as Component
    const context = new ComponentContext(mockComponent)
    const synth = new DateSynth(context, 'date', {} as ApplicationService)

    const date = new Date('2024-06-15T10:30:00.000Z')
    const [value, meta] = await synth.dehydrate(date, async () => {})

    assert.equal(value, '2024-06-15T10:30:00.000Z')
    assert.deepEqual(meta, {})
  })

  test('should hydrate ISO string back to Date', async ({ assert }) => {
    const mockComponent = { getId: () => 'test-id', getName: () => 'test' } as Component
    const context = new ComponentContext(mockComponent)
    const synth = new DateSynth(context, 'date', {} as ApplicationService)

    const result = await synth.hydrate('2024-06-15T10:30:00.000Z', {}, async () => {})

    assert.instanceOf(result, Date)
    assert.equal(result.toISOString(), '2024-06-15T10:30:00.000Z')
  })

  test('should preserve date information through dehydrate/hydrate cycle', async ({ assert }) => {
    const mockComponent = { getId: () => 'test-id', getName: () => 'test' } as Component
    const context = new ComponentContext(mockComponent)
    const synth = new DateSynth(context, 'date', {} as ApplicationService)

    const originalDate = new Date('2024-12-25T00:00:00.000Z')

    const [dehydrated, meta] = await synth.dehydrate(originalDate, async () => {})
    const rehydrated = await synth.hydrate(dehydrated, meta, async () => {})

    assert.instanceOf(rehydrated, Date)
    assert.equal(rehydrated.getTime(), originalDate.getTime())
    assert.equal(rehydrated.toISOString(), originalDate.toISOString())
  })

  test('should handle epoch date (1970-01-01)', async ({ assert }) => {
    const mockComponent = { getId: () => 'test-id', getName: () => 'test' } as Component
    const context = new ComponentContext(mockComponent)
    const synth = new DateSynth(context, 'date', {} as ApplicationService)

    const epochDate = new Date(0)
    const [value] = await synth.dehydrate(epochDate, async () => {})

    assert.equal(value, '1970-01-01T00:00:00.000Z')

    const rehydrated = await synth.hydrate(value, {}, async () => {})
    assert.equal(rehydrated.getTime(), 0)
  })

  test('should handle dates with milliseconds', async ({ assert }) => {
    const mockComponent = { getId: () => 'test-id', getName: () => 'test' } as Component
    const context = new ComponentContext(mockComponent)
    const synth = new DateSynth(context, 'date', {} as ApplicationService)

    const dateWithMs = new Date('2024-06-15T10:30:45.123Z')
    const [value] = await synth.dehydrate(dateWithMs, async () => {})

    assert.equal(value, '2024-06-15T10:30:45.123Z')

    const rehydrated = await synth.hydrate(value, {}, async () => {})
    assert.equal(rehydrated.getMilliseconds(), 123)
  })

  test('should get instance key', async ({ assert }) => {
    const mockComponent = { getId: () => 'test-id', getName: () => 'test' } as Component
    const context = new ComponentContext(mockComponent)
    const synth = new DateSynth(context, 'date', {} as ApplicationService)

    assert.equal(synth.getKey(), 'date')
  })
})
