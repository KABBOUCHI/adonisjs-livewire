import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp, setupFakeAdonisProject } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import { SupportRedirects } from '../../src/features/support_redirects/support_redirects.js'
import { SessionMiddlewareFactory } from '@adonisjs/session/factories'

class RedirectsTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>Redirects Test</div>')
  }
}

test.group('HandlesRedirects', () => {
  test('should add redirect URL to store (PHP parity: set, last wins)', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        assert.equal(store(component).get('redirect'), '/dashboard')
      }
    )
  })

  test('should add redirect with navigate flag', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard', true)

        assert.equal(store(component).get('redirect'), '/dashboard')
        assert.isTrue(store(component).has('redirectUsingNavigate'))
      }
    )
  })

  test('should not add navigate flag when navigate is false', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard', false)

        assert.equal(store(component).get('redirect'), '/dashboard')
        assert.isFalse(store(component).has('redirectUsingNavigate'))
      }
    )
  })

  test('should skip render when renderOnRedirect is false', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Set renderOnRedirect to false
    app.config.set('livewire.renderOnRedirect', false)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        assert.isTrue(store(component).has('skipRender'))
      }
    )
  })

  test('should not skip render when renderOnRedirect is true', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    // Set renderOnRedirect to true
    app.config.set('livewire.renderOnRedirect', true)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        assert.isFalse(store(component).has('skipRender'))
      }
    )
  })

  test('should handle multiple redirects (PHP parity: last wins)', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/first')
        component.redirect('/second')

        assert.equal(store(component).get('redirect'), '/second')
      }
    )
  })

  test('redirectRoute resolves URL and stores redirect (PHP parity)', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    await setupFakeAdonisProject()

    router
      .get('/dashboard', () => {
        return 'dashboard here!'
      })
      .as('dashboard')

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirectRoute('dashboard')

        const url = store(component).get('redirect')
        assert.isTrue(typeof url === 'string' && url.length > 0)
        assert.include(url, 'dashboard')
      }
    )
  })

  test('redirectIntended uses default when no intended URL (PHP parity)', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()

    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({
      ctx: ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    const middleware = await new SessionMiddlewareFactory().create()

    middleware.handle(ctx, async () => {
      await livewireContext.run(
        { dataStore, context: componentContext, features: [], ctx },
        async () => {
          component.redirectIntended('/fallback')

          assert.equal(store(component).get('redirect'), '/fallback')
        }
      )
    })
  })
})

test.group('SupportRedirects', () => {
  test('should add redirect effect when redirect exists in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.equal(componentContext.effects.redirect, '/dashboard')
      }
    )
  })

  test('should add redirectUsingNavigate effect when flag is set', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard', true)

        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.equal(componentContext.effects.redirect, '/dashboard')
        assert.isTrue(componentContext.effects.redirectUsingNavigate)
      }
    )
  })

  test('should not add effects when no redirect in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.isUndefined(componentContext.effects.redirect)
        assert.isUndefined(componentContext.effects.redirectUsingNavigate)
      }
    )
  })

  test('should use last redirect URL when multiple redirects exist (PHP parity)', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, router, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/first')
        component.redirect('/second')

        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.equal(componentContext.effects.redirect, '/second')
      }
    )
  })
})
