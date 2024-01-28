export { Component } from '../src/Component.js'
export * from '../src/decorators/index.js'
export { Mixin, hasMixin, decorate, mix } from 'ts-mixer'

import app from '@adonisjs/core/services/app'
import Livewire from '../src/Livewire.js'

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
