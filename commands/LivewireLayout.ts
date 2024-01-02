import { BaseCommand } from '@adonisjs/core/build/standalone'
import { join } from 'path'

export default class LivewireLayout extends BaseCommand {
    public static commandName = 'livewire:layout'
    public static description = 'Create a new app layout file'

    public static settings = {
        loadApp: false,
        stayAlive: false,
    };

    public async run() {
        this.generator
            .addFile("main.edge")
            .stub(join(__dirname, '..', 'templates', 'layout.txt'))
            .destinationDir('resoures/views/layouts')
            .appRoot(this.application.appRoot)
            
        await this.generator.run()
    }
}
