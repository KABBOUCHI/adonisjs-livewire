import type { HttpContext } from '@adonisjs/core/http'
import { store } from './store.js'
import { Edge } from 'edge.js'
import { ApplicationService, HttpRouterService } from '@adonisjs/core/types'

export class BaseComponent {
  // Hard private fields (Runtime private)
  #id!: string
  #name!: string
  #viewPath!: string
  #view!: ReturnType<Edge['createRenderer']>
  #viewData: Record<string, any> = {}
  #router!: HttpRouterService

  declare bindings: any

  declare app: ApplicationService
  declare ctx: HttpContext

  /**
   * Internal method to set router - not exposed to end users
   * @internal
   */
  __setRouter(router: HttpRouterService): void {
    this.#router = router
  }

  /**
   * Internal method to get router - not exposed to end users
   * @internal
   */
  __getRouter(): HttpRouterService {
    return this.#router
  }

  // Getters & Setters for controlled access
  get __id(): string {
    return this.#id
  }

  set __id(value: string) {
    this.#id = value
  }

  get __name(): string {
    return this.#name
  }

  set __name(value: string) {
    this.#name = value
  }

  get viewPath(): string {
    return this.#viewPath
  }

  set viewPath(path: string) {
    this.#viewPath = path
  }

  get view(): ReturnType<Edge['createRenderer']> {
    if (!this.#view) {
      throw new Error(`View renderer not initialized for component: ${this.#name}`)
    }

    return {
      share: (data: Record<string, any>) => {
        return this.#view.share(data)
      },

      render: async (templatePath: string, state?: Record<string, any>) => {
        this.#viewData = Object.assign({}, this.#viewData || {}, state || {})
        return await this.#view.render(templatePath, state)
      },
      renderSync: (templatePath: string, state?: Record<string, any>) => {
        this.#viewData = Object.assign({}, this.#viewData || {}, state || {})
        return this.#view.renderSync(templatePath, state)
      },
      renderRaw: async (contents: string, state?: Record<string, any>, templatePath?: string) => {
        this.#viewData = Object.assign({}, this.#viewData || {}, state || {})
        return await this.#view.renderRaw(contents, state, templatePath)
      },
      renderRawSync: (contents: string, state?: Record<string, any>, templatePath?: string) => {
        this.#viewData = Object.assign({}, this.#viewData || {}, state || {})
        return this.#view.renderRawSync(contents, state, templatePath)
      },
    } as unknown as ReturnType<Edge['createRenderer']>
  }

  set view(renderer: ReturnType<Edge['createRenderer']>) {
    this.#view = renderer
  }

  get viewData(): Record<string, any> {
    return this.#viewData
  }

  set viewData(data: Record<string, any>) {
    this.#viewData = data
  }

  // Compatibility methods (maintained for backward compatibility)
  setId(id: string) {
    this.__id = id
  }

  getId() {
    return this.__id
  }

  setName(name: string) {
    this.__name = name
  }

  setViewPath(view: string) {
    this.viewPath = view
  }

  getName() {
    return this.__name
  }

  async render(): Promise<string> {
    return this.view.render(this.viewPath)
  }

  skipRender(html?: string) {
    store(this).set('skipRender', html ?? true)
  }

  skipMount() {
    store(this).set('skipMount', true)
  }

  skipHydrate() {
    store(this).set('skipHydrate', true)
  }
}
