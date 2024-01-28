import { BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../index.js'

export default class LivewireLayout extends BaseCommand {
  static commandName = 'livewire:layout'
  static description = 'Create a new app layout file'

  static options: CommandOptions = {
    startApp: false,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  @flags.string({ description: 'Name of layout', default: 'main' })
  declare name;

  async run() {
    const codemods = await this.createCodemods()

    codemods.makeUsingStub(stubsRoot, 'layout.stub', {

    })
  }
}
