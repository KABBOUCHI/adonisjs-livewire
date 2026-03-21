import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import vine from '@vinejs/vine'
import Validator from '../../src/features/support_validation/validator.js'
import { validator } from '../../src/decorators/index.js'
import type { HasValidate } from '../../src/features/support_validation/types.js'

/**
 * Test component for validation
 */
class ValidationTestComponent extends Component {
  name = ''
  email = ''
  age = 0

  async render() {
    return Promise.resolve('<div>Validation Test</div>')
  }
}

test.group('Support Validation Feature', () => {
  test('should set error bag', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.setErrorBag({
          email: ['Email is required'],
          name: ['Name must be at least 3 characters'],
        })

        const errorBag = component.getErrorBag()
        assert.deepEqual(errorBag.email, ['Email is required'])
        assert.deepEqual(errorBag.name, ['Name must be at least 3 characters'])
      }
    )
  })

  test('should set error bag with single string messages', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.setErrorBag({
          email: 'Email is invalid',
          name: 'Name is required',
        })

        const errorBag = component.getErrorBag()
        assert.deepEqual(errorBag.email, ['Email is invalid'])
        assert.deepEqual(errorBag.name, ['Name is required'])
      }
    )
  })

  test('should get empty error bag when no errors', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const errorBag = component.getErrorBag()
        assert.deepEqual(errorBag, {})
      }
    )
  })

  test('should add error to field', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.addError('email', 'Email is required')
        component.addError('email', 'Email must be valid')

        const errorBag = component.getErrorBag()
        assert.deepEqual(errorBag.email, ['Email is required', 'Email must be valid'])
      }
    )
  })

  test('should reset all errors', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.setErrorBag({
          email: ['Email is required'],
          name: ['Name is required'],
        })

        component.resetErrorBag()

        const errorBag = component.getErrorBag()
        assert.deepEqual(errorBag, {})
      }
    )
  })

  test('should reset specific field errors', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.setErrorBag({
          email: ['Email is required'],
          name: ['Name is required'],
        })

        component.resetErrorBag('email')

        const errorBag = component.getErrorBag()
        assert.deepEqual(errorBag.email, undefined)
        assert.deepEqual(errorBag.name, ['Name is required'])
      }
    )
  })

  test('should reset multiple field errors', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.setErrorBag({
          email: ['Email is required'],
          name: ['Name is required'],
          age: ['Age is required'],
        })

        component.resetErrorBag(['email', 'name'])

        const errorBag = component.getErrorBag()
        assert.deepEqual(errorBag.email, undefined)
        assert.deepEqual(errorBag.name, undefined)
        assert.deepEqual(errorBag.age, ['Age is required'])
      }
    )
  })

  test('should check if field has error', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        assert.isFalse(component.hasError('email'))

        component.addError('email', 'Email is required')
        assert.isTrue(component.hasError('email'))
      }
    )
  })

  test('should get errors for field', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.addError('email', 'Email is required')
        component.addError('email', 'Email must be valid')

        const errors = component.getError('email')
        assert.deepEqual(errors, ['Email is required', 'Email must be valid'])
      }
    )
  })

  test('should get first error for field', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.addError('email', 'Email is required')
        component.addError('email', 'Email must be valid')

        const firstError = component.getFirstError('email')
        assert.equal(firstError, 'Email is required')
      }
    )
  })

  test('should return undefined for first error when no errors', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const firstError = component.getFirstError('email')
        assert.isUndefined(firstError)
      }
    )
  })

  test('should validate using Vine.js schema', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })
    component.name = 'John'
    component.email = 'john@example.com'
    component.age = 25

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const schema = vine.object({
          name: vine.string().minLength(3),
          email: vine.string().email(),
          age: vine.number().min(18),
        })

        const validated = await component.validateUsing(schema)

        assert.equal(validated.name, 'John')
        assert.equal(validated.email, 'john@example.com')
        assert.equal(validated.age, 25)
        assert.deepEqual(component.getErrorBag(), {})
      }
    )
  })

  test('should set error bag when validation fails', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })
    component.name = 'Jo' // Too short
    component.email = 'invalid-email' // Invalid email
    component.age = 15 // Too young

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const schema = vine.object({
          name: vine.string().minLength(3),
          email: vine.string().email(),
          age: vine.number().min(18),
        })

        try {
          await component.validateUsing(schema)
          assert.fail('Should have thrown validation error')
        } catch (error: any) {
          const errorBag = component.getErrorBag()
          assert.isTrue(Object.keys(errorBag).length > 0)
          // Should have errors for name, email, and age
        }
      }
    )
  })

  test('should clear errors when validation succeeds after failure', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        // First validation fails
        component.name = 'Jo'
        const schema = vine.object({
          name: vine.string().minLength(3),
        })

        try {
          await component.validateUsing(schema)
        } catch {
          // Expected to fail
        }

        assert.isTrue(component.hasError('name'))

        // Fix the error and validate again
        component.name = 'John'
        await component.validateUsing(schema)

        assert.isFalse(component.hasError('name'))
        assert.deepEqual(component.getErrorBag(), {})
      }
    )
  })

  test('should validate using rules() method', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()

    class RulesComponent extends Component {
      name = 'John'
      email = 'john@example.com'

      rules() {
        return vine.object({
          name: vine.string().minLength(3),
          email: vine.string().email(),
        })
      }

      async render() {
        return Promise.resolve('<div>Rules Test</div>')
      }
    }

    const component = new RulesComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const validated = await component.validate()

        assert.equal(validated.name, 'John')
        assert.equal(validated.email, 'john@example.com')
      }
    )
  })

  test('should throw error when no schema found for validate()', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        try {
          await component.validate()
          assert.fail('Should have thrown error')
        } catch (error: any) {
          assert.include(
            error.message,
            'No validation schema found. Either implement a rules() method or use @validator decorators on properties.'
          )
        }
      }
    )
  })

  test('should validate with custom data parameter', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ValidationTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const schema = vine.object({
          name: vine.string().minLength(3),
          email: vine.string().email(),
        })

        const customData = {
          name: 'Jane',
          email: 'jane@example.com',
        }

        const validated = await component.validateUsing(schema, customData)

        assert.equal(validated.name, 'Jane')
        assert.equal(validated.email, 'jane@example.com')
      }
    )
  })
})

