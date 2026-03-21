import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { test } from '@japa/runner'
import { Component } from '../../src/component.js'
import { CannotUpdateLockedPropertyException } from '../../src/features/support_locked_properties/cannot_update_locked_property_exception.js'
import Locked from '../../src/features/support_locked_properties/locked.js'
import { setupApp } from '../helpers.js'

class LockedTestComponent extends Component {
  lockedProperty = 'initial'
  otherProperty = 'other'

  async render() {
    return Promise.resolve('<div>Locked Test</div>')
  }
}

test.group('Locked Decorator', () => {
  test('should create Locked decorator with property name', async ({ assert }) => {
    const decorator = new Locked('count')

    assert.equal(decorator.name, 'count')
  })

  test('should throw exception when locked property is updated', async ({ assert }) => {
    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()
    const component = new LockedTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorator = new Locked('lockedProperty')
    decorator.__boot(component)

    assert.rejects(
      () => decorator.update('lockedProperty'),
      'Cannot update locked property: [lockedProperty]'
    )
  })

  test('should not throw when different property is updated', async ({ assert }) => {
    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()
    const component = new LockedTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorator = new Locked('lockedProperty')
    decorator.__boot(component)

    assert.doesNotReject(() => decorator.update('otherProperty'))
  })

  test('should not throw when property name does not match', async ({ assert }) => {
    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()
    const component = new LockedTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorator = new Locked('count')
    decorator.__boot(component)

    assert.doesNotReject(() => decorator.update('lockedProperty'))
  })

  test('should throw when deeply updating locked property (PHP parity)', async ({ assert }) => {
    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()
    const component = new LockedTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorator = new Locked('lockedProperty')
    decorator.__boot(component)

    assert.rejects(
      () => decorator.update('lockedProperty', 'lockedProperty.nested.key'),
      'Cannot update locked property: [lockedProperty]'
    )
  })

  test('should not throw when updating similar name (count vs count2, PHP parity)', async ({
    assert,
  }) => {
    const { app, router } = await setupApp()
    const ctx = new HttpContextFactory().create()
    const component = new LockedTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorator = new Locked('count')
    decorator.__boot(component)

    assert.doesNotReject(() => decorator.update('count2'))
  })
})

test.group('CannotUpdateLockedPropertyException', () => {
  test('should create exception with correct message', async ({ assert }) => {
    const exception = new CannotUpdateLockedPropertyException('count')

    assert.equal(exception.message, 'Cannot update locked property: [count]')
    assert.instanceOf(exception, Error)
  })

  test('should include property name in message', async ({ assert }) => {
    const exception1 = new CannotUpdateLockedPropertyException('email')
    const exception2 = new CannotUpdateLockedPropertyException('user.name')

    assert.include(exception1.message, 'email')
    assert.include(exception2.message, 'user.name')
  })
})
