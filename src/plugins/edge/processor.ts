/**
 * Processor for Livewire component syntax
 *
 * Processes the `<livewire:.../>` syntax and converts it to `@livewire(...)` tag syntax.
 * This allows users to use HTML-like syntax for Livewire components.
 *
 * @example
 * ```edge
 * {{-- This syntax: --}}
 * <livewire:counter count="5" />
 *
 * {{-- Gets converted to: --}}
 * @livewire('counter', { count: '5' })
 * ```
 */
export function processLivewireComponents(raw: string): string {
  let regex = /<livewire:([a-zA-Z0-9\.\-]+)([^>]*)\/>/g

  let matches = raw.match(regex)

  if (!matches) {
    return raw
  }

  for (const match of matches) {
    let [, component, props] = match.match(/<livewire:([a-zA-Z0-9\.\-:.]+)([^>]*)\/>/) || []
    let attributes: any = {}
    let options: any = {}
    if (props) {
      let regexProps = /(@|:|wire:)?([a-zA-Z0-9\-:.]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

      let matchesProps = props.match(regexProps)
      let propsRemainder = props

      if (matchesProps) {
        for (const matchProp of matchesProps) {
          let [m, prefix, key, value] =
            matchProp.match(/(@|:|wire:)?([a-zA-Z0-9\-:.]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/) || []
          // Handle :is and :component as Edge bindings (treat value as variable, not string)
          if (prefix === ':' && (key === 'is' || key === 'component')) {
            attributes[key] = value // Store variable name directly, will be used as Edge expression
          } else if (prefix === ':' && key !== 'is' && key !== 'component') {
            attributes[key] = `_____${value}_____`
          } else if (prefix === 'wire:' && key === 'key') {
            options.key = `_____${value}_____`
          } else if (prefix === 'wire:') {
            if (key === 'model') {
              attributes[`wire:${key}`] = '$parent.' + value
            } else {
              attributes[`wire:${key}`] = value
            }
          } else {
            let curlyMatch = value.match(/(\\)?{{(.*?)}}/)
            if (curlyMatch) {
              attributes[`${prefix ?? ''}${key}`] =
                `_____\`${value.replace(/\{\{\s*([^}]+)\s*\}\}/g, '${$1}')}\`_____`
            } else {
              attributes[`${prefix ?? ''}${key}`] = value
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

    if (component === 'dynamic-component' || component === 'is') {
      component = attributes['component'] ?? attributes['is']
      delete attributes['component']
      delete attributes['is']
      // If component is still a string (from component="..." or :is="..."), keep it as variable
      // Don't add quotes - it should be treated as Edge variable/expression
    } else {
      component = `'${component}'`
    }

    const attrs = JSON.stringify(attributes).replace(/"_____([^"]*)_____"/g, '$1')
    const opts = JSON.stringify(options).replace(/"_____([^"]*)_____"/g, '$1')

    raw = raw.replace(match, `@livewire(${component}, ${attrs}, ${opts})`)
  }
  return raw
}
