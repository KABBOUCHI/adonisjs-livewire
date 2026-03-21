# Lazy Loading

This feature enables deferred loading of Livewire components, allowing them to be rendered only when they enter the viewport (lazy) or immediately after page load (defer). It provides mechanisms to:

1. **Lazy load on intersection** — Render placeholder content until the component scrolls into view
2. **Defer loading** — Load component immediately after page initialization
3. **Bundle or isolate requests** — Control whether lazy components make individual or batched requests

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INITIAL RENDER                               │
│                                                                      │
│  Component Mount                SupportLazyLoading                  │
│  ───────────────                ──────────────────                  │
│       │                                │                            │
│       │  params { lazy: true }         │                            │
│       │ ─────────────────────────────> │                            │
│       │                                │  skipMount()               │
│       │                                │  skipRender(placeholder)   │
│       │                                │                            │
│       │  Placeholder HTML with         │                            │
│       │  x-intersect="$wire.__lazyLoad(...)"   (or x-init for defer)│
│       │ <──────────────────────────────│                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ User scrolls component into view (lazy)
                                   │ or page finishes loading (defer)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LAZY LOAD TRIGGER                            │
│                                                                      │
│  Alpine x-intersect/x-init  $wire.__lazyLoad()         Server       │
│  ─────────────────────────  ──────────────────         ──────       │
│       │                           │                       │         │
│       │  Component triggers       │                       │         │
│       │  (viewport or page load)  │                       │         │
│       │ ─────────────────────────>│                       │         │
│       │                           │  POST /livewire       │         │
│       │                           │  call: __lazyLoad     │         │
│       │                           │ ─────────────────────>│         │
│       │                           │                       │         │
│       │                           │  Full component HTML  │         │
│       │                           │ <─────────────────────│         │
│       │                           │                       │         │
│       │  Morphs placeholder       │                       │         │
│       │  with real content        │                       │         │
│       │ <─────────────────────────│                       │         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Server-Side Implementation

### The `Lazy` Decorator

The decorator marks a component class for lazy loading behavior (triggered on viewport intersection).

**File:** `src/features/support_lazy_loading/lazy.ts`

```typescript
import { Decorator } from '../support_decorators/decorator.js'

export default class Lazy extends Decorator {
  constructor(
    public isolate: boolean | undefined = undefined,
    public bundle: boolean | undefined = undefined
  ) {
    super()
  }
}
```

### The `Defer` Decorator

The decorator marks a component class for deferred loading (triggered immediately after page load).

**File:** `src/features/support_lazy_loading/defer.ts`

```typescript
import { Decorator } from '../support_decorators/decorator.js'

export default class Defer extends Decorator {
  constructor(
    public isolate: boolean | undefined = undefined,
    public bundle: boolean | undefined = undefined
  ) {
    super()
  }
}
```

**Constructor parameters (both decorators):**

| Parameter | Type                   | Default     | Description                                                                           |
| --------- | ---------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `isolate` | `boolean \| undefined` | `undefined` | When `true`, component loads in its own HTTP request                                  |
| `bundle`  | `boolean \| undefined` | `undefined` | When `true`, component can be bundled with other lazy components (inverse of isolate) |

### The `SupportLazyLoading` Hook

This component hook intercepts the mount lifecycle to defer component initialization.

**File:** `src/features/support_lazy_loading/support_lazy_loading.ts`

