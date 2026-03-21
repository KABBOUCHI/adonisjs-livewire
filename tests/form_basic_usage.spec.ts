import { test } from '@japa/runner'
import vine from '@vinejs/vine'

import { Form } from '../src/form.js'
import { form, validator } from '../src/decorators/index.js'
import type { HasValidate } from '../src/features/support_validation/types.js'
import { Component } from '../src/component.js'
import { setupApp, setupFakeAdonisProjectWithoutMacro } from './helpers.js'
import { SessionMiddlewareFactory } from '@adonisjs/session/factories'
import { HttpContextFactory } from '@adonisjs/http-server/factories'
import { LivewireFactory } from '../factories/livewire_factory.js'
import { LivewireHelper } from '../src/plugins/japa/testing.js'

/**
 * ContactForm with validation using @validator decorators
 */
class ContactForm extends Form {
  @validator(() => vine.string().minLength(2).maxLength(100))
  declare name: HasValidate<string>

  @validator(() => vine.string().email())
  declare email: HasValidate<string>

  @validator(() => vine.string().minLength(10).maxLength(500))
  declare message: HasValidate<string>

  async store() {
    const { email, message, name } = await this.validate()
    this.ctx.session.flash('success', 'Form submitted successfully!')
    this.ctx.logger.info(`Storing contact form: ${name}, ${email}, ${message}`)
  }
}

/**
 * ContactPageComponent using the form
 */
class ContactPageComponent extends Component {
  @form()
  declare form: ContactForm

  submitted = false
  successMessage = ''

  async submit() {
    await this.form.store()
    this.submitted = true
    this.successMessage = 'Your message has been sent successfully!'
  }

  async render(): Promise<string> {
    return `
      <div>
        <h1>Contact Page</h1>
        <form wire:submit="submit">
          <input wire:model="form.name" placeholder="Name" />
          <input wire:model="form.email" placeholder="Email" />
          <textarea wire:model="form.message" placeholder="Message"></textarea>
          <button type="submit">Send</button>
        </form>
        @if(submitted)
          <p>Thank you!</p>
        @endif
      </div>
    `
  }
}

// ============================================================================
// Basic Usage Tests
// ============================================================================

