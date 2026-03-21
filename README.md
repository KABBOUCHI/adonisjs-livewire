<div align="center">
  <h1><b>AdonisJS Livewire (WIP)</b></h1>

  <p>A front-end framework for AdonisJS</p>
</div>

## Demo

https://pingcrm.kabbouchi.com/ - https://github.com/KABBOUCHI/adonisjs-livewire-pingcrm

## Getting Started

This package is available in the npm registry.

```bash
npm install adonisjs-livewire
```

Next, configure the package by running the following command.

```bash
node ace configure adonisjs-livewire
```

## Configuration

Enable ALS in `config/app.ts` https://docs.adonisjs.com/guides/async-local-storage#usage

```ts
// config/app.ts
export const http: ServerConfig = {
  useAsyncLocalStorage: true,
}
```

now you can use `this.ctx` in your Livewire components.

## Create a Livewire component

```sh
node ace make:livewire Counter

# or

node ace make:livewire Counter --inline
```

## Basic Usage

```blade
// views/welcome.edge
<!DOCTYPE html>
<html lang="en">
<head>
  @livewireStyles
</head>
<body>
  @livewire('counter') or  @livewire('Counter') or <livewire:counter />
  @livewire('search-users') or  @livewire('SearchUsers') or <livewire:search-users />

  @livewireScripts
</body>
</html>
```

## Component as Page

Create layout file

```sh
node ace livewire:layout
node ace livewire:layout <name>
```

Add routes

```ts
// start/routes.ts

router.livewire('/', 'counter') // app/livewire/counter.ts
router.livewire('/', 'counter', { initialCounter: 10 })
router.livewire('/search-users', 'search-users') // app/livewire/search-users.ts
router.livewire('/search-users') // app/livewire/search-users.ts
router.livewire('/search-users', 'search-users.index') // app/livewire/search-users/index.ts
```

## Registering Custom Components

You may manually register components using the Livewire::component method. This can be useful if you want to provide Livewire components from a composer package. Typically this should be done in the ready method of a service provider.

```ts
import type { ApplicationService } from '@adonisjs/core/types'
import { Component } from 'adonisjs-livewire'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  public async ready() {
    const Livewire = await this.app.container.make('livewire')

    Livewire.component(
      'custom-component',
      class extends Component {
        public title = ''

        public mount({ title }) {
          this.title = title
        }

        async render() {
          return '<div>{{ title }}</div>'
        }
      }
    )
  }
}
```

Now, applications with your package installed can consume your component in their views like so:

```blade
@livewire('custom-component', {
  title: 'My Component'
})

// or

<livewire:custom-component title="My Component" />
```

## Creating mixins

```ts
// app/livewire_mixins/my_mixin.ts
import { Component } from 'adonisjs-livewire'
export interface MyMixin extends Component {}
export class MyMixin {
  public foo = 'bar'

  public baz() {
    return 'baz'
  }
}

// or (not recommended)

export class MyMixin extends Component {
  public foo = 'bar'

  public baz() {
    return 'baz'
  }
}
```

```ts
// app/livewire/counter.ts
import { Component, Mixin } from 'adonisjs-livewire'
import MyMixin from '#app/livewire_mixins/my_mixin'

export default class Counter extends Mixin(Component, MyMixin) {
  public count = 0

  public increment() {
    this.count++
  }

  public decrement() {
    this.count--
  }

  public render() {
    return `
      <div>
        <button wire:click="increment">+</button>
        <h1>{{ count }}</h1>
        <button wire:click="decrement">-</button>
        <h2>{{ foo }}</h2>
        <h3>{{ baz() }}</h3>
      </div>
    `
  }
}
```

## SFC (Experimental)

Define component logic using `<script server>` tag inside livewire edge component. e.g: `resources/views/livewire/counter.edge`

```html
<script server>
  import { Component } from 'adonisjs-livewire'

  export default class extends Component {
    count = 0

    increment() {
      this.count++
    }

    decrement() {
      this.count--
    }
  }
</script>

<div>
  <button wire:click="decrement">-</button>

  <h1>{{ count }}</h1>

  <button wire:click="increment">+</button>
</div>
```

## Helpers

### Livewire Component Processor

This package includes a processor that converts HTML-like syntax for Livewire components to Edge tag syntax.

```edge
{{-- This syntax: --}}
<livewire:counter count="5" wire:click="increment" class="btn" />

{{-- Gets converted to: --}}
@livewire('counter', { count: '5', wire:click: 'increment', class: 'btn' }, {})
```

#### Dynamic Components

You can use dynamic components with the `is` attribute:

```edge
{{-- Static component name --}}
<livewire:is component="counter" />

{{-- Dynamic component with Edge binding --}}
<livewire:is :is="componentName" />
```

Both will be converted to `@livewire(componentName, {}, {})` where `componentName` is treated as an Edge variable.

#### Supported Attributes

- **Regular attributes**: `count="5"` → `{ count: '5' }`
- **Edge bindings**: `:foo="bar"` → `{ foo: bar }` (treated as Edge variable)
- **Wire attributes**: `wire:click="increment"` → `{ wire:click: 'increment' }`
- **Wire model**: `wire:model="name"` → `{ wire:model: '$parent.name' }`
- **Wire key**: `wire:key="item.id"` → options: `{ key: 'item.id' }`
- **Mustache expressions**: `title="{{ user.name }}"` → `{ title: \`${user.name}\` }`
- **Boolean attributes**: `disabled` → `{ disabled: true }`

### Edge component class (Experimental)

```ts
// app/compoments/button.ts
import { ViewComponent } from 'adonisjs-livewire'

export default class Button extends ViewComponent {
  type = 'button'
  text = ''

  constructor({ type, text }) {
    this.type = type || this.type
    this.text = text || this.text
  }

  isLoading() {
    return true // some logic
  }

  public render() {
    // or return this.view.render("components/button")
    return `
      <button type="{{ type }}" {{ isLoading() ? 'data-loading': '' }} {{ $props.only(['class']).toAttrs() }}>
        {{{ text || await $slots.main() }}}
      </button>
    `
  }
}
```
