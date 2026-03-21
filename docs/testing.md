# Testing

Livewire components are designed to be easily testable. This documentation covers the two main testing approaches available in AdonisJS Livewire:

1. **Component Testing** - Direct testing of component logic using `livewire.test()`
2. **HTTP Testing** - Testing Livewire responses via HTTP requests using the Japa API Client

## Installation

To enable Livewire testing, add the testing plugins to your test configuration:

```ts
// tests/bootstrap.ts
import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import { livewireApiClient } from '@adonisjs/livewire/plugins/japa/api_client'
import { livewireTesting } from '@adonisjs/livewire/plugins/japa/testing'

export const plugins: Config['plugins'] = [
  assert(),
  apiClient(app),
  livewireApiClient(app),
  livewireTesting(app),
]
```

---

## Component Testing with `livewire.test()`

The `Livewire.test()` method provides a fluent API for testing component behavior directly, similar to PHP Livewire's testing API.

### Basic Usage

```ts
import { test } from '@japa/runner'
import Counter from '#livewire/counter'

test.group('Counter Component', () => {
  test('can increment count', async ({ livewire }) => {
    await livewire
      .test(Counter)
      .mount()
      .call('increment')
      .assertSet('count', 1)
      .assertSee('Count: 1')
  })
})
```

### Creating a Test Instance

```ts
// Using the livewire testing helper
const testable = await livewire.test(Counter)
```

### Mounting with Parameters

```ts
await livewire
  .test(UserProfile)
  .mount(user) // Pass mount parameters
  .assertSet('name', user.name)
```

### Interaction Methods

#### `set(property, value)`

Set a component property value:

```ts
await livewire.test(Counter).mount().set('count', 5).assertSet('count', 5)
```

#### `call(method, ...params)`

Call a component method:

```ts
await livewire.test(Calculator).mount().call('add', 5, 3).assertSet('result', 8)
```

#### `toggle(property)`

Toggle a boolean property:

```ts
await livewire.test(Modal).mount().toggle('isOpen').assertSet('isOpen', true)
```

### Getter Methods

#### `get(property)`

Get a property value:

```ts
const testable = await livewire.test(Counter).mount()
const count = testable.get('count')
```

#### `html()`

Get the rendered HTML:

```ts
const testable = await livewire.test(Counter).mount()
const html = testable.html()
```

#### `snapshot()`

Get the component snapshot:

```ts
const testable = await livewire.test(Counter).mount()
const snapshot = testable.snapshot()
```

#### `effects()`

Get the component effects:

```ts
const testable = await livewire.test(Counter).mount()
const effects = testable.effects()
```

#### `instance()`

Get the component instance:

```ts
const testable = await livewire.test(Counter).mount()
const component = testable.instance()
```

---

## HTTP Testing with `TestableResponse`

The `TestableResponse` class provides a fluent API for testing Livewire HTTP responses, allowing you to assert on the component state returned from the server.

### Basic Usage

```ts
import { test } from '@japa/runner'

test.group('Livewire HTTP', () => {
  test('can update component via HTTP', async ({ client }) => {
    const response = await client
      .post('/livewire/update')
      .withLivewire()
      .json({
        components: [
          {
            snapshot: JSON.stringify({
              data: { count: 0 },
              memo: { id: 'abc', name: 'counter' },
              checksum: '...',
            }),
            updates: { count: 5 },
            calls: [{ method: 'increment', params: [] }],
          },
        ],
      })

    response
      .livewire()
      .assertSet('count', 5)
      .assertSee('Count: 5')
      .assertDispatched('count-updated')
  })
})
```

### Request Methods

#### `withLivewire()`

Mark the request as a Livewire request (sets `X-Livewire` header):

```ts
const response = await client.post('/livewire/update').withLivewire()
```

#### `withLivewireNavigate()`

Mark the request as a Livewire navigation request:

```ts
const response = await client.get('/dashboard').withLivewireNavigate()
```

### Accessing TestableResponse

Call `livewire()` on the response to get a `TestableResponse` instance:

