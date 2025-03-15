import { fsReadAll, slash } from '@adonisjs/core/helpers'
import { importDefault } from '@poppinss/utils'

import type { ApplicationService } from '@adonisjs/core/types'
import { basename, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import edge from 'edge.js'
import { ViewComponent } from '../index.js'
import { edgeTags } from 'edge-tags'

const JS_MODULES = ['.js', '.cjs', '.mjs']

export default class ViewProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * The container bindings have booted
   */
  async boot() {
    const viewComponents: Record<string, typeof ViewComponent> = {}
    const viewComponentFiles = await fsReadAll(this.app.relativePath('app/components'), {
      pathType: 'url',
      ignoreMissingRoot: true,
      filter: (filePath: string) => {
        const ext = extname(filePath)

        if (basename(filePath).startsWith('_')) {
          return false
        }

        if (JS_MODULES.includes(ext)) {
          return true
        }

        if (ext === '.ts' && !filePath.endsWith('.d.ts')) {
          return true
        }

        return false
      },
    })

    for (let file of viewComponentFiles) {
      if (file.endsWith('.ts')) {
        file = file.replace(/\.ts$/, '.js')
      }

      const relativeFileName = slash(
        relative(this.app.relativePath('app/components'), fileURLToPath(file))
      )

      const componentClass = (await importDefault(
        () => import(file),
        relativeFileName
      )) as typeof ViewComponent
      const componentName = relativeFileName.replace(/\.js$/, '')

      viewComponents[componentName] = componentClass
    }

    async function renderViewComponent(
      name: string | ViewComponent,
      { $props, $slots, $caller }: any = {}
    ) {
      if (typeof name === 'string' && !(name in viewComponents)) {
        return `Component ${name} not found`
      }

      // @ts-ignore
      const component = typeof name === 'string' ? new viewComponents[name]($props.all()) : name
      const renderer = edge.createRenderer()

      component.$props = $props
      component.$slots = $slots
      component.$caller = $caller

      let data: Record<string, any> = {}
      let prototype = Object.getPrototypeOf(component)

      while (prototype && prototype !== Object.prototype) {
        const props = Object.getOwnPropertyNames(prototype)

        for (const prop of props) {
          if (['constructor', 'render'].includes(prop)) {
            continue
          }

          const descriptor = Object.getOwnPropertyDescriptor(prototype, prop)

          if (descriptor && (descriptor.get || descriptor.set)) {
            data = Object.assign(data, {
              get [prop]() {
                return component[prop]
              },
            })
          } else if (typeof component[prop] === 'function') {
            data[prop] = component[prop].bind(component)
          } else {
            data[prop] = component[prop]
          }
        }

        prototype = Object.getPrototypeOf(prototype)
      }

      for (const key of Object.keys(component)) {
        data[key] = component[key]
      }

      for (const key of Object.keys($props || {})) {
        data[key] = $props[key]
      }

      data['$slots'] = $slots
      data['$props'] = $props
      data['$caller'] = $caller

      renderer.share(data)

      component.view = renderer

      return await renderer.renderRaw(await component.render())
    }

    edge.global('renderViewComponent', renderViewComponent)

    //@ts-ignore
    this.app.container.bindValue('renderViewComponent', renderViewComponent)

    for (const key of Object.keys(viewComponents)) {
      edge.registerTemplate(key, {
        template: `{{{ await renderViewComponent("${key}", { $props, $slots, $caller }) }}}`,
      })
    }

    edge.use(edgeTags)
  }
}
