/*
|--------------------------------------------------------------------------
| Package entrypoint
|--------------------------------------------------------------------------
|
| Export values from the package entrypoint as you see fit.
|
*/

export { configure } from './configure.js'
export { stubsRoot } from './stubs/main.js'
export { defineConfig } from './src/define_config.js'
export { Form } from './src/form.js'
export { Component } from './src/component.js'
export { EventBus } from './src/event_bus.js'
export { Synth } from './src/synthesizers/synth.js'
export { ViewComponent } from './src/view_component.js'
export * from './src/decorators/index.js'
export { mix, Mixin, hasMixin, decorate } from 'ts-mixer'
