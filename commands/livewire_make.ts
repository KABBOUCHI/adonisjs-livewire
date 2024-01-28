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

    codemods.makeUsingStub(stubsRoot, 'livewire-inline.stub', {
      className: stringHelpers.pascalCase(this.name),
      filename: stringHelpers.snakeCase(this.name),
    })
  }

  private async generate() {
    const codemods = await this.createCodemods()

    codemods.makeUsingStub(stubsRoot, 'livewire-component.stub', {
      filename: stringHelpers.snakeCase(this.name),
      className: stringHelpers.pascalCase(this.name),
    })

    codemods.makeUsingStub(stubsRoot, 'livewire-template.stub', {
      filename: stringHelpers.dashCase(this.name),
    })
  }
}
