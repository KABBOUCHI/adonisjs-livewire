import { type HttpContext } from '@adonisjs/core/http'
import { HttpContextFactory, RouterFactory } from '@adonisjs/core/factories/http'
import { type ApplicationService, type HttpRouterService } from '@adonisjs/core/types'

import { defineConfig, type Config, type PartialConfig } from '../src/define_config.js'
import Livewire from '../src/livewire.js'
import { LivewireHeaders } from '../src/headers.js'

/**
 * Parameters for configuring the Livewire factory
 */
type FactoryParameters = {
  /** HTTP context for the request */
  ctx: HttpContext
  /** Application service instance */
  app: ApplicationService
  /** HTTP router service */
  router: HttpRouterService
  /** Livewire configuration object */
  config: Config
}

/**
 * Livewire factory to quickly create a new instance of Livewire
 * for testing purposes
 *
 * @example
 * ```typescript
 * const factory = new LivewireFactory()
 * const livewire = factory
 *   .merge({ config: { injectAssets: false } })
 *   .create()
 * ```
 */
export class LivewireFactory {
  /** Internal parameters for factory configuration */
  #parameters = {} as FactoryParameters

  /**
   * Creates a new LivewireFactory instance with default Livewire headers
   *
   * @param app - Application service instance (optional, will create a mock if not provided)
   *
   * @example
   * ```typescript
   * const factory = new LivewireFactory(app, { injectAssets: false })
   * ```
   */
  constructor(app: ApplicationService, config?: Config, router?: HttpRouterService) {
    this.#parameters.app = app
    this.#parameters.config = config || defineConfig({})
    this.#parameters.router = router || new RouterFactory().create()
    this.#parameters.ctx = new HttpContextFactory().create()

    this.#parameters.ctx.request.request.headers[LivewireHeaders.Livewire] = '1'
  }

  /**
   * Merges additional parameters into the factory configuration
   *
   * @param parameters - Partial factory parameters to merge
   *
   * @example
   * ```typescript
   * factory.merge({
   *   config: { injectAssets: false },
   *   ctx: customContext
   * })
   * ```
   */
  merge(
    parameters: Omit<Partial<FactoryParameters>, 'config' | 'app'> & {
      config?: PartialConfig
    }
  ) {
    if (parameters.ctx) {
      this.#parameters.ctx = parameters.ctx

      this.#parameters.ctx.request.request.headers[LivewireHeaders.Livewire] = '1'
    }

    if (parameters.config) {
      this.#parameters.config = defineConfig(parameters.config)
    }

    return this
  }

  /**
   * Removes the X-Livewire header from the request headers
   *
   * @example
   * ```typescript
   * const livewire = factory.withoutLivewire().create()
   * ```
   */
  withoutLivewire() {
    delete this.#parameters.ctx.request.request.headers[LivewireHeaders.Livewire]
    return this
  }

  /**
   * Sets the X-Livewire-Navigate header for navigation requests
   *
   * @example
   * ```typescript
   * const livewire = factory.withNavigate().create()
   * ```
   */
  withNavigate() {
    this.#parameters.ctx.request.request.headers[LivewireHeaders.Navigate] = '1'
    return this
  }

  /**
   * Sets the X-Livewire-Stream header for streaming responses
   *
   * @example
   * ```typescript
   * const livewire = factory.withStream().create()
   * ```
   */
  withStream() {
    this.#parameters.ctx.request.request.headers[LivewireHeaders.Stream] = '1'
    return this
  }

  /**
   * Creates a new Livewire instance with the configured parameters
   *
   * @example
   * ```typescript
   * const livewire = factory
   *   .merge({ config: customConfig })
   *   .create()
   * ```
   */
  create(): Livewire {
    return new Livewire(this.#parameters.app, this.#parameters.router, this.#parameters.config)
  }

  /**
   * Gets the current HTTP context
   *
   * @example
   * ```typescript
   * const ctx = factory.getContext()
   * ```
   */
  getContext(): HttpContext {
    return this.#parameters.ctx
  }

  /**
   * Gets the current application service
   *
   * @example
   * ```typescript
   * const app = factory.getApp()
   * ```
   */
  getApp(): ApplicationService {
    return this.#parameters.app
  }

  /**
   * Gets the current configuration
   *
   * @example
   * ```typescript
   * const config = factory.getConfig()
   * ```
   */
  getConfig(): Config {
    return this.#parameters.config
  }
}
