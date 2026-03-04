import type {
  TagContract,
  ParserContract,
  EdgeBufferContract,
  TagTokenContract,
} from 'edge.js/types'
import string from '@adonisjs/core/helpers/string'
import { getLivewireContext } from '../../store.js'
import { store } from '../../store.js'

/**
 * Edge tag that renders a Livewire component
 *
 * The @livewire tag renders a Livewire component in Edge templates.
 * Components can be referenced by name or class, and can receive props and options.
 *
 * @example
 * ```edge
 * {{-- Render component by name --}}
 * @livewire('counter', { count: 0 })
 *
 * {{-- With options --}}
 * @livewire('counter', { count: 0 }, { key: 'unique-key' })
 * ```
 */
export const livewireTag: TagContract = {
  block: false,
  tagName: 'livewire',
  seekable: true,
  compile(parser: ParserContract, buffer: EdgeBufferContract, token: TagTokenContract): void {
    const parsed = parser.utils.transformAst(
      parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
      token.filename,
      parser
    )

    if (parsed.expressions) {
      const componentClass = parser.utils.stringify(parsed.expressions[0])
      const componentParams = parsed.expressions[1]
        ? parser.utils.stringify(parsed.expressions[1])
        : '[]'
      const componentOptions = parsed.expressions[2]
        ? parser.utils.stringify(parsed.expressions[2])
        : '{}'
      buffer.outputExpression(
        `await state.livewire.mount(${componentClass}, ${componentParams}, ${componentOptions})`,
        token.filename,
        token.loc.start.line,
        false
      )
    } else {
      const componentClass = parser.utils.stringify(parsed)
      buffer.outputExpression(
        `await state.livewire.mount(${componentClass})`,
        token.filename,
        token.loc.start.line,
        false
      )
    }
  },
}

/**
 * Edge tag that outputs Livewire CSS styles
 *
 * The @livewireStyles tag outputs the necessary CSS stylesheet link for Livewire.
 * Should be placed in the <head> section of your layout.
 *
 * @example
 * ```edge
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   @livewireStyles()
 * </head>
 * <body>
 *   @livewire('app')
 * </body>
 * </html>
 * ```
 */
export const livewireStylesTag = (version: string): TagContract => ({
  block: false,
  tagName: 'livewireStyles',
  seekable: false,
  compile(_parser, buffer, _token) {
    buffer.outputRaw(`<link rel="stylesheet" href="/livewire.css?v=${version}">`)
  },
})

/**
 * Edge tag that outputs Livewire JavaScript
 *
 * The @livewireScripts tag outputs the necessary JavaScript for Livewire.
 * Should be placed before the closing </body> tag in your layout.
 *
 * @example
 * ```edge
 * <body>
 *   @livewire('app')
 *   @livewireScripts()
 * </body>
 * </html>
 * ```
 */
export const livewireScriptsTag = (version: string): TagContract => ({
  block: false,
  tagName: 'livewireScripts',
  seekable: false,
  compile(_parser, buffer, token) {
    buffer.outputExpression(
      '`<script src="/livewire.js?v=' +
        version +
        '" data-csrf="${state.request.csrfToken ?? \'\'}" data-update-uri="/livewire/update" data-navigate-once="true"></script>`',
      token.filename,
      token.loc.start.line,
      false
    )
  },
})

/**
 * Edge tag for server-side scripts
 *
 * The @script tag allows you to define JavaScript that should be executed
 * on the server side and included in the Livewire response.
 *
 * @example
 * ```edge
 * @script
 *   console.log('This runs on the server')
 * @end
 * ```
 */
export const scriptTag: TagContract = {
  tagName: 'script',
  block: true,
  seekable: false,
  compile: async (_parser, _buffer, token) => {
    let output = ''

    let key = string.generateRandom(32)

    for (let child of token.children) {
      if (child.type === 'raw') {
        output += child.value
      } else if (child.type === 'newline') {
        output += '\n'
      } else if (child.type === 'mustache') {
        output += `{{ ${child.properties.jsArg} }}`
      } else if (child.type === 's__mustache') {
        output += `{{{ ${child.properties.jsArg} }}}`
      } else {
        console.log(child.type, child)
      }
    }

    const { context } = getLivewireContext()!

    const s = store(context.component)

    s.push(
      'scripts',
      await context.component.view.renderRaw(output, context.component.viewData || {}),
      key
    )
  },
}

/**
 * Edge tag for server-side assets
 *
 * The @assets tag allows you to define assets (CSS, JS, etc.) that should be
 * included in the Livewire response.
 *
 * @example
 * ```edge
 * @assets
 *   <link rel="stylesheet" href="/custom.css">
 * @end
 * ```
 */
export const assetsTag: TagContract = {
  tagName: 'assets',
  block: true,
  seekable: false,
  async compile(_parser, _buffer, token) {
    let output = ''

    let key = string.generateRandom(32)

    for (let child of token.children) {
      if (child.type === 'raw') {
        output += child.value
      } else if (child.type === 'newline') {
        output += '\n'
      } else if (child.type === 'mustache') {
        output += `{{ ${child.properties.jsArg} }}`
      } else if (child.type === 's__mustache') {
        output += `{{{ ${child.properties.jsArg} }}}`
      } else {
        console.log(child.type, child)
      }
    }

    const { context } = getLivewireContext()!

    const s = store(context.component)

    s.push(
      'assets',
      await context.component.view.renderRaw(output, context.component.viewData || {}),
      key
    )
  },
}
