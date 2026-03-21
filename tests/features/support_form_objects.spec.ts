import { test } from '@japa/runner'
import vine from '@vinejs/vine'

import {
  beforeFirstDot,
  afterFirstDot,
  dataGet,
  dataSet,
  ucfirst,
} from '../../src/features/support_form_objects/utils.js'
import { validator } from '../../src/decorators/index.js'
import type { HasValidate } from '../../src/features/support_validation/types.js'
import { Form } from '../../src/form.js'
import {
  getFormClass,
  registerFormClass,
} from '../../src/features/support_form_objects/constants.js'
import {
  getFormMetadata,
  isFormProperty,
} from '../../src/features/support_form_objects/form_decorator.js'

/**
 * Test Form class using rules() method
 */
class TestForm extends Form {
  title: string = ''
  content: string = ''
  count: number = 0

  rules() {
    return vine.object({
      title: vine.string().minLength(3).maxLength(255),
      content: vine.string().minLength(10),
      count: vine.number().min(0),
    })
  }
}

// Register TestForm for hydration
registerFormClass('TestForm', TestForm as unknown as new () => Form)

/**
 * Test Form class using @validator decorators (same as Component)
 */
class DecoratorForm extends Form {
  @validator(() => vine.string().minLength(3).maxLength(100))
  declare title: HasValidate<string>

  @validator(() => vine.string().email())
  declare email: HasValidate<string>

  @validator(() => vine.number().min(0).max(100))
  declare age: HasValidate<number>
}

// Register DecoratorForm for hydration
registerFormClass('DecoratorForm', DecoratorForm as unknown as new () => Form)

/**
 * Simple form without validation
 */
class SimpleForm extends Form {
  name: string = ''
  email: string = ''
}

// Register SimpleForm manually
registerFormClass('SimpleForm', SimpleForm as unknown as new () => Form)

/**
 * Mock Component for testing Form integration
 */
class MockComponent {
  #errorBag: Record<string, string[]> = {}

