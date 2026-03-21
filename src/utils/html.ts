/**
 * Escape HTML special characters
 *
 * Converts special characters to their HTML entity equivalents
 * to prevent XSS attacks and ensure proper HTML rendering.
 *
 * @param text - The text to escape
 * @returns Escaped HTML string
 *
 * @example
 * ```ts
 * htmlspecialchars('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function htmlspecialchars(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }

  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Inverte entidades HTML de volta para caracteres normais
 *
 * Converte entidades HTML de volta para seus caracteres originais,
 * fazendo o processo inverso de htmlspecialchars.
 *
 * @param text - O texto com entidades HTML a ser convertido
 * @returns String com caracteres normais
 *
 * @example
 * ```ts
 * inverter('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
 * // Returns: '<script>alert("xss")</script>'
 * ```
 */
export function inverter(text: string): string {
  const map: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
  }

  return text.replace(/&(amp|lt|gt|quot|#039);/g, (m) => map[m] || m)
}

/**
 * Escape a value for use in HTML attributes
 *
 * Handles strings, numbers, and objects (which are JSON stringified).
 *
 * @param subject - The value to escape
 * @returns Escaped string safe for HTML attributes
 *
 * @example
 * ```ts
 * escapeStringForHtml('Hello "World"')
 * // Returns: 'Hello &quot;World&quot;'
 *
 * escapeStringForHtml({ name: 'John' })
 * // Returns: '{"name":"John"}'
 * ```
 */
export function escapeStringForHtml(subject: any): string {
  if (typeof subject === 'string') {
    return htmlspecialchars(subject)
  }

  if (typeof subject === 'number') {
    return String(subject)
  }

  // For objects/arrays, just stringify (quotes will be escaped when used in HTML attributes)
  return JSON.stringify(subject)
}

/**
 * Convert an object of attributes to an HTML attributes string
 *
 * Takes an object of key-value pairs and converts them to a string
 * suitable for insertion into an HTML tag.
 *
 * @param attributes - Object with attribute names as keys and values
 * @returns Formatted HTML attributes string
 *
 * @example
 * ```ts
 * stringifyHtmlAttributes({ class: 'btn', id: 'submit' })
 * // Returns: 'class="btn" id="submit"'
 * ```
 */
export function stringifyHtmlAttributes(attributes: { [key: string]: any }): string {
  return Object.entries(attributes)
    .map(([key, value]) => {
      let escapedValue = escapeStringForHtml(value)
      // If value is an object/array (JSON string), escape quotes for HTML attributes
      if (typeof value === 'object' && value !== null) {
        escapedValue = escapedValue.replace(/"/g, '&quot;')
      }
      return `${key}="${escapedValue}"`
    })
    .join(' ')
}

/**
 * Insert attributes into the root HTML element
 *
 * Finds the first HTML tag in a string and inserts the provided attributes
 * into that tag. Useful for adding data attributes or other properties
 * to component root elements.
 *
 * @param html - The HTML string to modify
 * @param attributes - Attributes to insert into the root tag
 * @returns Modified HTML string with attributes inserted
 * @throws Error if no HTML tag is found
 *
 * @example
 * ```ts
 * insertAttributesIntoHtmlRoot('<div>Content</div>', { 'data-id': '123' })
 * // Returns: '<div data-id="123">Content</div>'
 * ```
 */
export function insertAttributesIntoHtmlRoot(
  html: string,
  attributes: { [key: string]: string }
): string {
  const attributesFormattedForHtmlElement = stringifyHtmlAttributes(attributes)

  const regex = /(?:\n\s*|^\s*)<([a-zA-Z0-9\-]+)/
  const matches = html.match(regex)

  if (!matches || matches.length === 0) {
    throw new Error('Could not find HTML tag in HTML string.')
  }

  const tagName = matches[1]
  const lengthOfTagName = tagName.length
  const positionOfFirstCharacterInTagName = html.indexOf(tagName)

  return (
    html.substring(0, positionOfFirstCharacterInTagName + lengthOfTagName) +
    ' ' +
    attributesFormattedForHtmlElement +
    html.substring(positionOfFirstCharacterInTagName + lengthOfTagName)
  )
}
