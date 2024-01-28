import app from '@adonisjs/core/services/app'
import LivewireClass from '../src/livewire.js'

let Livewire: LivewireClass

await app.booted(async () => {
  Livewire = await app.container.make('livewire')
})

export { Livewire as default }