test.group('Validator Decorator', () => {
  test('should create Validator decorator with propertyName and schemaFactory', async ({
    assert,
  }) => {
    const schemaFactory = () => vine.string().minLength(3)
    const decorator = new Validator('name', schemaFactory)

    assert.equal(decorator.propertyName, 'name')
    assert.equal(decorator.schemaFactory, schemaFactory)
    assert.isTrue(decorator.onUpdate) // default value
  })

  test('should create Validator decorator with onUpdate false', async ({ assert }) => {
    const schemaFactory = () => vine.string().email()
    const decorator = new Validator('email', schemaFactory, false)

    assert.equal(decorator.propertyName, 'email')
    assert.isFalse(decorator.onUpdate)
  })

  test('should call schemaFactory and return schema', async ({ assert }) => {
    let factoryCalled = false
    const schemaFactory = () => {
      factoryCalled = true
      return vine.string().minLength(5)
    }
    const decorator = new Validator('username', schemaFactory)

    const schema = decorator.schemaFactory()

    assert.isTrue(factoryCalled)
    assert.isDefined(schema)
  })

  test('should work with complex schemas', async ({ assert }) => {
    const schemaFactory = () =>
      vine.object({
        street: vine.string(),
        city: vine.string(),
        zip: vine.string().fixedLength(5),
      })

    const decorator = new Validator('address', schemaFactory)

    assert.equal(decorator.propertyName, 'address')
    assert.isDefined(decorator.schemaFactory())
  })
})

test.group('Validator Decorator - Use @validator', () => {
  test('should register validator via @validator decorator', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      @validator(() => vine.string().minLength(3))
      declare name: HasValidate<string>

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorators = component.getDecorators()
    assert.lengthOf(decorators, 1)

    const dec = decorators[0] as Validator
    assert.equal(dec.propertyName, 'name')
    assert.isTrue(dec.onUpdate)
  })

  test('should respect onUpdate option in @validator', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      @validator(() => vine.string().email(), { onUpdate: false })
      declare email: HasValidate<string>

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorators = component.getDecorators()
    const dec = decorators[0] as Validator

    assert.equal(dec.propertyName, 'email')
    assert.isFalse(dec.onUpdate)
  })

  test('should support multiple @validator decorators on same component', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    class DecoratedComponent extends Component {
      @validator(() => vine.string().minLength(2))
      declare name: HasValidate<string>

      @validator(() => vine.string().email())
      declare email: HasValidate<string>

      @validator(() => vine.number().min(18))
      declare age: HasValidate<number>

      async render() {
        return Promise.resolve('<div>Decorated</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new DecoratedComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const decorators = component.getDecorators()
    assert.lengthOf(decorators, 3)

    const propertyNames = decorators.map((d) => (d as Validator).propertyName)
    assert.includeMembers(propertyNames, ['name', 'email', 'age'])
  })
})
