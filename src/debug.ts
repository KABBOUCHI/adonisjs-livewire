import { debuglog } from 'node:util'

/**
 * Debug logger for Livewire package
 *
 * Provides debugging functionality using Node.js built-in debuglog.
 * Enable debugging by setting the NODE_DEBUG environment variable to 'adonisjs:livewire'.
 *
 * @example
 * ```js
 * import debug from './debug.js'
 *
 * debug('Mounting Livewire component')
 * debug('Component: %s, Props: %o', componentName, props)
 * ```
 *
 * @example
 * ```bash
 * # Enable debugging
 * NODE_DEBUG=adonisjs:livewire node server.js
 * ```
 */
export default debuglog('adonisjs:livewire')
