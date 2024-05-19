import type { HttpContext } from '@adonisjs/core/http'
import { store } from './store.js'
import edge, { Template } from 'edge.js'
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
    return {
      render: (templatePath: string, state: Record<string, any> = {}): Promise<string> => {
        let compiledTemplate = edge.asyncCompiler.compile(templatePath)
        let extracted = {
          locals: {},
        }
        this.ctx.view.renderRawSync(`@eval(extracted.locals = state)`, {
          extracted,
        })
        let templ = new Template(edge.asyncCompiler, edge.globals, {}, edge.processor)

        const instance = new Proxy(this, {
          get(target, prop, receiver) {
            if (prop in target) {
              return Reflect.get(target, prop, receiver)
            }

            if (prop in state) {
              return Reflect.get(state, prop, receiver)
            }

            if (prop in extracted.locals) {
              return Reflect.get(extracted.locals, prop, receiver)
            }

            return Reflect.get(edge.globals, prop, receiver)
          },
        })

        return compiledTemplate(templ, instance, {}).then((output: any) =>
          edge.processor.executeOutput({
            output,
            template: templ,
            state: instance,
          })
        )
      },
      renderRaw: (template: string, state: Record<string, any> = {}): Promise<string> => {
        let compiledTemplate = edge.asyncCompiler.compileRaw(template)
        let extracted = {
          locals: {},
        }
        this.ctx.view.renderRawSync(`@eval(extracted.locals = state)`, {
          extracted,
        })
        let templ = new Template(edge.asyncCompiler, edge.globals, {}, edge.processor)
        const instance = new Proxy(this, {
          get(target, prop, receiver) {
            if (prop in target) {
              return Reflect.get(target, prop, receiver)
            }

            if (prop in state) {
              return Reflect.get(state, prop, receiver)
            }

            if (prop in extracted.locals) {
              return Reflect.get(extracted.locals, prop, receiver)
            }

            return Reflect.get(edge.globals, prop, receiver)
          },
        })
        return compiledTemplate(templ, instance, {}).then((output: any) =>
          edge.processor.executeOutput({
            output,
            template: templ,
            state: instance,
          })
        )
      },
    }
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
