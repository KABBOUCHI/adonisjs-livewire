import { BaseCommand, args } from '@adonisjs/core/build/standalone'
import { join } from 'path'

export default class InspireCommand extends BaseCommand {
    public static commandName = 'make:livewire'
    public static description = 'Make a new livewire component'

    public static settings = {
        loadApp: false,
        stayAlive: false,
    };

    @args.string({ description: 'Name of component' })
    public name: string

    public async run() {
        this.generator
            .addFile(this.name + ".ts", {
                pattern: "pascalcase",
            })
            .stub(join(__dirname, '..', '..', 'templates', 'livewire.txt'))
            .useMustache()
            .destinationDir('app/Livewire')
            .appRoot(this.application.appRoot)
            
        await this.generator.run()
    }
}
