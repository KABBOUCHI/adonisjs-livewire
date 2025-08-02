import stringHelpers from '@adonisjs/core/helpers/string'
import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../index.js'

export default class LivewireForm extends BaseCommand {
  static commandName = 'livewire:form'
  static description = 'Create a new livewire form component'

  static options: CommandOptions = {
    startApp: false,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  @args.string({ description: 'Name of form component' })
  declare name: string

  @flags.boolean({ description: 'Create inline form component' })
  declare inline: boolean

  @flags.boolean({ description: 'Create attached form component', alias: 'a' })
  declare attached: boolean

  async run() {
    this.inline ? await this.generateInline() : await this.generate()
  }

  private async generateInline() {
    const codemods = await this.createCodemods()

    let name = this.name.replaceAll('.', '/')
    let parts = name.split('/')
    let last = parts.pop()!
    let filename = [...parts, stringHelpers.snakeCase(last)].join('/')

    const componentStub = this.attached
      ? 'livewire-form-inline-attached.stub'
      : 'livewire-form-inline.stub'

    codemods.makeUsingStub(stubsRoot, componentStub, {
      filename,
    })
  }

  private async generate() {
    const codemods = await this.createCodemods()

    let name = this.name.replaceAll('.', '/')
    let parts = name.split('/')
    let last = parts.pop()!
    let filename = [...parts, stringHelpers.snakeCase(last)].join('/')
    let dashedFilename = [...parts, stringHelpers.dashCase(last)].join('/')

    const componentStub = this.attached
      ? 'livewire-form-component-attached.stub'
      : 'livewire-form-component.stub'

    codemods.makeUsingStub(stubsRoot, componentStub, {
      filename,
      dashedFilename,
    })

    if (this.attached) {
      codemods.makeUsingStub(stubsRoot, 'livewire-form-template.stub', {
        filename: dashedFilename,
      })
    }
  }
}
