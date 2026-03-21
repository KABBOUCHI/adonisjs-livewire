import getPort from 'get-port'
import { test } from '@japa/runner'
import { setupApp, runJapaTest, httpServer } from '../helpers.js'
import { LivewireFactory } from '../../factories/livewire_factory.js'
import { Component } from '../../src/component.js'
import type { ComponentEffects } from '../../src/types.js'
import { LivewireHeaders } from '../../src/headers.js'
import ComponentContext from '../../src/component_context.js'
import { livewireContext, DataStore } from '../../src/store.js'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

/**
 * Test component helper class
 */
class TestComponent extends Component {
  count = 0

  increment() {
    this.count++
  }

  async render() {
    return Promise.resolve(`<div>Count: ${this.count}</div>`)
  }
}

/**
 * Helper function to create a Livewire update server
 */
async function createLivewireUpdateServer(
  app: any,
  livewire: any,
  handler: (ctx: any, component: any, context: any, snapshot: any) => Promise<ComponentEffects>
) {
  const server = httpServer.create(async (req, res) => {
    if (req.method === 'POST' && req.url === '/livewire/update') {
      try {
        const request = new RequestFactory().merge({ req, res }).create()
        const response = new ResponseFactory().merge({ req, res }).create()
        const ctx = new HttpContextFactory().merge({ request, response }).create()
        ctx.containerResolver = app.container.createResolver()

        const component = await livewire.new(ctx, 'test')
        const dataStore = new DataStore('test-store')
        const context = new ComponentContext(component)

        await livewireContext.run({ dataStore, context, features: [], ctx }, async () => {
          const snapshot = await livewire.snapshot(component, context)
          const effects = await handler(ctx, component, context, snapshot)

          response.header('x-livewire', '1')
          res.setHeader('x-livewire', '1')
          response.json({
            components: [
              {
                snapshot: JSON.stringify(snapshot),
                effects,
              },
            ],
          })
          response.finish()
        })
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    } else {
      res.end()
    }
  })

  const port = await getPort({ port: 3333 })
  const url = `http://localhost:${port}`
  server.listen(port)

  return { server, url, port }
}

test.group('Japa API Client Plugin', () => {
  test('withLivewire should set X-Livewire header', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      assert.deepEqual(req.headers['x-livewire'], '1')
      res.end()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      await client.get(url).withLivewire()
    })
  })

  test('withLivewireNavigate should set X-Livewire-Navigate header', async ({
    assert,
    cleanup,
  }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      assert.deepEqual(req.headers[LivewireHeaders.Navigate.toLowerCase()], '1')
      res.end()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      await client.get(url).withLivewireNavigate()
    })
  })

  test('livewire() should parse Livewire response and return TestableResponse', async ({
    assert,
    cleanup,
  }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: await component.render(),
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      const testable = response.livewire()
      assert.isDefined(testable)
      assert.equal(testable.name(), 'test')
      // The server generates its own component, so id() returns the server-generated ID
      assert.isDefined(testable.id())

      const components = testable.components()
      assert.isArray(components)
      assert.lengthOf(components, 1)
      assert.property(components[0], 'snapshot')
      assert.property(components[0], 'effects')
    })
  })

  test('snapshot() should return first component snapshot', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: await component.render(),
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      const testable = response.livewire()
      const snapshot = testable.snapshot()
      assert.isDefined(snapshot)
      assert.property(snapshot, 'data')
      assert.property(snapshot, 'memo')
      assert.property(snapshot, 'checksum')
      assert.equal(snapshot.memo.name, 'test')
    })
  })

  test('effects() should return first component effects', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: await component.render(),
        dispatches: ['test-event'],
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      const testable = response.livewire()
      const effects = testable.effects()
      assert.isDefined(effects)
      assert.property(effects, 'html')
      assert.property(effects, 'dispatches')
      assert.include(effects.dispatches, 'test-event')
    })
  })

  test('name() should return component name', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: await component.render(),
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      const componentName = response.livewire().name()
      assert.equal(componentName, 'test')
    })
  })

  test('assertSet should assert property value', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: await component.render(),
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      response.livewire().assertSet('count', 0)
    })
  })

  test('assertSnapshot should assert exact snapshot match', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: await component.render(),
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      const testable = response.livewire()
      const snapshot = testable.snapshot()
      testable.assertSnapshot(snapshot)
    })
  })

  test('assertSnapshotContains should assert partial snapshot match', async ({
    assert,
    cleanup,
  }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: await component.render(),
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      const testable = response.livewire()
      testable.assertSnapshotContains({
        memo: { name: 'test', id: testable.id() },
      })
    })
  })

  test('assertEffects should assert exact effects match', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: '<div>Count: 0</div>',
        dispatches: ['test-event'],
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      response.livewire().assertEffects({
        html: '<div>Count: 0</div>',
        dispatches: ['test-event'],
      })
    })
  })

  test('assertEffectsContains should assert partial effects match', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: '<div>Count: 0</div>',
        dispatches: ['test-event'],
        redirect: '/dashboard',
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      response.livewire().assertEffectsContains({
        redirect: '/dashboard',
      })
    })
  })

  test('assertRedirect should assert redirect effect', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: '<div>Count: 0</div>',
        redirect: '/dashboard',
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      response.livewire().assertRedirect('/dashboard')
    })
  })

  test('assertDispatched should assert event was dispatched', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: '<div>Count: 0</div>',
        dispatches: ['user-updated', 'notification-sent'],
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      response.livewire().assertDispatched('user-updated').assertNotDispatched('error-occurred')
    })
  })

  test('assertSee should assert HTML contains text', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: '<div>Count: 5</div>',
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 5 },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      response.livewire().assertSee('Count: 5').assertDontSee('Error')
    })
  })

  test('chainable assertions should work', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const { url } = await createLivewireUpdateServer(app, livewire, async (ctx, component) => {
      return {
        html: '<div>Count: 5</div>',
        dispatches: ['count-updated'],
        redirect: '/success',
      }
    })

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 5, items: [1, 2, 3] },
                memo: { id: 'test-id', name: 'test' },
                checksum: 'test-checksum',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      // The server generates its own snapshot with count=0, so we check actual returned data
      const testable = response.livewire()
      testable
        .assertSee('Count: 5')
        .assertSeeHtml('<div>')
        .assertDispatched('count-updated')
        .assertRedirect('/success')
    })
  })

  test('should handle multiple components in response', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const livewire = new LivewireFactory(app).create()
    livewire.component('test', TestComponent)

    const server = httpServer.create(async (req, res) => {
      if (req.method === 'POST' && req.url === '/livewire/update') {
        try {
          const request = new RequestFactory().merge({ req, res }).create()
          const response = new ResponseFactory().merge({ req, res }).create()
          const ctx = new HttpContextFactory().merge({ request, response }).create()
          ctx.containerResolver = app.container.createResolver()

          const component1 = await livewire.new(ctx, 'test')
          const component2 = await livewire.new(ctx, 'test')
          const dataStore1 = new DataStore('test-store-1')
          const dataStore2 = new DataStore('test-store-2')
          const context1 = new ComponentContext(component1)
          const context2 = new ComponentContext(component2)

          let snapshot1: any
          let snapshot2: any
          let effects: ComponentEffects

          await livewireContext.run(
            { dataStore: dataStore1, context: context1, features: [], ctx },
            async () => {
              snapshot1 = await livewire.snapshot(component1, context1)
              effects = {
                html: await component1.render(),
              }
            }
          )

          await livewireContext.run(
            { dataStore: dataStore2, context: context2, features: [], ctx },
            async () => {
              snapshot2 = await livewire.snapshot(component2, context2)
            }
          )

          response.header('x-livewire', '1')
          res.setHeader('x-livewire', '1')
          response.json({
            components: [
              {
                snapshot: JSON.stringify(snapshot1),
                effects: effects!,
              },
              {
                snapshot: JSON.stringify(snapshot2),
                effects: effects!,
              },
            ],
          })
          response.finish()
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
      } else {
        res.end()
      }
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      const response = await client
        .post(`${url}/livewire/update`)
        .withLivewire()
        .json({
          components: [
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id-1', name: 'test' },
                checksum: 'test-checksum-1',
              }),
              updates: {},
              calls: [],
            },
            {
              snapshot: JSON.stringify({
                data: { count: 0 },
                memo: { id: 'test-id-2', name: 'test' },
                checksum: 'test-checksum-2',
              }),
              updates: {},
              calls: [],
            },
          ],
        })

      const testable = response.livewire()
      const components = testable.components()
      assert.isDefined(components)
      assert.lengthOf(components, 2)
      // First component should be accessible via getters
      assert.equal(testable.name(), 'test')
      // Access second component - check that it exists and has different id from first
      const secondComponent = testable.component(1)
      assert.notEqual(testable.id(), secondComponent.id())
    })
  })

  test('should throw error when response is not Livewire', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const server = httpServer.create(async (req, res) => {
      if (req.method === 'GET' && req.url === '/test') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'Not a Livewire response' }))
      } else {
        res.end()
      }
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      const response = await client.get(`${url}/test`)

      try {
        // Calling livewire() should throw an error for non-Livewire responses
        response.livewire()
        assert.fail('Should have thrown an error')
      } catch (error: any) {
        assert.include(error.message, 'Not a Livewire response')
      }
    })
  })
})
