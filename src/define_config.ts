export const defaultConfig = {
  class_namespace: 'app/livewire',
  layout: 'components.layouts.main',
  injectAssets: true,
  navigate: {
    showProgressBar: true,
    progressBarColor: '#2299dd',
  },
}

export type Config = typeof defaultConfig

export function defineConfig(config: Config): Config {
  return config
}
