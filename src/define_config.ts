export const defaultConfig = {
  class_namespace: 'app/livewire',
  layout: 'components.layouts.main',
  injectAssets: true,
  renderOnRedirect: false,
  navigate: {
    showProgressBar: true,
    progressBarColor: '#2299dd',
  },
}

export type Config = typeof defaultConfig

export function defineConfig(config: Partial<Config>): Config {
  return { ...defaultConfig, ...config }
}
