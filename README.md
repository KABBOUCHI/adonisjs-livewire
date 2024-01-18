<div align="center">
  <h1><b>AdonisJS Livewire (WIP)</b></h1>

  <p>A front-end framework for AdonisJS</p>
</div>

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
};
```

now you can use `this.ctx` in your Livewire components.

## Create a Livewire component

```sh
node ace make:livewire Counter
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
  @livewire('counter') or  @livewire('Counter')
  @livewire('search-users') or  @livewire('SearchUsers')

  @livewireScripts
</body>
</html>
```

## Component as Page

Create layout file in `resources/views/layouts/main.edge`

```blade
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ title ?? 'My App' }}</title>
    @livewireStyles
  </head>
  <body>
    @!section('body')

    @livewireScripts
  </body>
</html>
```

```ts
// start/routes.ts

Route.livewire("/", "Counter"); // App/Livewire/Counter.ts
Route.livewire("/", "counter", { initialCounter: 10 });
Route.livewire("/search-users", "search-users"); // App/Livewire/SearchUsers.ts
Route.livewire("/search-users"); // App/Livewire/SearchUsers.ts
Route.livewire("/search-users", "search-users.index"); // App/Livewire/SearchUsers/Index.ts
```


## Registering Custom Components

You may manually register components using the Livewire::component method. This can be useful if you want to provide Livewire components from a composer package. Typically this should be done in the ready method of a service provider.

```ts
import type { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { Component } from 'adonisjs-livewire'

export default class AppProvider {
  constructor(protected app: ApplicationContract) {
  }

  public async ready() {
    const { Livewire } = await import('@ioc:Adonis/Addons/Livewire')

    Livewire.component('custom-component', class extends Component {
      public title = ''

      public mount({ title }) {
        this.title = title
      }

      async render() {
        return "<div>{{ title  }}</div>"
      }
    })
  }
}

Now, applications with your package installed can consume your component in their views like so:
```

```blade
@livewire('custom-component', {
  title: 'My Component'
})

// or

<livewire:custom-component title="My Component" />
```