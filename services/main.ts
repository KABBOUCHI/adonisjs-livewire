export { Component } from '../src/component.js'
export * from '../src/decorators/index.js'
export { Mixin, hasMixin, decorate, mix } from 'ts-mixer'

import app from '@adonisjs/core/services/app'
import Livewire from '../src/livewire.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    livewire: Livewire
  }
}

let livewire: Livewire

await app.booted(async () => {
  livewire = await app.container.make('livewire')
})

export { livewire as default }
