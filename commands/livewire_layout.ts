import { BaseCommand, args } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../index.js'
import stringHelpers from '@adonisjs/core/helpers/string'

export default class LivewireLayout extends BaseCommand {
  static commandName = 'livewire:layout'
  static description = 'Create a new app layout file'

  static options: CommandOptions = {
    startApp: false,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  @args.string({ description: 'Name of layout', default: 'main' })
  declare name: string

  async run() {
    const codemods = await this.createCodemods()

    let name = this.name.replaceAll('.', '/')
    let parts = name.split('/')
    let last = parts.pop()!
    let filename = [...parts, stringHelpers.dashCase(last)].join('/')

    codemods.makeUsingStub(stubsRoot, 'layout.stub', {
      filename,
    })
  }
}
