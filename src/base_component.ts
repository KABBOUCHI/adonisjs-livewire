import type { HttpContext } from '@adonisjs/core/http'
import { store } from './store.js'
import { Edge } from 'edge.js'

export class BaseComponent {
  protected __ctx: HttpContext | null = null

  // @ts-ignore
  protected __id: string
  // @ts-ignore
  protected __name: string
  // @ts-ignore
  protected __view_path: string

  declare bindings: any

  declare view: ReturnType<Edge['createRenderer']>

  get ctx() {
    if (!this.__ctx) throw new Error('Cannot access http context. Please enable ASL.')

    return this.__ctx
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
