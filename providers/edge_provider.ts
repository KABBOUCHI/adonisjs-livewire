import { fsReadAll, slash } from '@adonisjs/core/helpers'
import { importDefault } from '@poppinss/utils'

import type { ApplicationService } from '@adonisjs/core/types'
import { basename, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import edge from 'edge.js'
import { EdgeComponent } from '../index.js'
import { ComponentTagCompiler } from '../src/component_tag_compiler.js'

const JS_MODULES = ['.js', '.cjs', '.mjs']

export default class EdgeProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * The container bindings have booted
   */
  async boot() {
    const edgeComponents: Record<string, typeof EdgeComponent> = {}
    const edgeComponentFiles = await fsReadAll(this.app.relativePath('app/components'), {
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

    for (let file of edgeComponentFiles) {
      if (file.endsWith('.ts')) {
        file = file.replace(/\.ts$/, '.js')
      }

      const relativeFileName = slash(
        relative(this.app.relativePath('app/components'), fileURLToPath(file))
      )

      const componentClass = (await importDefault(
        () => import(file),
        relativeFileName
      )) as typeof EdgeComponent
      const componentName = relativeFileName.replace(/\.js$/, '')

      edgeComponents[componentName] = componentClass
    }

    async function renderEdgeComponent(name: string, { $props, $slots, $caller }: any) {
      if (!(name in edgeComponents)) {
        return `Component ${name} not found`
      }

      const componentClass = edgeComponents[name]

      // @ts-ignore
      const component = new componentClass($props.all())
      const renderer = edge.createRenderer()

      component.$props = $props
      component.$slots = $slots
      component.$caller = $caller

      const prototype = Object.getPrototypeOf(component)
      const props = Object.getOwnPropertyNames(prototype)
      let data: Record<string, any> = {}

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
        } else {
          data[prop] = component[prop]
        }
      }

      for (const key of Object.keys(component)) {
        data[key] = component[key]
      }

      for (const key of Object.keys($props)) {
        data[key] = $props[key]
      }

      data['$slots'] = $slots
      data['$props'] = $props
      data['$caller'] = $caller

      renderer.share(data)

      component.view = renderer

      return await renderer.renderRaw(await component.render())
    }

    edge.global('renderEdgeComponent', renderEdgeComponent)

    for (const key of Object.keys(edgeComponents)) {
      edge.registerTemplate(key, {
        template: `{{{ await renderEdgeComponent("${key}", { $props, $slots, $caller }) }}}`,
      })
    }

    edge.processor.process('raw', (value) => {
      const compiled = ComponentTagCompiler.compile(value.raw, this.app)

      return compiled
    })
  }
}