import ComponentHook from '../../component_hook.js'

/**
 * Feature to support testing of Livewire components
 * Extends ComponentHook to intercept lifecycle events during testing
 */
export class SupportTesting extends ComponentHook {
  /**
   * Check if we're in a testing environment
   */
  static isTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'testing' ||
      typeof (global as any).test !== 'undefined'
    )
  }

  /**
   * Boot hook - only active in testing environment
   */
  async boot(): Promise<void> {
    if (!SupportTesting.isTestEnvironment()) {
      return
    }
  }

  /**
   * Exception hook - handle exceptions during testing
   */
  async exception(_error: any, _stopPropagation?: Function): Promise<void> {
    if (!SupportTesting.isTestEnvironment()) {
      return
    }
  }
}