```ts
const response = await client.post('/livewire/update').withLivewire()
const testable = response.livewire()
```

### Getter Methods

#### `id()`

Get the component ID:

```ts
response.livewire().id() // 'abc123'
```

#### `name()`

Get the component name:

```ts
response.livewire().name() // 'counter'
```

#### `get(property)`

Get a property value (supports dot notation):

```ts
response.livewire().get('count') // 5
response.livewire().get('user.name') // 'John'
```

#### `getData()`

Get all component data:

```ts
response.livewire().getData() // { count: 5, name: 'John' }
```

#### `html()`

Get the rendered HTML:

```ts
response.livewire().html() // '<div>Count: 5</div>'
```

#### `snapshot()`

Get the full component snapshot:

```ts
response.livewire().snapshot()
```

#### `effects()`

Get the component effects:

```ts
response.livewire().effects()
```

#### `components()`

Get all components in the response:

```ts
response.livewire().components() // Array of { snapshot, effects }
```

#### `component(index)`

Access a specific component by index:

```ts
response.livewire().component(1).assertSet('count', 10)
```

---

## Assertion Methods

Both `ComponentTest` and `TestableResponse` provide the same assertion methods for testing component state.

### Property Assertions

#### `assertSet(name, value)`

Assert a property equals a value:

```ts
.assertSet('count', 5)
.assertSet('user.name', 'John')

// With callback
.assertSet('items', (items) => items.length > 0)
```

#### `assertNotSet(name, value)`

Assert a property does NOT equal a value:

```ts
.assertNotSet('count', 0)
```

#### `assertCount(name, count)`

Assert an array property has a specific count:

```ts
.assertCount('items', 5)
```

#### `assertSnapshotSet(name, value)`

Assert a value in the raw snapshot data:

```ts
.assertSnapshotSet('count', 5)
```

#### `assertSnapshotNotSet(name, value)`

Assert a value is NOT in the raw snapshot data:

```ts
.assertSnapshotNotSet('count', 0)
```

### View/HTML Assertions

#### `assertSee(text, escape?)`

Assert the HTML contains text (escaped by default):

```ts
.assertSee('Hello World')
.assertSee('<strong>Bold</strong>', false) // Don't escape
```

#### `assertDontSee(text, escape?)`

Assert the HTML does NOT contain text:

```ts
.assertDontSee('Error')
```

#### `assertSeeHtml(html)`

Assert the raw HTML contains a string:

```ts
.assertSeeHtml('<div class="active">')
```

#### `assertDontSeeHtml(html)`

Assert the raw HTML does NOT contain a string:

```ts
.assertDontSeeHtml('<div class="error">')
```

#### `assertSeeInOrder(values)`

Assert strings appear in order:

```ts
.assertSeeInOrder(['First', 'Second', 'Third'])
```

#### `assertSeeHtmlInOrder(values)`

Assert HTML strings appear in order:

```ts
.assertSeeHtmlInOrder(['<h1>', '<p>', '</div>'])
```

#### `assertSeeText(text)`

Assert the text content (stripped of HTML) contains a string:

```ts
.assertSeeText('Hello World')
```

#### `assertDontSeeText(text)`

Assert the text content does NOT contain a string:

```ts
.assertDontSeeText('Error')
```

### Event Assertions

#### `assertDispatched(event, params?)`

Assert an event was dispatched:

```ts
.assertDispatched('user-updated')
.assertDispatched('post-created', { id: 1 })
```

#### `assertNotDispatched(event)`

Assert an event was NOT dispatched:

```ts
.assertNotDispatched('error-occurred')
```

### Redirect Assertions

#### `assertRedirect(url?)`

Assert a redirect was triggered:

```ts
.assertRedirect()
.assertRedirect('/dashboard')
```

#### `assertRedirectContains(uri)`

Assert the redirect URL contains a string:

```ts
.assertRedirectContains('/users')
```

#### `assertNoRedirect()`

Assert no redirect was triggered:

```ts
.assertNoRedirect()
```

### Validation Assertions

#### `assertHasErrors(keys?)`

Assert there are validation errors:

```ts
.assertHasErrors()
.assertHasErrors(['email', 'password'])
```

#### `assertHasNoErrors(keys?)`

Assert there are no validation errors:

```ts
.assertHasNoErrors()
.assertHasNoErrors(['email'])
```

### File Download Assertions

#### `assertFileDownloaded(filename?)`

Assert a file download was triggered:

```ts
.assertFileDownloaded()
.assertFileDownloaded('report.pdf')
```

#### `assertNoFileDownloaded()`

Assert no file download was triggered:

```ts
.assertNoFileDownloaded()
```

### Return Value Assertions

#### `assertReturned(value)`

Assert the return value from the last method call:

```ts
.assertReturned('success')
```

### HTTP Status Assertions (TestableResponse only)

#### `assertStatus(code)`

Assert the HTTP status code:

```ts
.assertStatus(200)
```

#### `assertOk()`

Assert a successful status (2xx):

```ts
.assertOk()
```

#### `assertUnauthorized()`

Assert 401 status:

```ts
.assertUnauthorized()
```

#### `assertForbidden()`

Assert 403 status:

```ts
.assertForbidden()
```

### Snapshot/Effects Assertions

#### `assertSnapshot(snapshot)`

Assert the snapshot matches exactly:

```ts
.assertSnapshot({
  data: { count: 5 },
  memo: { id: 'abc', name: 'counter' },
  checksum: '...',
})
```

#### `assertSnapshotContains(partial)`

Assert the snapshot contains a subset:

```ts
.assertSnapshotContains({
  memo: { name: 'counter' },
})
```

#### `assertEffects(effects)`

Assert the effects match exactly:

```ts
.assertEffects({
  html: '<div>Count: 5</div>',
  dispatches: ['count-updated'],
})
```

#### `assertEffectsContains(partial)`

Assert the effects contain a subset:

```ts
.assertEffectsContains({
  redirect: '/dashboard',
})
```

---

## Method Chaining

All assertion methods return `this`, allowing fluent method chaining:

```ts
await livewire
  .test(Counter)
  .mount()
  .call('increment')
  .call('increment')
  .assertSet('count', 2)
  .assertSee('Count: 2')
  .assertDispatched('count-changed')
  .assertNoRedirect()
```

```ts
response
  .livewire()
  .assertSet('count', 5)
  .assertCount('items', 3)
  .assertSee('Hello')
  .assertSeeHtml('<div>')
  .assertDispatched('updated')
  .assertRedirect('/success')
```

---

## Complete Example

```ts
import { test } from '@japa/runner'
import CreatePost from '#livewire/posts/create'

test.group('Create Post Component', () => {
  test('can create a post', async ({ livewire }) => {
    await livewire
      .test(CreatePost)
      .mount()
      .set('title', 'My First Post')
      .set('content', 'This is the content')
      .call('save')
      .assertSet('title', 'My First Post')
      .assertSee('Post saved successfully')
      .assertDispatched('post-created')
      .assertRedirect('/posts')
  })

  test('validates required fields', async ({ livewire }) => {
    await livewire
      .test(CreatePost)
      .mount()
      .call('save')
      .assertHasErrors(['title', 'content'])
      .assertNoRedirect()
  })

  test('renders form correctly', async ({ livewire }) => {
    const testable = await livewire.test(CreatePost).mount()

    testable.assertSeeHtml('<form').assertSeeHtml('wire:submit').assertSee('Create Post')
  })
})

test.group('Create Post HTTP', () => {
  test('can submit post via HTTP', async ({ client }) => {
    const response = await client
      .post('/livewire/update')
      .withLivewire()
      .json({
        components: [
          {
            snapshot: JSON.stringify({
              data: { title: '', content: '' },
              memo: { id: 'abc', name: 'posts/create' },
              checksum: '...',
            }),
            updates: {
              title: 'My Post',
              content: 'Content here',
            },
            calls: [{ method: 'save', params: [] }],
          },
        ],
      })

    response.livewire().assertOk().assertDispatched('post-created').assertRedirect('/posts')
  })
})
```