```typescript
import ComponentHook from '../../component_hook.js'
import { getLivewireContext, store } from '../../store.js'
import Lazy from './lazy.js'
import Defer from './defer.js'
import { base64 } from '../../utils/encoding.js'

export class SupportLazyLoading extends ComponentHook {
  static disableWhileTesting = false

  static disableForTesting() {
    SupportLazyLoading.disableWhileTesting = true
  }

  async mount(params) {
    const args = params ?? {}

    let shouldBeLazy = false
    let isDeferred = false
    let isolate = true

    // Check for lazy param variations
    if (args['lazy'] && args['lazy'] !== false) shouldBeLazy = true
    if (args['lazy.bundle']) shouldBeLazy = true
    if (args['defer']) shouldBeLazy = true
    if (args['defer.bundle']) shouldBeLazy = true

    // Check for deferred mode
    if (args['lazy'] === 'on-load') isDeferred = true
    if (args['lazy.bundle'] === 'on-load') isDeferred = true
    if (args['defer']) isDeferred = true
    if (args['defer.bundle']) isDeferred = true

    // Check for bundle mode (non-isolated)
    if (args['lazy.bundle']) isolate = false
    if (args['defer.bundle']) isolate = false

    // Check for decorators
    const lazyDecorator = this.component
      .getDecorators()
      .find((decorator) => decorator instanceof Lazy) as Lazy | undefined

    const deferDecorator = this.component
      .getDecorators()
      .find((decorator) => decorator instanceof Defer) as Defer | undefined

    // Apply decorators only if not explicitly disabled
    const lazyDisabled = args.hasOwnProperty('lazy') && args['lazy'] === false
    const deferDisabled = args.hasOwnProperty('defer') && args['defer'] === false

    if (lazyDecorator && !lazyDisabled) shouldBeLazy = true
    if (deferDecorator && !deferDisabled) {
      shouldBeLazy = true
      isDeferred = true
    }

    // If disabled during testing, return early
    if (SupportLazyLoading.disableWhileTesting) return

    // If no lazy loading is included at all, return
    if (!shouldBeLazy) return

    // Apply decorator settings for isolate/bundle
    if (lazyDecorator) {
      if (lazyDecorator.bundle !== undefined) isolate = !lazyDecorator.bundle
      if (lazyDecorator.isolate !== undefined) isolate = lazyDecorator.isolate
    }

    if (deferDecorator) {
      if (deferDecorator.bundle !== undefined) isolate = !deferDecorator.bundle
      if (deferDecorator.isolate !== undefined) isolate = deferDecorator.isolate
    }

    this.component.skipMount()

    store(this.component).set('isLazyLoadMounting', true)
    store(this.component).set('isLazyIsolated', isolate)
    store(this.component).set('isDeferred', isDeferred)

    this.component.skipRender(await this.generatePlaceholderHtml(params, isDeferred))
  }

  // ... continued
}
```

## Lifecycle Flow

### Mount Phase (Initial Page Load)

1. **Check for lazy loading** — Determines if component should be lazy loaded via:
   - `lazy` or `defer` parameter in component tag
   - `lazy.bundle` or `defer.bundle` for bundled requests
   - `@Lazy()` or `@Defer()` decorator on component class

2. **Determine mode** — Checks if loading should be:
   - **Lazy** (`x-intersect`) — Triggered when element enters viewport
   - **Deferred** (`x-init`) — Triggered immediately after page load

3. **Skip mount** — Calls `this.component.skipMount()` to prevent normal initialization

4. **Generate placeholder** — Creates placeholder HTML with appropriate Alpine.js directive

5. **Store state** — Sets `isLazyLoadMounting`, `isLazyIsolated`, and `isDeferred` in component store

### Dehydrate Phase

Adds memo data to track lazy loading state:

| Memo Key       | Type      | Description                                  |
| -------------- | --------- | -------------------------------------------- |
| `lazyLoaded`   | `boolean` | `false` on initial render, `true` after load |
| `lazyIsolated` | `boolean` | Whether component loads in isolated request  |

### Hydrate Phase (Lazy Load Trigger)

When `__lazyLoad` is called:

1. **Check memo** — If `lazyLoaded` key doesn't exist in memo, return (not a lazy component)
2. **Check state** — If `lazyLoaded` is already `true`, component was already loaded
3. **Set state** — Mark `isLazyLoadHydrating` as `true`
4. **Skip hydrate** — Calls `skipHydrate()` to prevent normal hydration

### Call Phase

The `__lazyLoad` method is intercepted to execute the mount lifecycle:

