import { test } from '@japa/runner'
import { defineConfig, defaultConfig } from '../src/define_config.js'

test.group('defineConfig', () => {
  test('should return default config when empty', async ({ assert }) => {
    const config = defineConfig({})

    assert.deepEqual(config, defaultConfig)
    assert.equal(config.class_namespace, 'app/livewire')
    assert.equal(config.layout, 'components.layouts.main')
    assert.isTrue(config.injectAssets)
    assert.isFalse(config.renderOnRedirect)
    assert.deepEqual(config.navigate, {
      showProgressBar: true,
      progressBarColor: '#2299dd',
    })
  })

  test('should merge partial config with default', async ({ assert }) => {
    const config = defineConfig({
      class_namespace: 'custom/namespace',
    })

    assert.equal(config.class_namespace, 'custom/namespace')
    assert.equal(config.layout, 'components.layouts.main') // Default value
    assert.isTrue(config.injectAssets) // Default value
    assert.isFalse(config.renderOnRedirect) // Default value
    assert.deepEqual(config.navigate, {
      showProgressBar: true,
      progressBarColor: '#2299dd',
    }) // Default value
  })

  test('should override default values', async ({ assert }) => {
    const config = defineConfig({
      class_namespace: 'custom/namespace',
      layout: 'custom/layout',
      injectAssets: false,
      renderOnRedirect: true,
    })

    assert.equal(config.class_namespace, 'custom/namespace')
    assert.equal(config.layout, 'custom/layout')
    assert.isFalse(config.injectAssets)
    assert.isTrue(config.renderOnRedirect)
    assert.deepEqual(config.navigate, {
      showProgressBar: true,
      progressBarColor: '#2299dd',
    }) // Default value preserved
  })

  test('should merge nested navigate config', async ({ assert }) => {
    const config = defineConfig({
      navigate: {
        showProgressBar: false,
      },
    })

    assert.equal(config.navigate.showProgressBar, false)
    assert.equal(config.navigate.progressBarColor, '#2299dd') // Default value preserved
  })

  test('should override all navigate config', async ({ assert }) => {
    const config = defineConfig({
      navigate: {
        showProgressBar: false,
        progressBarColor: '#ff0000',
      },
    })

    assert.equal(config.navigate.showProgressBar, false)
    assert.equal(config.navigate.progressBarColor, '#ff0000')
  })

  test('should maintain default values not specified', async ({ assert }) => {
    const config = defineConfig({
      class_namespace: 'test/namespace',
    })

    // All other values should remain as defaults
    assert.equal(config.layout, defaultConfig.layout)
    assert.equal(config.injectAssets, defaultConfig.injectAssets)
    assert.equal(config.renderOnRedirect, defaultConfig.renderOnRedirect)
    assert.deepEqual(config.navigate, defaultConfig.navigate)
  })

  test('should handle multiple overrides', async ({ assert }) => {
    const config = defineConfig({
      class_namespace: 'app/custom',
      layout: 'layouts/custom',
      injectAssets: false,
      renderOnRedirect: true,
      navigate: {
        showProgressBar: false,
        progressBarColor: '#00ff00',
      },
    })

    assert.equal(config.class_namespace, 'app/custom')
    assert.equal(config.layout, 'layouts/custom')
    assert.isFalse(config.injectAssets)
    assert.isTrue(config.renderOnRedirect)
    assert.equal(config.navigate.showProgressBar, false)
    assert.equal(config.navigate.progressBarColor, '#00ff00')
  })

  test('should not mutate default config', async ({ assert }) => {
    const originalDefault = { ...defaultConfig }
    const originalNavigate = { ...defaultConfig.navigate }

    defineConfig({
      class_namespace: 'custom/namespace',
      navigate: {
        showProgressBar: false,
      },
    })

    // Default config should remain unchanged
    assert.deepEqual(defaultConfig, originalDefault)
    assert.deepEqual(defaultConfig.navigate, originalNavigate)
  })

  test('should create new object instance', async ({ assert }) => {
    const config1 = defineConfig({})
    const config2 = defineConfig({})

    // Should be different instances
    assert.notEqual(config1, config2)
    assert.notEqual(config1.navigate, config2.navigate)
  })

  test('should include default limits config', async ({ assert }) => {
    const config = defineConfig({})

    assert.deepEqual(config.limits, {
      maxCalls: 10,
      maxSize: 1024 * 1024,
      maxComponents: 10,
    })
  })

  test('should merge partial limits config', async ({ assert }) => {
    const config = defineConfig({
      limits: {
        maxCalls: 5,
      },
    })

    assert.equal(config.limits.maxCalls, 5)
    assert.equal(config.limits.maxSize, 1024 * 1024) // Default preserved
    assert.equal(config.limits.maxComponents, 10) // Default preserved
  })

  test('should override all limits config', async ({ assert }) => {
    const config = defineConfig({
      limits: {
        maxCalls: 20,
        maxSize: 2048,
        maxComponents: 5,
      },
    })

    assert.equal(config.limits.maxCalls, 20)
    assert.equal(config.limits.maxSize, 2048)
    assert.equal(config.limits.maxComponents, 5)
  })
})
