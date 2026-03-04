/**
 * Extract server code and template from a Single File Component (SFC)
 *
 * Parses a Livewire SFC file that contains both server-side code
 * (in `<script server>` tags) and template markup.
 *
 * @param content - The full content of the SFC file
 * @returns Object with `serverCode` and `template` properties
 *
 * @example
 * ```ts
 * const content = `
 * <script server>
 *   export default class Counter extends Component {
 *     count = 0
 *   }
 * </script>
 * <div>{{ count }}</div>
 * `
 *
 * const { serverCode, template } = extractComponentParts(content)
 * // serverCode: 'export default class Counter extends Component { ... }'
 * // template: '<div>{{ count }}</div>'
 * ```
 */
export function extractComponentParts(content: string): {
  serverCode: string
  template: string
} {
  const serverCodePattern = /<script server>([\s\S]*?)<\/script>/
  const templatePattern = /<script server>[\s\S]*?<\/script>([\s\S]*)/

  const serverCodeMatch = content.match(serverCodePattern)
  const serverCode = serverCodeMatch ? serverCodeMatch[1].trim() : ''

  const templateMatch = content.match(templatePattern)
  const template = templateMatch ? templateMatch[1].trim() : content.trim()

  return {
    serverCode,
    template,
  }
}