```typescript
async call(method, params, returnEarly) {
  if (method !== '__lazyLoad') return

  const [encoded] = params
  const mountParams = this.resurrectMountParams(encoded)

  await this.callMountLifecycleMethod(mountParams)

  returnEarly()  // Important: prevent further processing
}

resurrectMountParams(encoded: string) {
  const snapshot = JSON.parse(base64.decode(encoded))
  return snapshot.memo?.__for_mount ?? {}
}
```

## Placeholder Generation

The placeholder HTML includes an Alpine.js directive that triggers lazy loading.
The snapshot is **base64 encoded** to safely include it in the HTML attribute:

```typescript
async generatePlaceholderHtml(params, isDeferred = false) {
  const Livewire = await this.app.container.make('livewire')
  let { context } = getLivewireContext()!
  let placeholder = await this.getPlaceholderHtml(params)

  // Filter out lazy/defer params from mount params
  const mountParams = this.filterLazyParams(params)
  context.addMemo('__for_mount', mountParams)

  const snapshot = await Livewire.snapshot(this.component, context)
  const encoded = base64.encode(JSON.stringify(snapshot))

  // Use x-init for deferred loading, x-intersect for lazy loading
  const directive = isDeferred ? 'x-init' : 'x-intersect'

  return Livewire.insertAttributesIntoHtmlRoot(placeholder, {
    [directive]: `$wire.__lazyLoad('${encoded}')`,
  })
}

filterLazyParams(params) {
  const filtered = { ...params }
  delete filtered['lazy']
  delete filtered['lazy.bundle']
  delete filtered['defer']
  delete filtered['defer.bundle']
  return filtered
}
```

### Custom Placeholder

There are three ways to define placeholders, in order of priority:

#### 1. Component `placeholder()` Method

Components can define a `placeholder()` method:

```typescript
@Lazy()
export default class HeavyComponent extends BaseComponent {
  placeholder(params) {
    return `
      <div class="animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
      </div>
    `
  }
}
```

#### 2. Global Configuration

Set a default placeholder view for all lazy components in your config:

```typescript
// config/livewire.ts
import { defineConfig } from '@adonisjs/livewire'

export default defineConfig({
  componentPlaceholder: 'placeholders/skeleton', // View path
})
```

#### 3. Default Fallback

If no placeholder is defined, a simple `<div></div>` is rendered.

## Client-Side Implementation

The client-side relies on Alpine.js directives to trigger lazy loading:

### Using `x-intersect` (Lazy)

```html
<div x-intersect="$wire.__lazyLoad('...')">
  <!-- Placeholder content -->
</div>
```

When the element enters the viewport, Alpine.js triggers the `__lazyLoad` method.

### Using `x-init` (Defer)

For deferred loading (loads immediately after page init):

```html
<div x-init="$wire.__lazyLoad('...')">
  <!-- Placeholder content -->
</div>
```

## Usage Examples

### 1. Basic Lazy Loading with Decorator

```typescript
import { Lazy } from '@adonisjs/livewire/decorators'
import { BaseComponent } from '@adonisjs/livewire'

@Lazy()
export default class ExpensiveChart extends BaseComponent {
  data: ChartData[] = []

  async mount() {
    // This only runs when component enters viewport
    this.data = await this.fetchChartData()
  }

  render() {
    return this.view.render('livewire/expensive-chart')
  }
}
```

### 2. Lazy Loading via Component Tag

```blade
{{-- Component loads when it enters viewport --}}
<livewire:expensive-chart lazy />

{{-- Explicitly disable lazy loading --}}
<livewire:expensive-chart :lazy="false" />
```

### 3. Bundled Lazy Loading

Multiple components can be loaded in a single request:

```typescript
@Lazy({ isolate: false }) // or @Lazy(false)
export default class DashboardWidget extends BaseComponent {
  // ...
}
```

```blade
{{-- All widgets load in a single bundled request --}}
<livewire:dashboard-widget :lazy.bundle="true" />
<livewire:another-widget :lazy.bundle="true" />
<livewire:third-widget :lazy.bundle="true" />
```

### 4. Deferred Loading

Load immediately after page initialization:

```blade
{{-- Uses x-init instead of x-intersect --}}
<livewire:notifications defer />
```

Or with decorator:

```typescript
import { Defer } from '@adonisjs/livewire/decorators'

@Defer()
export default class Notifications extends BaseComponent {
  // Loads immediately after page init, not on intersection
}
```

### 5. Custom Placeholder with Skeleton

```typescript
@Lazy()
export default class UserList extends BaseComponent {
  users: User[] = []

  placeholder() {
    return `
      <div class="space-y-4">
        ${Array(5)
          .fill(
            `
          <div class="animate-pulse flex space-x-4">
            <div class="rounded-full bg-slate-200 h-10 w-10"></div>
            <div class="flex-1 space-y-2 py-1">
              <div class="h-2 bg-slate-200 rounded"></div>
              <div class="h-2 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `
  }

  async mount() {
    this.users = await User.all()
  }
}
```

### 6. Placeholder with Parameters

```typescript
@Lazy()
export default class ProductCard extends BaseComponent {
  product: Product | null = null

  placeholder(params: { productId: number }) {
    return `
      <div class="border rounded-lg p-4 animate-pulse">
        <div class="text-xs text-gray-400">Loading product #${params.productId}...</div>
        <div class="h-48 bg-gray-200 rounded mt-2"></div>
      </div>
    `
  }

  async mount(productId: number) {
    this.product = await Product.find(productId)
  }
}
```

## Store Keys Reference

| Store Key             | Type      | Description                       |
| --------------------- | --------- | --------------------------------- |
| `isLazyLoadMounting`  | `boolean` | True during initial lazy mount    |
| `isLazyLoadHydrating` | `boolean` | True during lazy load hydration   |
| `isLazyIsolated`      | `boolean` | Whether to isolate request        |
| `isDeferred`          | `boolean` | True if using defer mode (x-init) |

## Memo Keys Reference

| Memo Key       | Type      | Description                               |
| -------------- | --------- | ----------------------------------------- |
| `lazyLoaded`   | `boolean` | `false` initially, `true` after lazy load |
| `lazyIsolated` | `boolean` | Request isolation setting                 |
| `__for_mount`  | `object`  | Preserved mount parameters for lazy load  |

## Lazy vs Defer Comparison

| Feature            | `lazy`                       | `defer`                         |
| ------------------ | ---------------------------- | ------------------------------- |
| Trigger            | Element enters viewport      | Immediately after page load     |
| Alpine Directive   | `x-intersect`                | `x-init`                        |
| Use Case           | Below-the-fold content       | Non-critical above-fold content |
| Performance Impact | Best for content not in view | Reduces initial render time     |

## Integration Checklist

To implement Lazy Loading in your AdonisJS Livewire port:

- [x] Create `Lazy` decorator class extending `Decorator`
- [x] Create `Defer` decorator class (similar to `Lazy`)
- [x] Create `SupportLazyLoading` component hook
- [x] Implement `mount()` interception with `skipMount()` and `skipRender()`
- [x] Implement `hydrate()` interception with `skipHydrate()`
- [x] Implement `dehydrate()` to add lazy loading memos
- [x] Implement `call()` to handle `__lazyLoad` method with `returnEarly()`
- [x] Implement `generatePlaceholderHtml()` with base64 snapshot encoding
- [x] Implement `filterLazyParams()` to remove lazy/defer from mount params
- [x] Implement `getPlaceholderHtml()` with fallback to `<div></div>`
- [x] Create `base64` encoding utility
- [ ] Register hook in the feature pipeline
- [ ] Ensure Alpine.js `x-intersect` plugin is available on client

## Related Files

- [lazy.ts](../src/features/support_lazy_loading/lazy.ts) — Lazy decorator
- [defer.ts](../src/features/support_lazy_loading/defer.ts) — Defer decorator
- [support_lazy_loading.ts](../src/features/support_lazy_loading/support_lazy_loading.ts) — Component hook
- [encoding.ts](../src/utils/encoding.ts) — Base64 encoding utilities
