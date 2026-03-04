import { test } from '@japa/runner'
import { extractComponentParts } from '../../src/utils/component.js'

test.group('extractComponentParts', () => {
  test('should extract server code from SFC', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0
        }
      </script>
      <div>{{ count }}</div>
    `

    const { serverCode, template } = extractComponentParts(content)

    assert.include(serverCode, 'export default class Counter')
    assert.include(serverCode, 'count = 0')
    assert.include(template, '<div>{{ count }}</div>')
  })

  test('should extract template from SFC', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0
        }
      </script>
      <div>{{ count }}</div>
      <button wire:click="increment">Increment</button>
    `

    const { template } = extractComponentParts(content)

    assert.include(template, '<div>{{ count }}</div>')
    assert.include(template, '<button wire:click="increment">Increment</button>')
  })

  test('should handle multiple script server tags', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0
        }
      </script>
      <script server>
        // Additional code
        increment() {
          this.count++
        }
      </script>
      <div>{{ count }}</div>
    `

    const { serverCode, template } = extractComponentParts(content)

    // Should extract first script server tag
    assert.include(serverCode, 'export default class Counter')
    assert.include(template, '<div>{{ count }}</div>')
  })

  test('should handle content without script server tag', async ({ assert }) => {
    const content = `
      <div>Just a template</div>
      <p>No server code</p>
    `

    const { serverCode, template } = extractComponentParts(content)

    assert.equal(serverCode.trim(), '')
    assert.include(template, '<div>Just a template</div>')
    assert.include(template, '<p>No server code</p>')
  })

  test('should preserve whitespace and formatting in server code', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0

          increment() {
            this.count++
          }
        }
      </script>
      <div>{{ count }}</div>
    `

    const { serverCode } = extractComponentParts(content)

    assert.include(serverCode, 'count = 0')
    assert.include(serverCode, 'increment()')
    assert.include(serverCode, 'this.count++')
  })

  test('should preserve whitespace and formatting in template', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0
        }
      </script>
      <div>
        <p>{{ count }}</p>
        <button>Click</button>
      </div>
    `

    const { template } = extractComponentParts(content)

    assert.include(template, '<div>')
    assert.include(template, '<p>{{ count }}</p>')
    assert.include(template, '<button>Click</button>')
  })

  test('should handle empty script server tag', async ({ assert }) => {
    const content = `
      <script server>
      </script>
      <div>Content</div>
    `

    const { serverCode, template } = extractComponentParts(content)

    assert.equal(serverCode.trim(), '')
    assert.include(template, '<div>Content</div>')
  })

  test('should handle script server tag with only whitespace', async ({ assert }) => {
    const content = `
      <script server>
        
      </script>
      <div>Content</div>
    `

    const { serverCode, template } = extractComponentParts(content)

    assert.equal(serverCode.trim(), '')
    assert.include(template, '<div>Content</div>')
  })

  test('should handle complex server code', async ({ assert }) => {
    const content = `
      <script server>
        import { computed } from '@adonisjs/livewire'

        export default class ComplexComponent extends Component {
          items = []

          get total() {
            return this.items.reduce((sum, item) => sum + item.price, 0)
          }

          async loadItems() {
            this.items = await fetchItems()
          }
        }
      </script>
      <div>
        <ul>
          @each(item in items)
            <li>{{ item.name }} - \${{ item.price }}</li>
          @endeach
        </ul>
        <p>Total: \${{ total }}</p>
      </div>
    `

    const { serverCode, template } = extractComponentParts(content)

    assert.include(serverCode, 'import { computed }')
    assert.include(serverCode, 'export default class ComplexComponent')
    assert.include(serverCode, 'items = []')
    assert.include(serverCode, 'get total()')
    assert.include(serverCode, 'async loadItems()')

    assert.include(template, '<div>')
    assert.include(template, '@each(item in items)')
    assert.include(template, 'Total: ${{ total }}')
  })

  test('should handle template with Edge syntax', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0
        }
      </script>
      <div>
        @if(count > 0)
          <p>Count is positive: {{ count }}</p>
        @else
          <p>Count is zero or negative</p>
        @endif
      </div>
    `

    const { template } = extractComponentParts(content)

    assert.include(template, '@if(count > 0)')
    assert.include(template, '@else')
    assert.include(template, '@endif')
    assert.include(template, 'Count is positive: {{ count }}')
  })

  test('should trim extracted server code', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0
        }
      </script>
      <div>{{ count }}</div>
    `

    const { serverCode } = extractComponentParts(content)

    // Should not start or end with newlines/whitespace
    assert.isFalse(serverCode.startsWith('\n'))
    assert.isFalse(serverCode.startsWith(' '))
    assert.isFalse(serverCode.endsWith('\n'))
    assert.isFalse(serverCode.endsWith(' '))
  })

  test('should trim extracted template', async ({ assert }) => {
    const content = `
      <script server>
        export default class Counter extends Component {
          count = 0
        }
      </script>
      <div>{{ count }}</div>
    `

    const { template } = extractComponentParts(content)

    // Should not start or end with newlines/whitespace
    assert.isFalse(template.startsWith('\n'))
    assert.isFalse(template.startsWith(' '))
    assert.isFalse(template.endsWith('\n'))
    assert.isFalse(template.endsWith(' '))
  })
})