  getErrorBag() {
    return { ...this.#errorBag }
  }

  setErrorBag(bag: Record<string, string[]>) {
    this.#errorBag = { ...bag }
  }

  resetErrorBag(field?: string | string[]) {
    if (!field) {
      this.#errorBag = {}
      return
    }
    const fields = Array.isArray(field) ? field : [field]
    for (const f of fields) {
      delete this.#errorBag[f]
    }
  }

  addError(field: string, message: string) {
    if (!this.#errorBag[field]) {
      this.#errorBag[field] = []
    }
    this.#errorBag[field].push(message)
  }

  addDecorator(_decorator: any) {
    // Mock: Component would normally store this
  }
}

test.group('Form Objects - Utils', () => {
  test('beforeFirstDot extracts portion before first dot', ({ assert }) => {
    assert.equal(beforeFirstDot('form.name'), 'form')
    assert.equal(beforeFirstDot('form.address.city'), 'form')
    assert.equal(beforeFirstDot('name'), 'name')
    assert.equal(beforeFirstDot(''), '')
  })

  test('afterFirstDot extracts portion after first dot', ({ assert }) => {
    assert.equal(afterFirstDot('form.name'), 'name')
    assert.equal(afterFirstDot('form.address.city'), 'address.city')
    assert.equal(afterFirstDot('name'), '')
    assert.equal(afterFirstDot(''), '')
  })

  test('dataGet retrieves nested values', ({ assert }) => {
    const obj = {
      form: {
        name: 'John',
        address: {
          city: 'NYC',
        },
      },
    }

    assert.equal(dataGet(obj, 'form.name'), 'John')
    assert.equal(dataGet(obj, 'form.address.city'), 'NYC')
    assert.equal(dataGet(obj, 'form'), obj.form)
    assert.isUndefined(dataGet(obj, 'form.missing'))
    assert.isUndefined(dataGet(null, 'form.name'))
  })

  test('dataSet sets nested values', ({ assert }) => {
    const obj: any = { form: { name: 'John' } }

    dataSet(obj, 'form.name', 'Jane')
    assert.equal(obj.form.name, 'Jane')

    dataSet(obj, 'form.address.city', 'NYC')
    assert.equal(obj.form.address.city, 'NYC')
  })

  test('ucfirst capitalizes first character', ({ assert }) => {
    assert.equal(ucfirst('title'), 'Title')
    assert.equal(ucfirst('TITLE'), 'TITLE')
    assert.equal(ucfirst(''), '')
    assert.equal(ucfirst('a'), 'A')
  })
})

test.group('Form Objects - Registry', () => {
  test('Form.register registers form class', ({ assert }) => {
    const FormClass = getFormClass('TestForm')
    assert.isDefined(FormClass)
    assert.equal(FormClass, TestForm)
  })

  test('getFormClass retrieves registered class', ({ assert }) => {
    const FormClass = getFormClass('SimpleForm')
    assert.isDefined(FormClass)
    assert.equal(FormClass, SimpleForm)
  })

  test('registerFormClass adds to registry', ({ assert }) => {
    class CustomForm extends Form {}
    registerFormClass('CustomForm', CustomForm as unknown as new () => Form)

    const FormClass = getFormClass('CustomForm')
    assert.isDefined(FormClass)
    assert.equal(FormClass, CustomForm)
  })
})

test.group('Form Objects - Form Class', () => {
  test('form returns all property names', ({ assert }) => {
    const formInstance = new TestForm()
    const props = formInstance.getPropertyNames()

    assert.includeMembers(props, ['title', 'content', 'count'])
    assert.notInclude(props, 'rules')
    assert.notInclude(props, 'validate')
  })

  test('form all() returns all data', ({ assert }) => {
    const formInstance = new TestForm()
    formInstance.title = 'Hello'
    formInstance.content = 'World content'
    formInstance.count = 5

    const data = formInstance.all()

    assert.deepEqual(data, {
      title: 'Hello',
      content: 'World content',
      count: 5,
    })
  })

  test('form only() returns specified fields', ({ assert }) => {
    const formInstance = new TestForm()
    formInstance.title = 'Hello'
    formInstance.content = 'World'
    formInstance.count = 5

    const data = formInstance.only(['title', 'count'])

    assert.deepEqual(data, {
      title: 'Hello',
      count: 5,
    })
  })

  test('form except() excludes specified fields', ({ assert }) => {
    const formInstance = new TestForm()
    formInstance.title = 'Hello'
    formInstance.content = 'World'
    formInstance.count = 5

    const data = formInstance.except(['count'])

    assert.deepEqual(data, {
      title: 'Hello',
      content: 'World',
    })
  })

  test('form fill() populates data', ({ assert }) => {
    const formInstance = new TestForm()

    formInstance.fill({
      title: 'New Title',
      content: 'New Content',
    })

    assert.equal(formInstance.title, 'New Title')
    assert.equal(formInstance.content, 'New Content')
    assert.equal(formInstance.count, 0) // unchanged
  })

  test('form reset() restores initial values', ({ assert }) => {
    const formInstance = new SimpleForm()
    formInstance.name = 'John'
    formInstance.email = 'john@example.com'

    // Simulate component setting initial values
    const component = new MockComponent()
    formInstance.setComponent(component as any, 'form')

    formInstance.name = 'Jane'
    formInstance.email = 'jane@example.com'

    formInstance.reset()

    assert.equal(formInstance.name, 'John')
    assert.equal(formInstance.email, 'john@example.com')
  })

  test('form reset() with specific fields', ({ assert }) => {
    const formInstance = new SimpleForm()
    formInstance.name = 'John'
    formInstance.email = 'john@example.com'

    const component = new MockComponent()
    formInstance.setComponent(component as any, 'form')

    formInstance.name = 'Jane'
    formInstance.email = 'jane@example.com'

    formInstance.reset('name')

    assert.equal(formInstance.name, 'John')
    assert.equal(formInstance.email, 'jane@example.com')
  })

  test('form resetExcept() resets all except specified', ({ assert }) => {
    const formInstance = new SimpleForm()
    formInstance.name = 'John'
    formInstance.email = 'john@example.com'

    const component = new MockComponent()
    formInstance.setComponent(component as any, 'form')

    formInstance.name = 'Jane'
    formInstance.email = 'jane@example.com'

    formInstance.resetExcept(['email'])

    assert.equal(formInstance.name, 'John')
    assert.equal(formInstance.email, 'jane@example.com')
  })

  test('form pull() gets value and resets', ({ assert }) => {
    const formInstance = new SimpleForm()
    formInstance.name = 'John'

    const component = new MockComponent()
    formInstance.setComponent(component as any, 'form')

    formInstance.name = 'Jane'

    const value = formInstance.pull('name')

    assert.equal(value, 'Jane')
    assert.equal(formInstance.name, 'John')
  })

  test('form hasProperty() checks existence', ({ assert }) => {
    const formInstance = new TestForm()

    assert.isTrue(formInstance.hasProperty('title'))
    assert.isTrue(formInstance.hasProperty('content'))
    assert.isFalse(formInstance.hasProperty('missing'))
    assert.isFalse(formInstance.hasProperty('rules'))
  })

  test('form getPropertyValue() and setPropertyValue()', ({ assert }) => {
    const formInstance = new TestForm()

    formInstance.setPropertyValue('title', 'Test')
    assert.equal(formInstance.getPropertyValue('title'), 'Test')
    assert.equal(formInstance.title, 'Test')
  })

  test('form toArray() is alias for all()', ({ assert }) => {
    const formInstance = new TestForm()
    formInstance.title = 'Hello'

    assert.deepEqual(formInstance.toArray(), formInstance.all())
  })
})

test.group('Form Objects - Proxy Error Bag', () => {
  test('form proxies errors to component error bag', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'myForm')

    formInstance.addError('name', 'Name is required')

    // Error should be stored in component with prefixed key
    const componentErrors = component.getErrorBag()
    assert.deepEqual(componentErrors['myForm.name'], ['Name is required'])
  })

