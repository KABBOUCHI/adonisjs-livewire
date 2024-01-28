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
export { Component } from './src/Component.js'
export * from './src/decorators/index.js'
export { mix, Mixin, hasMixin, decorate } from "ts-mixer"
