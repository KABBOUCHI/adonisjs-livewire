import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../index.js'
import stringHelpers from '@adonisjs/core/helpers/string'

export default class MakeLivewire extends BaseCommand {
  static commandName = 'make:livewire'
  static description = 'Make a new livewire component'

  static aliases: string[] = ['livewire:make']
  static options: CommandOptions = {
    startApp: false,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  @args.string({ description: 'Name of component' })
  declare name: string

  @flags.boolean()
  declare inline: boolean

  async run() {
    this.inline ? await this.generateInline() : await this.generate()
  }

  private async generateInline() {
    const codemods = await this.createCodemods()

    let name = this.name.replaceAll('.', '/')
    let parts = name.split('/')
    let last = parts.pop()!
    let filename = [...parts, stringHelpers.snakeCase(last)].join('/')

    codemods.makeUsingStub(stubsRoot, 'livewire-inline.stub', {
      className: stringHelpers.pascalCase(last),
      filename,
    })
  }

  private async generate() {
    const codemods = await this.createCodemods()

    let name = this.name.replaceAll('.', '/')
    let parts = name.split('/')
    let last = parts.pop()!
    let filename = [...parts, stringHelpers.snakeCase(last)].join('/')

    codemods.makeUsingStub(stubsRoot, 'livewire-component.stub', {
      className: stringHelpers.pascalCase(last),
      filename,
    })

    let dashedFilename = [...parts, stringHelpers.dashCase(last)].join('/')

    codemods.makeUsingStub(stubsRoot, 'livewire-template.stub', {
      filename: dashedFilename,
    })
  }
}
