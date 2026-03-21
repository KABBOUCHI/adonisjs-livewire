# JS Evaluation

This feature enables bidirectional JavaScript execution between server-side components and the browser. It provides mechanisms to:

1. **Execute JavaScript from backend** — Queue JavaScript expressions to run in the browser after a server round-trip
2. **Define pure client-side methods** — Create methods that execute entirely in the browser without server requests
3. **Register JavaScript actions** — Define reusable JS functions that can be invoked from templates or backend

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER SIDE                                  │
│                                                                      │
│  Component                HandlesJsEvaluation         store('js')   │
│  ─────────                ───────────────────         ───────────   │
│      │                           │                         │        │
│      │  this.js(expr, params)    │                         │        │
│      │ ─────────────────────────>│                         │        │
│      │                           │  push({ expression,     │        │
│      │                           │         params })       │        │
│      │                           │ ───────────────────────>│        │
│                                                                      │
│  SupportJsEvaluation.dehydrate()                                    │
│  ────────────────────────────────                                   │
│      │                                                              │
│      │  context.addEffect('xjs', store.get('js'))                   │
│      │ ─────────────────────────────────────────>  Response         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ effects.xjs
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                                  │
│                                                                      │
│  on('effects', (component, effects) => {                            │
│      effects.xjs.forEach(({ expression, params }) => {              │
│          Alpine.evaluate(component.el, expression, {                │
│              scope: component.jsActions,                            │
│              params                                                 │
│          })                                                         │
│      })                                                             │
│  })                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Server-Side Implementation

### The `HandlesJsEvaluation` Mixin

The mixin adds a `js()` method to components that queues JavaScript for browser execution.

**File:** `src/features/support_js_evaluation/handles_js_evaluation.ts`

```typescript
import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'
import { Constructor } from '../../types.js'

export function HandlesJsEvaluation<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    js(expression: string, ...params: unknown[]) {
      store(this).push('js', { expression, params })
    }
  }
}
```

**Method signature:**

```typescript
js(expression: string, ...params: unknown[]): void
```

- `expression` — JavaScript code string to execute in the browser
- `params` — Optional parameters passed to the expression (accessible via `params` array)

### The `SupportJsEvaluation` Hook

This component hook processes the stored JS expressions during dehydration and adds them to the response effects.

**File:** `src/features/support_js_evaluation/support_js_evaluation.ts`

```typescript
import ComponentHook from '../../component_hook.js'
import { store } from '../../store.js'

export class SupportJsEvaluation extends ComponentHook {
  async dehydrate(context: { addEffect: (k: string, v: unknown) => void }) {
    if (!store(this.component).has('js')) return

    context.addEffect('xjs', store(this.component).get('js'))
  }
}
```

**Effect key:** `xjs` — Array of `{ expression, params }` objects

## Client-Side Implementation

The client-side handler listens for the `effects` event and evaluates each JavaScript expression using Alpine.js.

**File:** `assets/livewire.js` (supportJsEvaluation.js section)

```javascript
on('effects', (component, effects) => {
  let js = effects.js // For #[Js] attribute methods
  let xjs = effects.xjs // For $this->js() queued expressions

  // Handle #[Js] attribute methods (pure client-side)
  if (js) {
    Object.entries(js).forEach(([method, body]) => {
      overrideMethod(component, method, () => {
        Alpine.evaluate(component.el, body)
      })
    })
  }

  // Handle queued JS expressions from backend
  if (xjs) {
    xjs.forEach(({ expression, params }) => {
      params = Object.values(params)
      Alpine.evaluate(component.el, expression, {
        scope: component.jsActions,
        params,
      })
    })
  }
})
```

## Usage Examples

### 1. Execute JavaScript After Server Action

Queue JavaScript to run after a backend method completes:

```typescript
// Component method
async toggle() {
  // Do server-side logic...
  await this.saveToDatabase()

  // Queue JS to run in browser after response
  this.js('$wire.show = true')
}
```

```html
<button wire:click="toggle">Toggle</button>
<div x-show="$wire.show">Now visible!</div>
```

### 2. Execute JavaScript with Parameters

Pass data from backend to the JavaScript expression:

