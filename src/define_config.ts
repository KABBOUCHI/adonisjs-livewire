export const defaultConfig = {
  class_namespace: 'app/livewire',
  layout: 'components.layouts.main',
  injectAssets: true,
  renderOnRedirect: false,
  /**
   * Default placeholder view for lazy loaded components
   * Example: 'placeholders/skeleton' or null for default <div></div>
   */
  componentPlaceholder: null as string | null,
  navigate: {
    showProgressBar: true,
    progressBarColor: '#2299dd',
  },
  /**
   * Payload limits for security (PHP parity)
   */
  limits: {
    /**
     * Maximum number of method calls per request
     */
    maxCalls: 10,
    /**
     * Maximum payload size in bytes (1MB default)
     */
    maxSize: 1024 * 1024,
    /**
     * Maximum number of components per request
     */
    maxComponents: 10,
  },
}

export type Config = typeof defaultConfig

export type PartialConfig = {
  class_namespace?: string
  layout?: string
  injectAssets?: boolean
  renderOnRedirect?: boolean
  componentPlaceholder?: string | null
  navigate?: Partial<Config['navigate']>
  limits?: Partial<Config['limits']>
}

export function defineConfig(config: PartialConfig): Config {
  return {
    ...defaultConfig,
    ...config,
    navigate: {
      ...defaultConfig.navigate,
      ...(config.navigate || {}),
    },
    limits: {
      ...defaultConfig.limits,
      ...(config.limits || {}),
    },
  }
}
