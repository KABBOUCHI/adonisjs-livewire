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

Enable ALS in `start/app.ts` https://docs.adonisjs.com/guides/async-local-storage#usage

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
```

## Usage

```blade
// views/welcome.edge
<!DOCTYPE html>
<html lang="en">
<head>
  @livewireStyles
</head>
<body>
  @livewire('Counter')

  @livewireScripts
</body>
</html>
```