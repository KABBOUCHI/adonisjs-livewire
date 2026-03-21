import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import { SupportJsEvaluation } from '../../src/features/support_js_evaluation/support_js_evaluation.js'

class JsEvaluationTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>JS Evaluation Test</div>')
  }
}

test.group('HandlesJsEvaluation', () => {
  test('should add js expression to store (PHP parity: { expression, params })', async ({
    assert,
    cleanup,
  }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({
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
        component.js('console.log("test")')

        const jsEntries = store(component).get('js')
        assert.isArray(jsEntries)
        assert.lengthOf(jsEntries, 1)
        assert.deepEqual(jsEntries[0], { expression: 'console.log("test")', params: [] })
      }
    )
  })

  test('should add js with params (PHP parity)', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({
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
        component.js('$wire.set("count", 5)', 5)
        component.js('doSomething', 'a', { b: 1 })

        const jsEntries = store(component).get('js')
        assert.lengthOf(jsEntries, 2)
        assert.deepEqual(jsEntries[0], { expression: '$wire.set("count", 5)', params: [5] })
        assert.deepEqual(jsEntries[1], { expression: 'doSomething', params: ['a', { b: 1 }] })
      }
    )
  })

  test('should add multiple js expressions to store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({
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
        component.js('console.log("first")')
        component.js('console.log("second")')
        component.js('alert("third")')

        const jsEntries = store(component).get('js')
        assert.isArray(jsEntries)
        assert.lengthOf(jsEntries, 3)
        assert.equal(jsEntries[0].expression, 'console.log("first")')
        assert.equal(jsEntries[1].expression, 'console.log("second")')
        assert.equal(jsEntries[2].expression, 'alert("third")')
      }
    )
  })
})

test.group('SupportJsEvaluation', () => {
  test('should add xjs effect when js expressions exist in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({
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
        component.js('console.log("test")')

        const hook = new SupportJsEvaluation()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.deepEqual(componentContext.effects.xjs, [
          { expression: 'console.log("test")', params: [] },
        ])
      }
    )
  })

  test('should add xjs effect with params (PHP parity)', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({
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
        component.js('run', 1, 'two')

        const hook = new SupportJsEvaluation()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.deepEqual(componentContext.effects.xjs, [{ expression: 'run', params: [1, 'two'] }])
      }
    )
  })

  test('should not add xjs effect when no js expressions in store', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({
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
        const hook = new SupportJsEvaluation()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.isUndefined(componentContext.effects.xjs)
      }
    )
  })

  test('should add all js expressions to xjs effect', async ({ assert, cleanup }) => {
    const { app, router } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({
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
        component.js('console.log("first")')
        component.js('console.log("second")')
        component.js('alert("third")')

        const hook = new SupportJsEvaluation()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.deepEqual(componentContext.effects.xjs, [
          { expression: 'console.log("first")', params: [] },
          { expression: 'console.log("second")', params: [] },
          { expression: 'alert("third")', params: [] },
        ])
      }
    )
  })
})