  test('form getErrorBag() filters component errors by prefix', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'myForm')

    // Set errors on component with various prefixes
    component.setErrorBag({
      'myForm.name': ['Name error'],
      'myForm.email': ['Email error'],
      'otherForm.field': ['Other error'],
      'standalone': ['Not a form error'],
    })

    const formErrors = formInstance.getErrorBag()

    assert.deepEqual(formErrors, {
      name: ['Name error'],
      email: ['Email error'],
    })
  })

  test('form hasError() checks via component', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'form')

    assert.isFalse(formInstance.hasError('name'))

    formInstance.addError('name', 'Error')

    assert.isTrue(formInstance.hasError('name'))
    assert.isFalse(formInstance.hasError('email'))
  })

  test('form getError() returns field errors from component', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'form')

    formInstance.addError('name', 'Error 1')
    formInstance.addError('name', 'Error 2')

    assert.deepEqual(formInstance.getError('name'), ['Error 1', 'Error 2'])
    assert.deepEqual(formInstance.getError('missing'), [])
  })

  test('form resetErrorBag() clears errors on component', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'form')

    formInstance.addError('name', 'Error')
    formInstance.addError('email', 'Error')

    formInstance.resetErrorBag()

    assert.deepEqual(formInstance.getErrorBag(), {})
  })

  test('form resetErrorBag() clears specific field on component', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'form')

    formInstance.addError('name', 'Error')
    formInstance.addError('email', 'Error')

    formInstance.resetErrorBag('name')

    const errors = formInstance.getErrorBag()
    assert.isUndefined(errors.name)
    assert.deepEqual(errors.email, ['Error'])
  })
})

