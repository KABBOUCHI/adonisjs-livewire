import type { HttpContext } from '@adonisjs/core/http'
import { store } from './store.js'
export class BaseComponent {
  protected __ctx: HttpContext | null = null

  // @ts-ignore
  protected __id: string
  // @ts-ignore
  protected __name: string
  // @ts-ignore
  protected __view_path: string

  declare bindings: any

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

  get view() {
    return new Proxy(this.ctx.view, {
      get: (target, prop) => {
        if (prop === 'render') {
          return async (templatePath: string, state?: any) => {
            const rendered = await target.render(`${templatePath}`, {
              ...this,
              ...this.extractPublicMethods(),
              ...(state || {}),
            })

            return rendered
          }
        }

        if (prop === 'renderRaw') {
          return async (contents: string, state?: any) => {
            const rendered = await target.renderRaw(contents, {
              ...this,
              ...this.extractPublicMethods(),
              ...(state || {}),
            })

            return rendered
          }
        }

        return target[prop]
      },
    }) as any
  }

  extractPublicMethods() {
    let methods = this.getPublicMethods()

    return methods.reduce((obj: any, method) => {
      // @ts-ignore
      obj[method] = this[method].bind(this)
      return obj
    }, {} as any)
  }

  getPublicMethods() {
    const proto = Object.getPrototypeOf(this)

    return Object.getOwnPropertyNames(proto).filter(
      (prop) => typeof proto[prop] === 'function' && prop !== 'constructor' && prop !== 'render'
    )
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
