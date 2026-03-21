import { test } from '@japa/runner'
import {
  htmlspecialchars,
  inverter,
  escapeStringForHtml,
  stringifyHtmlAttributes,
  insertAttributesIntoHtmlRoot,
} from '../../src/utils/html.js'

test.group('htmlspecialchars', () => {
  test('should escape ampersand', async ({ assert }) => {
    const result = htmlspecialchars('Hello & World')
    assert.equal(result, 'Hello &amp; World')
  })

  test('should escape less than', async ({ assert }) => {
    const result = htmlspecialchars('Hello < World')
    assert.equal(result, 'Hello &lt; World')
  })

  test('should escape greater than', async ({ assert }) => {
    const result = htmlspecialchars('Hello > World')
    assert.equal(result, 'Hello &gt; World')
  })

  test('should escape double quotes', async ({ assert }) => {
    const result = htmlspecialchars('Hello "World"')
    assert.equal(result, 'Hello &quot;World&quot;')
  })

  test('should escape single quotes', async ({ assert }) => {
    const result = htmlspecialchars("Hello 'World'")
    assert.equal(result, 'Hello &#039;World&#039;')
  })

  test('should escape all special characters', async ({ assert }) => {
    const result = htmlspecialchars('<script>alert("xss")</script>')
    assert.equal(result, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  test('should handle empty string', async ({ assert }) => {
    const result = htmlspecialchars('')
    assert.equal(result, '')
  })

  test('should handle string without special characters', async ({ assert }) => {
    const result = htmlspecialchars('Hello World')
    assert.equal(result, 'Hello World')
  })
})

test.group('inverter', () => {
  test('should convert &amp; back to &', async ({ assert }) => {
    const result = inverter('Hello &amp; World')
    assert.equal(result, 'Hello & World')
  })

  test('should convert &lt; back to <', async ({ assert }) => {
    const result = inverter('Hello &lt; World')
    assert.equal(result, 'Hello < World')
  })

  test('should convert &gt; back to >', async ({ assert }) => {
    const result = inverter('Hello &gt; World')
    assert.equal(result, 'Hello > World')
  })

  test('should convert &quot; back to "', async ({ assert }) => {
    const result = inverter('Hello &quot;World&quot;')
    assert.equal(result, 'Hello "World"')
  })

  test("should convert &#039; back to '", async ({ assert }) => {
    const result = inverter('Hello &#039;World&#039;')
    assert.equal(result, "Hello 'World'")
  })

  test('should convert all HTML entities back', async ({ assert }) => {
    const result = inverter('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    assert.equal(result, '<script>alert("xss")</script>')
  })

  test('should handle empty string', async ({ assert }) => {
    const result = inverter('')
    assert.equal(result, '')
  })

  test('should handle string without HTML entities', async ({ assert }) => {
    const result = inverter('Hello World')
    assert.equal(result, 'Hello World')
  })

  test('should be inverse of htmlspecialchars', async ({ assert }) => {
    const original = '<script>alert("xss")</script>'
    const escaped = htmlspecialchars(original)
    const inverted = inverter(escaped)

    assert.equal(inverted, original)
  })
})

test.group('escapeStringForHtml', () => {
  test('should escape string values', async ({ assert }) => {
    const result = escapeStringForHtml('Hello "World"')
    assert.equal(result, 'Hello &quot;World&quot;')
  })

  test('should escape number values', async ({ assert }) => {
    const result = escapeStringForHtml(42)
    assert.equal(result, '42')
  })

  test('should stringify and escape object values', async ({ assert }) => {
    const result = escapeStringForHtml({ name: 'John', age: 30 })
    assert.equal(result, '{"name":"John","age":30}')
  })

  test('should stringify and escape array values', async ({ assert }) => {
    const result = escapeStringForHtml([1, 2, 3])
    assert.equal(result, '[1,2,3]')
  })

  test('should handle nested objects', async ({ assert }) => {
    const result = escapeStringForHtml({ user: { name: 'John' } })
    assert.equal(result, '{"user":{"name":"John"}}')
  })

  test('should handle objects with special characters in values', async ({ assert }) => {
    const result = escapeStringForHtml({ message: 'Hello "World"' })
    // JSON.stringify already escapes quotes inside values as \"
    assert.equal(result, '{"message":"Hello \\"World\\""}')
  })

  test('should handle null', async ({ assert }) => {
    const result = escapeStringForHtml(null)
    assert.equal(result, 'null')
  })

  test('should handle boolean', async ({ assert }) => {
    const result1 = escapeStringForHtml(true)
    const result2 = escapeStringForHtml(false)
    assert.equal(result1, 'true')
    assert.equal(result2, 'false')
  })
})

test.group('stringifyHtmlAttributes', () => {
  test('should convert object to HTML attributes string', async ({ assert }) => {
    const result = stringifyHtmlAttributes({ class: 'btn', id: 'submit' })
    assert.equal(result, 'class="btn" id="submit"')
  })

  test('should escape attribute values', async ({ assert }) => {
    const result = stringifyHtmlAttributes({ title: 'Hello "World"' })
    assert.equal(result, 'title="Hello &quot;World&quot;"')
  })

  test('should handle multiple attributes', async ({ assert }) => {
    const result = stringifyHtmlAttributes({
      class: 'btn',
      id: 'submit',
      type: 'button',
      disabled: 'true',
    })
    assert.equal(result, 'class="btn" id="submit" type="button" disabled="true"')
  })

  test('should handle object values', async ({ assert }) => {
    const result = stringifyHtmlAttributes({ 'data-config': { key: 'value' } })
    assert.equal(result, 'data-config="{&quot;key&quot;:&quot;value&quot;}"')
  })

  test('should handle array values', async ({ assert }) => {
    const result = stringifyHtmlAttributes({ 'data-items': [1, 2, 3] })
    assert.equal(result, 'data-items="[1,2,3]"')
  })

  test('should handle numeric values', async ({ assert }) => {
    const result = stringifyHtmlAttributes({ 'data-count': 42 })
    assert.equal(result, 'data-count="42"')
  })

  test('should handle empty object', async ({ assert }) => {
    const result = stringifyHtmlAttributes({})
    assert.equal(result, '')
  })

  test('should handle special characters in attribute names', async ({ assert }) => {
    const result = stringifyHtmlAttributes({ 'data-test': 'value' })
    assert.equal(result, 'data-test="value"')
  })
})

test.group('insertAttributesIntoHtmlRoot', () => {
  test('should insert attributes into root HTML tag', async ({ assert }) => {
    const html = '<div>Content</div>'
    const result = insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })

    assert.equal(result, '<div data-id="123">Content</div>')
  })

  test('should insert multiple attributes', async ({ assert }) => {
    const html = '<div>Content</div>'
    const result = insertAttributesIntoHtmlRoot(html, { 'data-id': '123', 'class': 'container' })

    assert.include(result, 'data-id="123"')
    assert.include(result, 'class="container"')
    assert.include(result, '<div')
    assert.include(result, '>Content</div>')
  })

  test('should handle HTML with whitespace before tag', async ({ assert }) => {
    const html = '  <div>Content</div>'
    const result = insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })

    assert.include(result, 'data-id="123"')
    assert.include(result, '<div')
  })

  test('should handle HTML with newline before tag', async ({ assert }) => {
    const html = '\n<div>Content</div>'
    const result = insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })

    assert.include(result, 'data-id="123"')
    assert.include(result, '<div')
  })

  test('should handle different tag names', async ({ assert }) => {
    const html1 = '<span>Content</span>'
    const html2 = '<section>Content</section>'
    const html3 = '<article>Content</article>'

    const result1 = insertAttributesIntoHtmlRoot(html1, { 'data-id': '123' })
    const result2 = insertAttributesIntoHtmlRoot(html2, { 'data-id': '123' })
    const result3 = insertAttributesIntoHtmlRoot(html3, { 'data-id': '123' })

    assert.include(result1, '<span data-id="123"')
    assert.include(result2, '<section data-id="123"')
    assert.include(result3, '<article data-id="123"')
  })

  test('should handle tags with hyphens', async ({ assert }) => {
    const html = '<my-component>Content</my-component>'
    const result = insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })

    assert.include(result, '<my-component data-id="123"')
  })

  test('should handle tags with numbers', async ({ assert }) => {
    const html = '<div1>Content</div1>'
    const result = insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })

    assert.include(result, '<div1 data-id="123"')
  })

  test('should escape attribute values', async ({ assert }) => {
    const html = '<div>Content</div>'
    const result = insertAttributesIntoHtmlRoot(html, { title: 'Hello "World"' })

    assert.include(result, 'title="Hello &quot;World&quot;"')
  })

  test('should throw error when no HTML tag is found', async ({ assert }) => {
    const html = 'Just text content, no tags'

    assert.throws(() => {
      insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })
    }, 'Could not find HTML tag in HTML string.')
  })

  test('should throw error for empty string', async ({ assert }) => {
    const html = ''

    assert.throws(() => {
      insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })
    }, 'Could not find HTML tag in HTML string.')
  })

  test('should handle complex HTML structure', async ({ assert }) => {
    const html = '<div class="existing">\n  <p>Nested content</p>\n</div>'
    const result = insertAttributesIntoHtmlRoot(html, { 'data-id': '123' })

    assert.include(result, '<div')
    assert.include(result, 'data-id="123"')
    assert.include(result, 'class="existing"')
  })
})