test.group('Form - Basic Usage', (group) => {
  group.each.setup(async ($test) => {
    await setupFakeAdonisProjectWithoutMacro($test)
    const { app, router } = await setupApp([
      {
        file: () => import('@adonisjs/session/session_provider'),
        environment: ['web', 'test'],
      },
      {
        file: () => import('../providers/livewire_provider.js'),
        environment: ['test', 'web'],
      },
    ])
    const ctx = new HttpContextFactory().create()

    const sessionMiddleware = await new SessionMiddlewareFactory().create()
    await sessionMiddleware.handle(ctx, async () => {})

    const livewire = new LivewireFactory(app).merge({ ctx, router }).create()

    app.container.bind('livewire', () => livewire)
    $test.context.livewire = new LivewireHelper(app, router, ctx)

    return () => app.terminate()
  })

  test('conditionally renders thank you message based on submitted state', async ({ livewire }) => {
    await livewire.test(ContactPageComponent).mount().assertDontSee('Thank you!')
    await livewire.test(ContactPageComponent).mount().set('submitted', true).assertSee('Thank you!')
  })

  test('can set form properties via wire:model syntax', async ({ livewire }) => {
    await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'John Doe')
      .set('form.email', 'john@example.com')
      .set('form.message', 'Hello, this is a test message!')
      .assertSet('form.name', 'John Doe')
      .assertSet('form.email', 'john@example.com')
      .assertSet('form.message', 'Hello, this is a test message!')
  })

  test('can call form methods through component', async ({ livewire }) => {
    await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'Jane Doe')
      .set('form.email', 'jane@example.com')
      .set('form.message', 'This is a valid test message')
      .call('submit')
      .assertSet('submitted', true)
  })

  test('form validation fails with invalid data', async ({ livewire, assert }) => {
    const testable = await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'A') // Too short (min 2)
      .set('form.email', 'invalid-email') // Invalid email
      .set('form.message', 'Short') // Too short (min 10)

    try {
      await testable.call('submit')
      assert.fail('Should have thrown validation error')
    } catch (error: any) {
      assert.exists(error.messages)
    }
  })

  test('form only() returns specified fields with correct types', async ({ livewire, assert }) => {
    const testable = await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'John')
      .set('form.email', 'john@example.com')
      .set('form.message', 'This is a message')

    const component = testable.instance() as ContactPageComponent
    const onlyData = component.form.only(['name', 'email'])

    assert.properties(onlyData, ['name', 'email'])
    assert.notProperty(onlyData, 'message')
    assert.equal(onlyData.name, 'John')
    assert.equal(onlyData.email, 'john@example.com')
  })

  test('form except() excludes specified fields', async ({ livewire, assert }) => {
    const testable = await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'John')
      .set('form.email', 'john@example.com')
      .set('form.message', 'This is a message')

    const component = testable.instance() as ContactPageComponent
    const exceptData = component.form.except(['message'])

    assert.properties(exceptData, ['name', 'email'])
    assert.notProperty(exceptData, 'message')
  })

  test('form all() returns all properties', async ({ livewire, assert }) => {
    const testable = await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'John')
      .set('form.email', 'john@example.com')
      .set('form.message', 'This is a message')

    const component = testable.instance() as ContactPageComponent
    const allData = component.form.all()

    assert.properties(allData, ['name', 'email', 'message'])
    assert.equal(allData.name, 'John')
    assert.equal(allData.email, 'john@example.com')
    assert.equal(allData.message, 'This is a message')
  })

  test('form fill() populates multiple properties', async ({ livewire, assert }) => {
    const testable = await livewire.test(ContactPageComponent).mount()

    const component = testable.instance() as ContactPageComponent
    component.form.fill({
      name: 'Filled Name',
      email: 'filled@example.com',
      message: 'Filled message content',
    })

    assert.equal(component.form.name, 'Filled Name')
    assert.equal(component.form.email, 'filled@example.com')
    assert.equal(component.form.message, 'Filled message content')
  })

  test('form reset() restores initial values', async ({ livewire, assert }) => {
    const testable = await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'Changed Name')
      .set('form.email', 'changed@example.com')

    const component = testable.instance() as ContactPageComponent

    // Store current values before reset
    assert.equal(component.form.name, 'Changed Name')

    // Reset the form
    component.form.reset()

    // Values should be back to initial (empty strings from @validator declare)
    assert.equal(component.form.name, undefined)
    assert.equal(component.form.email, undefined)
  })

  test('form hasProperty() correctly identifies properties', async ({ livewire, assert }) => {
    const testable = await livewire.test(ContactPageComponent).mount()

    const component = testable.instance() as ContactPageComponent

    assert.isTrue(component.form.hasProperty('name'))
    assert.isTrue(component.form.hasProperty('email'))
    assert.isTrue(component.form.hasProperty('message'))
    assert.isFalse(component.form.hasProperty('nonexistent'))
    assert.isFalse(component.form.hasProperty('validate')) // method, not property
  })

  test('component renders with form data', async ({ livewire }) => {
    await livewire
      .test(ContactPageComponent)
      .mount()
      .assertSee('Contact Page')
      .assertSee('wire:submit="submit"', false)
      .assertSee('wire:model="form.name"', false)
  })

  test('component shows success message after submit', async ({ livewire }) => {
    await livewire
      .test(ContactPageComponent)
      .mount()
      .set('form.name', 'Test User')
      .set('form.email', 'test@example.com')
      .set('form.message', 'This is a valid test message')
      .call('submit')
      .assertSee('Thank you!')
  })
})