test.group('Form Objects - Validation with @validator decorator', () => {
  test('form with @validator validates successfully with valid data', async ({ assert }) => {
    const formInstance = new DecoratorForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'form')
    ;(formInstance as any).title = 'Valid Title'
    ;(formInstance as any).email = 'test@example.com'
    ;(formInstance as any).age = 25

    const data = await formInstance.validate()

    assert.deepEqual(data, {
      title: 'Valid Title',
      email: 'test@example.com',
      age: 25,
    })
  })

  test('form with @validator fails validation with invalid data', async ({ assert }) => {
    const formInstance = new DecoratorForm()
    const component = new MockComponent()

    const proxy = formInstance.setComponent(component as any, 'form')

    // Set invalid values directly on the form instance (proxy returns Form)
    formInstance.title = 'ab' // too short
    formInstance.email = 'not-an-email' // invalid email
    formInstance.age = -5 // negative

    try {
      await proxy.validate()
      assert.fail('Should have thrown validation error')
    } catch (_error: any) {
      // Errors should be set on component with prefixed keys
      const componentErrors = component.getErrorBag()
      console.log(componentErrors)
      assert.isTrue(Object.keys(componentErrors).length > 0, 'Component should have errors')

      // Form's getErrorBag should return unprefixed errors
      const formErrors = proxy.getErrorBag()
      assert.isTrue(Object.keys(formErrors).length > 0, 'Form should have errors')
    }
  })

  test('form getDecorators() returns @validator decorators', ({ assert }) => {
    const formInstance = new DecoratorForm()
    const decorators = formInstance.getDecorators()

    assert.equal(decorators.length, 3)

    const validatorDecorators = decorators.filter((d: any) => d.constructor.name === 'Validator')
    assert.equal(validatorDecorators.length, 3)
  })

  test('@validator decorators have correct property names', ({ assert }) => {
    const formInstance = new DecoratorForm()
    const decorators = formInstance.getDecorators()

    const propertyNames = decorators.map((d: any) => d.propertyName)
    assert.includeMembers(propertyNames, ['title', 'email', 'age'])
  })

  test('form with rules() method validates successfully', async ({ assert }) => {
    const formInstance = new TestForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'form')

    formInstance.title = 'Valid Title'
    formInstance.content = 'This is valid content that is long enough'
    formInstance.count = 5

    const data = await formInstance.validate()

    assert.deepEqual(data, {
      title: 'Valid Title',
      content: 'This is valid content that is long enough',
      count: 5,
    })
  })

  test('form without validation rules returns all data', async ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    formInstance.setComponent(component as any, 'form')

    formInstance.name = 'John'
    formInstance.email = 'john@example.com'

    const data = await formInstance.validate()

    assert.deepEqual(data, {
      name: 'John',
      email: 'john@example.com',
    })
  })
})

test.group('Form Objects - @form() decorator registry', () => {
  test('registerFormClass adds form to registry', ({ assert }) => {
    class AnotherForm extends Form {
      field: string = ''
    }

    registerFormClass('AnotherForm', AnotherForm as unknown as new () => any)

    const FormClass = getFormClass('AnotherForm')
    assert.isDefined(FormClass)
    assert.equal(FormClass, AnotherForm)
  })

  test('getFormMetadata returns empty for non-decorated class', ({ assert }) => {
    class PlainClass {}
    const instance = new PlainClass()
    const metadata = getFormMetadata(instance)

    assert.deepEqual(metadata, [])
  })

  test('isFormProperty returns false for non-form properties', ({ assert }) => {
    class PlainClass {
      prop: string = ''
    }
    const instance = new PlainClass()

    assert.isFalse(isFormProperty(instance, 'prop'))
    assert.isFalse(isFormProperty(instance, 'nonExistent'))
  })
})

test.group('Form Objects - Proxy delegation', () => {
  test('setComponent returns a Proxy', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    const proxy = formInstance.setComponent(component as any, 'form')

    // The proxy should be a Form (check it has Form methods)
    assert.isFunction(proxy.all)
    assert.isFunction(proxy.getPropertyNames)
  })

  test('proxy allows accessing form properties', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    const proxy = formInstance.setComponent(component as any, 'form')
    ;(proxy as any).name = 'John'
    assert.equal((proxy as any).name, 'John')
  })

  test('proxy allows calling form methods', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    const proxy = formInstance.setComponent(component as any, 'form')
    ;(proxy as any).name = 'John'
    ;(proxy as any).email = 'john@example.com'

    const data = proxy.all()
    assert.deepEqual(data, {
      name: 'John',
      email: 'john@example.com',
    })
  })

  test('proxy getComponent() returns component', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    const proxy = formInstance.setComponent(component as any, 'form')

    assert.equal(proxy.getComponent(), component)
  })

  test('proxy getPropertyName() returns property name', ({ assert }) => {
    const formInstance = new SimpleForm()
    const component = new MockComponent()

    const proxy = formInstance.setComponent(component as any, 'myFormProp')

    assert.equal(proxy.getPropertyName(), 'myFormProp')
  })
})
