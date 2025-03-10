import type { ApplicationService } from '@adonisjs/core/types'
import edge from 'edge.js'
// import { existsSync } from 'node:fs'

const SELF_CLOSING_REGEX = /(<*..?)?<x-([a-zA-Z0-9\.\-\:]+)([^>]*)\/>(<*..?)?/g
const OPENING_REGEX =
  /(<*..?)?(<x-([a-zA-Z0-9\.\-\:]+)([^>]*)>([\s\S]*?(?:(?!<\/x-\1>).)*?)<\/x-\3>)(<*..?)?/g

export class ComponentTagCompiler {
  static compileSelfClosingTags(input: string, app?: ApplicationService): string {
    let raw = input
    let matches = input.match(SELF_CLOSING_REGEX)

    if (!matches) {
      return raw
    }

    for (const match of matches) {
      let [_, before, inside, diskName, component, props, after] =
        match.match(/(<*..?)?(<x-(?:(\w+)::)?([a-zA-Z0-9\.\-]+)([^>]*)\/>)(<*..?)?/) || []
      before = (before || '').trim()
      after = (after || '').trim()

      let attributes: any = {}
      if (props) {
        let regex = /(:)?([a-zA-Z0-9\-:.]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

        let subMatches = props.match(regex) || []
        let propsRemainder = props
        if (matches) {
          for (const subMatch of subMatches) {
            let [m, prefix, key, value, value2] =
              subMatch.match(/(:)?([a-zA-Z0-9\-:.]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/) || []
            value = value || value2
            if (prefix === ':') {
              attributes[key] = `_____${value}_____`
            } else {
              let curlyMatch = value.match(/(\\)?{{(.*?)}}/)

              if (curlyMatch) {
                attributes[key] =
                  `_____\`${value.replace(/\{\{\s*([^}]+)\s*\}\}/g, '${$1}')}\`_____`
              } else {
                attributes[key] = value
              }
            }

            if (m) {
              propsRemainder = propsRemainder.replace(m, '')
            }
          }
        }

        propsRemainder
          .split(' ')
          .map((prop) => prop.trim())
          .filter(Boolean)
          .forEach((prop) => {
            attributes[prop] = true
          })
      }
      const attrs = JSON.stringify(attributes).replace(/"_____([^"]*)_____"/g, '$1')

      let componentPath = component.replace(/\./g, '/')

      const prefix = diskName ? `${diskName}::` : ''
      if (app) {
        const components =
          edge.loader
            .listComponents()
            .find((l) => l.diskName === (diskName ?? 'default'))
            ?.components.map((c) => c.componentName) || []
        if (components.includes(prefix + componentPath)) {
        } else if (components.includes(prefix + `components/${componentPath}`)) {
          componentPath = `components/${componentPath}`
        } else if (components.includes(prefix + `${componentPath}/index`)) {
          componentPath = `${componentPath}/index`
        } else if (components.includes(prefix + `components/${componentPath}/index`)) {
          componentPath = `components/${componentPath}/index`
        }

        // if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
        //   componentPath = `components/${componentPath}`

        //   if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
        //     componentPath = componentPath + '/index'
        //   }
        // }
      }

      raw = raw.replace(
        inside,
        `${before !== '' && before !== '\n' ? '\n' : ''}@!component('${prefix}${componentPath}', ${attrs})${after !== '' && after !== '\n' ? '\n' : ''}`
      )
    }
    return raw
  }

  static compileOpeningTags(input: string, app?: ApplicationService): string {
    let raw = input

    let matches = raw.match(OPENING_REGEX)

    if (!matches) {
      return raw
    }
    for (const match of matches) {
      let [_, before, inside, diskName, component, props, content, __, after] =
        match.match(
          /(<*..?)?(<x-(?:(\w+)::)?([a-zA-Z0-9\.\-]+)([^>]*)>([\s\S]*?(?:(?!<\/x-\2>).)*?)<\/x-\3(::)?\4>)(<*..?)?/
        ) || []

      before = (before || '').trim()
      after = (after || '').trim()

      let attributes: any = {}
      if (props) {
        let regex = /(:)?([a-zA-Z0-9\-:.]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

        let subMatches = props.match(regex) || []
        let propsRemainder = props
        if (matches) {
          for (const subMatch of subMatches) {
            let [m, prefix, key, value, value2] =
              subMatch.match(/(:)?([a-zA-Z0-9\-:.]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/) || []
            value = value || value2
            if (prefix === ':') {
              attributes[key] = `_____${value}_____`
            } else {
              let curlyMatch = value.match(/(\\)?{{(.*?)}}/)

              if (curlyMatch) {
                attributes[key] =
                  `_____\`${value.replace(/\{\{\s*([^}]+)\s*\}\}/g, '${$1}')}\`_____`
              } else {
                attributes[key] = value
              }
            }

            if (m) {
              propsRemainder = propsRemainder.replace(m, '')
            }
          }
        }

        propsRemainder
          .split(' ')
          .map((prop) => prop.trim())
          .filter(Boolean)
          .forEach((prop) => {
            attributes[prop] = true
          })
      }
      const attrs = JSON.stringify(attributes).replace(/"_____([^"]*)_____"/g, '$1')

      let componentPath = component.replace(/\./g, '/')

      if (componentPath === 'slot' && attributes.name) {
        let name = JSON.stringify(attributes.name).replace(/"_____([^"]*)_____"/g, '$1')
        let maybeProps = attributes.props ? `, ${attributes.props}` : ``
        raw = raw.replace(match, `@slot(${name}${maybeProps})\n${content}\n@endslot`)
      } else {
        const prefix = diskName ? `${diskName}::` : ''
        if (app) {
          const components =
            edge.loader
              .listComponents()
              .find((l) => l.diskName === (diskName ?? 'default'))
              ?.components.map((c) => c.componentName) || []
          if (components.includes(prefix + componentPath)) {
          } else if (components.includes(prefix + `components/${componentPath}`)) {
            componentPath = `components/${componentPath}`
          } else if (components.includes(prefix + `${componentPath}/index`)) {
            componentPath = `${componentPath}/index`
          } else if (components.includes(prefix + `components/${componentPath}/index`)) {
            componentPath = `components/${componentPath}/index`
          }
          // if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
          //   componentPath = `components/${componentPath}`

          //   if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
          //     componentPath = componentPath + '/index'
          //   }
          // }
        }

        raw = raw.replace(
          inside,
          `${before !== '' && before !== '\n' ? '\n' : ''}@component('${prefix}${componentPath}', ${attrs})\n${content}\n@end${after !== '' && after !== '\n' ? '\n' : ''}`
        )
      }
    }

    if (raw.match(OPENING_REGEX)) {
      raw = ComponentTagCompiler.compileOpeningTags(raw, app)
    }

    return raw
  }

  static compile(input: string, app?: ApplicationService): string {
    return [this.compileSelfClosingTags, this.compileOpeningTags].reduce((raw, fn) => {
      return fn(raw, app)
    }, input)
  }
}
