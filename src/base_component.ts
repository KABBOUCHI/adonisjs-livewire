import type { HttpContext } from '@adonisjs/core/http'
import { store } from './store.js'
import { Edge } from 'edge.js'
import { ApplicationService } from '@adonisjs/core/types'

export class BaseComponent {
  // @ts-ignore
  protected __id: string
  // @ts-ignore
  protected __name: string
  // @ts-ignore
  protected __view_path: string

  declare bindings: any

  declare app: ApplicationService
  declare ctx: HttpContext

  declare __view: ReturnType<Edge['createRenderer']>
  declare __view_data: Record<string, any>

  get view() {
    return {
      share: (data: Record<string, any>) => {
        return this.__view.share(data)
      },

      render: async (templatePath: string, state?: Record<string, any>) => {
        this.__view_data = Object.assign({}, this.__view_data || {}, state || {})
        return await this.__view.render(templatePath, state)
      },
      renderSync: (templatePath: string, state?: Record<string, any>) => {
        this.__view_data = Object.assign({}, this.__view_data || {}, state || {})
        return this.__view.renderSync(templatePath, state)
      },
      renderRaw: async (contents: string, state?: Record<string, any>, templatePath?: string) => {
        this.__view_data = Object.assign({}, this.__view_data || {}, state || {})
        return await this.__view.renderRaw(contents, state, templatePath)
      },
      renderRawSync: (contents: string, state?: Record<string, any>, templatePath?: string) => {
        this.__view_data = Object.assign({}, this.__view_data || {}, state || {})
        return this.__view.renderRawSync(contents, state, templatePath)
      },
    } as any
  }

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
    this.__view_path = view
  }

  getName() {
    return this.__name
  }

  async render(): Promise<string> {
    return this.view.render(this.__view_path)
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
