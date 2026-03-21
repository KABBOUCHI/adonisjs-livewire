import type { PluginFn } from 'edge.js/types'
import type { ApplicationService } from '@adonisjs/core/types'
import { livewireTag, livewireStylesTag, livewireScriptsTag, scriptTag, assetsTag } from './tags.js'
import { processLivewireComponents } from './processor.js'
import Livewire from '../../livewire.js'
import debug from '../../debug.js'
import { getLivewireContext } from '../../store.js'

type LivewireInstance = InstanceType<typeof Livewire>

/**
 * Edge.js plugin that registers Livewire tags and global functions
 *
 * This plugin adds the @livewire, @livewireStyles, @livewireScripts, @script, and @assets tags
 * to Edge templates, along with global helper functions for rendering components.
 *
 * @param app - The AdonisJS application service
 * @param livewire - The Livewire instance
 * @param version - Package version for asset URLs
 * @returns Edge plugin function that registers Livewire functionality
 *
 * @example
 * ```js
 * // Configure in providers/livewire_provider.ts
 * import { edgePluginLivewire } from '@adonisjs/livewire/plugins/edge'
 *
 * edge.use(edgePluginLivewire(app, livewire, packageJson.version))
 * ```
 *
 * @example
 * ```edge
 * {{-- Use in Edge templates --}}
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   @livewireStyles()
 * </head>
 * <body>
 *   @livewire('counter', { count: 0 })
 *   @livewireScripts()
 * </body>
 * </html>
 * ```
 */
export const edgePluginLivewire = (
  app: ApplicationService,
  livewire: LivewireInstance,
  version: string
): PluginFn<undefined> => {
  return (edge) => {
    debug('registering Livewire Edge.js plugin with version %s', version)
    /**
     * Register the `livewire` global used by the `@livewire` tag
     * This function renders a Livewire component
     *
     * The ctx is always available from livewireContext when rendering Edge templates
     * during a Livewire request.
     */
    edge.global('livewire', {
      mount: async (name: string, params?: Record<string, any>, options?: any) => {
        const context = getLivewireContext()

        if (!context?.ctx) {
          throw new Error('Cannot access http context. ctx must be available in livewireContext.')
        }

        return await livewire.mount(context.ctx, name, params || {}, options || {})
      },
    })

    /**
     * Register tags
     */
    edge.registerTag(livewireTag)
    edge.registerTag(livewireStylesTag(version))
    edge.registerTag(livewireScriptsTag(version))
    edge.registerTag(scriptTag)
    edge.registerTag(assetsTag)

    /**
     * Register processor for <livewire:.../> syntax
     */
    edge.processor.process('raw', (value) => {
      const processed = processLivewireComponents(value.raw)
      if (processed !== value.raw) {
        value.raw = processed
      }
    })
    debug('Livewire Edge.js plugin registered successfully')
  }
}