```typescript
async showNotification() {
  const message = await this.generateMessage()

  // params[0] = message, params[1] = 'success'
  this.js('showToast(params[0], params[1])', message, 'success')
}
```

### 3. Call Registered JavaScript Actions

If you have JavaScript actions registered via `$wire.$js()`, you can invoke them from the backend:

```typescript
async save() {
  await this.persist()

  // Calls the 'onSaveComplete' JS action with parameters
  this.js('onSaveComplete', 'Data saved!', Date.now())
}
```

Template with registered action:

```html
@script
<script>
  $wire.$js('onSaveComplete', (message, timestamp) => {
    console.log(`${message} at ${timestamp}`)
    // Show success notification, animate element, etc.
  })
</script>
@endscript
```

### 4. Manipulate Alpine.js State

Since expressions are evaluated in the Alpine context, you have access to `$wire` and other Alpine magics:

```typescript
async loadData() {
  const items = await this.fetchItems()
  this.items = items

  // Update Alpine reactive state
  this.js('$wire.$refresh()')

  // Or trigger Alpine animations
  this.js('$el.classList.add("loaded")')
}
```

### 5. Chain Multiple JS Expressions

You can call `js()` multiple times; all expressions are collected and executed in order:

```typescript
async complexAction() {
  this.js('console.log("Step 1: Started")')

  await this.doWork()

  this.js('console.log("Step 2: Work complete")')
  this.js('$dispatch("work-complete", { success: true })')
}
```

## JavaScript Actions (`$wire.$js`)

JavaScript actions are client-side functions registered in `@script` blocks that can be invoked from templates or backend.

### Registering Actions

```html
@script
<script>
  // Method 1: Using $wire.$js() function
  $wire.$js('actionName', (param1, param2) => {
    // JavaScript code here
  })

  // Method 2: Direct property assignment
  $wire.$js.anotherAction = () => {
    // JavaScript code here
  }

  // Method 3: Using this.$js (alternative syntax)
  this.$js('yetAnother', () => {
    // JavaScript code here
  })
</script>
@endscript
```

### Invoking from Templates

```html
<!-- No parameters -->
<button wire:click="$js.actionName">Run Action</button>

<!-- With parameters -->
<button wire:click="$js.actionName('foo', 'bar')">Run with Params</button>

<!-- Using Alpine @click -->
<button @click="$wire.$js.actionName()">Alpine Click</button>
```

### Invoking from Backend

```typescript
async save() {
  await this.persist()

  // Invoke the registered 'actionName' with parameters
  this.js('actionName', 'param1', 'param2')
}
```

## Effect Keys Reference

| Effect Key | Type                                               | Description                          |
| ---------- | -------------------------------------------------- | ------------------------------------ |
| `xjs`      | `Array<{ expression: string, params: unknown[] }>` | Queued JS from `this.js()`           |
| `js`       | `Record<string, string>`                           | Method bodies from `#[Js]` attribute |

## Store Keys Reference

| Store Key | Type                                               | Description                |
| --------- | -------------------------------------------------- | -------------------------- |
| `js`      | `Array<{ expression: string, params: unknown[] }>` | Accumulated JS expressions |

## Integration Checklist

To implement JS Evaluation in your AdonisJS Livewire port:

- [ ] Create `HandlesJsEvaluation` mixin with `js(expression, ...params)` method
- [ ] Integrate mixin into base component class
- [ ] Create `SupportJsEvaluation` component hook
- [ ] Register hook in the feature pipeline
- [ ] Ensure client-side `livewire.js` handles `effects.xjs`
- [ ] Verify Alpine.js `evaluate()` is available with scope and params support
- [ ] Test with `@script` blocks for JavaScript action registration

## Related Files

- [handles_js_evaluation.ts](../src/features/support_js_evaluation/handles_js_evaluation.ts) — Mixin implementation
- [support_js_evaluation.ts](../src/features/support_js_evaluation/support_js_evaluation.ts) — Component hook
- [store.ts](../src/store.ts) — Data store for accumulating JS expressions
- [livewire.js](../assets/livewire.js) — Client-side effect handler (search for `supportJsEvaluation`)
