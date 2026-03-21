import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { Component } from '../../src/component.js'
import { Testable } from '../../src/features/support_testing/testable.js'
import { setupApp } from '../helpers.js'

/**
 * Test component for testing feature
 */
class TestingComponent extends Component {
  name = ''
  count = 0
  items: string[] = []
  isActive = false

  increment() {
    this.count++
  }

  addItem(item: string) {
    this.items.push(item)
  }

  async render() {
    return Promise.resolve(`<div>Hello ${this.name}, Count: ${this.count}</div>`)
  }
}

test.group('Support Testing Feature', (group) => {
  let testable: Testable

  group.each.setup(async ($test) => {
    const adonisrc = [
      "import { defineConfig } from '@adonisjs/core/app'",
      '',
      'export default defineConfig({',
      '  /*',
      '  |--------------------------------------------------------------------------',
      '  | Experimental flags',
      '  |--------------------------------------------------------------------------',
      '  |',
      '  | The following features will be enabled by default in the next major release',
      '  | of AdonisJS. You can opt into them today to avoid any breaking changes',
      '  | during upgrade.',
      '  |',
      '  */',
      '  experimental: {},',
      '})',
      '',
    ].join('\n')

    const kernel = [
      "import router from '@adonisjs/core/services/router'",
      "import server from '@adonisjs/core/services/server'",
      '',
      'server.use([])',
      '',
      'router.use([',
      "  () => import('@adonisjs/core/bodyparser_middleware'),",
      "  () => import('@adonisjs/session/session_middleware'),",
      '])',
      '',
    ].join('\n')

    await Promise.all([
      $test.context.fs.create('.env', ''),
      $test.context.fs.createJson('tsconfig.json', {
        'compilerOptions': {
          target: 'ESNext',
          module: 'NodeNext',
          lib: ['ESNext'],
          noUnusedLocals: true,
          noUnusedParameters: true,
          isolatedModules: true,
          removeComments: true,
          esModuleInterop: true,
          strictNullChecks: true,
          allowSyntheticDefaultImports: true,
          forceConsistentCasingInFileNames: true,
          strictPropertyInitialization: true,
          experimentalDecorators: true,
          noImplicitAny: true,
          strictBindCallApply: true,
          strictFunctionTypes: true,
          noImplicitThis: true,
          skipLibCheck: true,
        },
        'ts-node': {
          swc: true,
        },
      }),
      $test.context.fs.createJson('package.json', {
        name: 'adonisjs-livewire-test',
        version: '1.0.0',
      }),
      $test.context.fs.create('adonisrc.ts', adonisrc),
      $test.context.fs.create('vite.config.ts', `export default { plugins: [] }`),
      $test.context.fs.create('start/kernel.ts', kernel),
    ])
    const { app, router } = await setupApp([
      {
        file: () => import('../../providers/livewire_provider.js'),
        environment: ['test', 'web'],
      },
    ])
    const ctx = new HttpContextFactory().create()
    testable = new Testable(TestingComponent, app, router, ctx)

    return () => {
      app.terminate()
      testable = null as any
    }
  })

  test('should create testable instance', async ({ assert, cleanup }) => {
    assert.instanceOf(testable, Testable)
    assert.instanceOf(testable.instance(), TestingComponent)
  })

  test('should set and get property values', async ({ assert, cleanup }) => {
    await testable.mount()
    await testable.set('name', 'John')
    await testable.set('count', 5)

    assert.equal(testable.get('name'), 'John')
    assert.equal(testable.get('count'), 5)
  }).tags(['aqui'])

  test('should call component methods', async ({ assert, cleanup }) => {
    await testable.mount()
    await testable.set('count', 0)
    await testable.call('increment')

    assert.equal(testable.get('count'), 1)

    await testable.call('increment')
    assert.equal(testable.get('count'), 2)
  })

  test('should toggle boolean properties', async ({ assert, cleanup }) => {
    await testable.mount()
    await testable.set('isActive', false)
    await testable.toggle('isActive')

    assert.equal(testable.get('isActive'), true)

    await testable.toggle('isActive')
    assert.equal(testable.get('isActive'), false)
  })

  test('should render HTML', async ({ assert, cleanup }) => {
    await testable.mount()
    await testable.set('name', 'Alice')
    await testable.set('count', 3)

    const html = testable.html()
    assert.include(html, 'Hello Alice')
    assert.include(html, 'Count: 3')
  })

  test('should assert property values', async ({ assert, cleanup }) => {
    await testable.mount()
    await testable.set('name', 'Bob')

    assert.doesNotThrow(() => {
      testable.assertSet('name', 'Bob')
    })

    assert.throws(() => {
      testable.assertSet('name', 'Alice')
    }, /Failed asserting that property/)
  })

  test('should assert HTML content', async ({ assert, cleanup }) => {
    await testable.mount()
    await testable.set('name', 'Charlie')

    assert.doesNotThrow(() => {
      testable.assertSee('Hello Charlie')
    })

    assert.throws(() => {
      testable.assertSee('Goodbye')
    }, /Failed asserting that/)
  })

  test('should assert array count', async ({ assert, cleanup }) => {
    await testable.mount()
    await testable.call('addItem', 'item1')
    await testable.call('addItem', 'item2')

    assert.doesNotThrow(() => {
      testable.assertCount('items', 2)
    })

    assert.throws(() => {
      testable.assertCount('items', 5)
    }, /Failed asserting that property.*has 5 items/)
  })

  test('should chain method calls', async ({ assert, cleanup }) => {
    await testable
      .mount()
      .set('name', 'David')
      .set('count', 10)
      .call('increment')
      .assertSet('name', 'David')
      .assertSet('count', 11)
      .assertSee('Hello David')

    assert.isTrue(true)
  })
})
