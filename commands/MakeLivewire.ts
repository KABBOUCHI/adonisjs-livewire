import { BaseCommand, args, flags } from '@adonisjs/core/build/standalone'
import { join } from 'path'

export default class MakeLivewire extends BaseCommand {
    public static commandName = 'make:livewire'
    public static description = 'Make a new livewire component'

    static aliases: string[] = ['livewire:make']
    public static settings = {
        loadApp: false,
        stayAlive: false,
    };

    @args.string({ description: 'Name of component' })
    public name: string

    @flags.boolean()
    public inline: boolean

    public async run() {
        this.inline ? await this.generateInline() : await this.generate()
    }

    private async generateInline() {
        this.generator
            .addFile(this.name + ".ts", {
                pattern: "pascalcase",
            })
            .stub(join(__dirname, '..', 'templates', 'livewire-inline.txt'))
            .useMustache()
            .destinationDir('app/Livewire')
            .appRoot(this.application.appRoot)

        await this.generator.run()
    }

    private async generate() {
        this.generator
            .addFile(this.name, {
                pattern: "pascalcase",
                extname: ".ts",
            })
            .stub(join(__dirname, '..', 'templates', 'livewire-component.txt'))
            .useMustache()
            .destinationDir('app/Livewire')
            .appRoot(this.application.appRoot)

        await this.generator.run()

        this.generator.clear()

        this.generator
            .addFile(this.name, {
                pattern: "dashcase",
                extname: ".edge",
            })
            .stub(join(__dirname, '..', 'templates', 'livewire-template.txt'))
            .useMustache()
            .destinationDir('resources/views/livewire')
            .appRoot(this.application.appRoot)

        await this.generator.run()
    }
}
