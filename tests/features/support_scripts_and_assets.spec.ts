import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import { SupportScriptsAndAssets } from '../../src/features/support_scripts_and_assets/support_scripts_and_assets.js'

class ScriptsAssetsTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>Scripts Assets Test</div>')
  }
}

test.group('SupportScriptsAndAssets', () => {
  test('should store scripts from memo on hydrate', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.hydrate({ scripts: ['script1', 'script2'] })

        const forwardScripts = store(component).get('forwardScriptsToDehydrateMemo')
        assert.deepEqual(forwardScripts, ['script1', 'script2'])
      }
    )
  })

  test('should store assets from memo on hydrate', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.hydrate({ assets: ['asset1', 'asset2'] })

        const forwardAssets = store(component).get('forwardAssetsToDehydrateMemo')
        assert.deepEqual(forwardAssets, ['asset1', 'asset2'])
      }
    )
  })

  test('should add new scripts to effect on dehydrate', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        store(component).set('scripts', { script1: 'console.log("test")' })

        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.deepEqual(componentContext.effects.scripts, { script1: 'console.log("test")' })
        assert.deepEqual(componentContext.memo.scripts, ['script1'])
      }
    )
  })

  test('should not add already executed scripts to effect', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        store(component).set('forwardScriptsToDehydrateMemo', ['script1'])
        store(component).set('scripts', {
          script1: 'console.log("already executed")',
          script2: 'console.log("new")',
        })

        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        // Only script2 should be in effects
        assert.deepEqual(componentContext.effects.scripts, { script2: 'console.log("new")' })
        assert.deepEqual(componentContext.memo.scripts, ['script1', 'script2'])
      }
    )
  })

  test('should add new assets to renderedAssets on dehydrate', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        store(component).set('assets', { asset1: '<link rel="stylesheet" href="style.css">' })

        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        const reqId = ctx.request.id()!
        const renderedAssets = SupportScriptsAndAssets.renderedAssets.get(reqId)
        assert.deepEqual(renderedAssets, { asset1: '<link rel="stylesheet" href="style.css">' })
        assert.deepEqual(componentContext.memo.assets, ['asset1'])
      }
    )
  })

  test('should not add already executed assets to renderedAssets', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    // Clear renderedAssets before test
    const reqId = ctx.request.id()!
    SupportScriptsAndAssets.renderedAssets.delete(reqId)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        store(component).set('forwardAssetsToDehydrateMemo', ['asset1'])
        store(component).set('assets', {
          asset1: '<link rel="stylesheet" href="old.css">',
          asset2: '<link rel="stylesheet" href="new.css">',
        })

        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        const renderedAssets = SupportScriptsAndAssets.renderedAssets.get(reqId)
        // Only asset2 should be added
        assert.deepEqual(renderedAssets, { asset2: '<link rel="stylesheet" href="new.css">' })
        assert.deepEqual(componentContext.memo.assets, ['asset1', 'asset2'])
      }
    )
  })

  test('should use reqId to isolate assets per request', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx1 = new HttpContextFactory().create()
    const ctx2 = new HttpContextFactory().create()

    const component1 = new ScriptsAssetsTestComponent({
      ctx: ctx1,
      app,
      id: 'test-id-1',
      name: 'test1',
      router,
    })
    const component2 = new ScriptsAssetsTestComponent({
      ctx: ctx2,
      app,
      id: 'test-id-2',
      name: 'test2',
      router,
    })

    // Clear all renderedAssets before test to ensure clean state
    SupportScriptsAndAssets.renderedAssets.clear()

    const reqId1 = ctx1.request.id()!
    const reqId2 = ctx2.request.id()!

    // If IDs are the same, we can't test isolation properly
    // In that case, we'll skip the isolation assertion
    const idsAreDifferent = reqId1 !== reqId2

    const dataStore1 = new DataStore('test-store-1')
    const dataStore2 = new DataStore('test-store-2')
    const componentContext1 = new ComponentContext(component1, false)
    const componentContext2 = new ComponentContext(component2, false)

    await livewireContext.run(
      { dataStore: dataStore1, context: componentContext1, features: [], ctx: ctx1 },
      async () => {
        store(component1).set('assets', { asset1: 'asset1' })

        const hook1 = new SupportScriptsAndAssets()
        hook1.setComponent(component1)
        hook1.setApp(app)

        await hook1.dehydrate(componentContext1)

        const renderedAssets1 = SupportScriptsAndAssets.renderedAssets.get(reqId1)
        assert.deepEqual(renderedAssets1, { asset1: 'asset1' })
      }
    )

    await livewireContext.run(
      { dataStore: dataStore2, context: componentContext2, features: [], ctx: ctx2 },
      async () => {
        store(component2).set('assets', { asset2: 'asset2' })

        const hook2 = new SupportScriptsAndAssets()
        hook2.setComponent(component2)
        hook2.setApp(app)

        await hook2.dehydrate(componentContext2)

        const renderedAssets2 = SupportScriptsAndAssets.renderedAssets.get(reqId2)

        if (idsAreDifferent) {
          // If IDs are different, assets should be isolated
          assert.deepEqual(renderedAssets2, { asset2: 'asset2' })

          // Should be isolated - reqId1 should still have asset1
          const renderedAssets1 = SupportScriptsAndAssets.renderedAssets.get(reqId1)
          assert.deepEqual(renderedAssets1, { asset1: 'asset1' })
        } else {
          // If IDs are the same, both assets will be in the same map entry
          assert.deepEqual(renderedAssets2, { asset1: 'asset1', asset2: 'asset2' })
        }
      }
    )
  })

  test('should throw error when ctx is not available in livewireContext', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx: null as any },
      async () => {
        store(component).set('assets', { asset1: 'asset1' })

        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await assert.rejects(async () => {
          await hook.dehydrate(componentContext)
        }, 'Cannot access http context. ctx must be available in livewireContext.')
      }
    )
  })

  test('should get assets using static getAssets method', async ({ assert }) => {
    const assets = SupportScriptsAndAssets.getAssets()

    assert.instanceOf(assets, Map)
  })

  test('should handle empty scripts and assets', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ScriptsAssetsTestComponent({
      ctx,
      app,
      router,
      id: 'test-id',
      name: 'test',
    })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportScriptsAndAssets()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.deepEqual(componentContext.memo.scripts, [])
        assert.deepEqual(componentContext.memo.assets, [])
      }
    )
  })
})
