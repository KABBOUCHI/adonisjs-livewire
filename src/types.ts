import type { HttpContext } from '@adonisjs/core/http'
import type { ApplicationService } from '@adonisjs/core/types'
import { Component, Synth, type ViewComponent } from '../index.js'
import ComponentContext from './component_context.js'
import ComponentHook from './component_hook.js'

/**
 * Constructor type helper for mixins
 */
export type Constructor<T> = new (...args: any[]) => T

/**
 * Snapshot structure for component state
 */
export type ComponentSnapshot = {
  /**
   * Component data (properties)
   */
  data: Record<string, any>
  /**
   * Component metadata
   */
  memo: ComponentMemo
  /**
   * Checksum for integrity verification
   */
  checksum: string
}

/**
 * Component metadata stored in snapshot
 */
export type ComponentMemo = {
  /**
   * Unique component ID
   */
  id: string
  /**
   * Component name
   */
  name: string
  /**
   * Request path where component was mounted
   */
  path?: string
  /**
   * HTTP method
   */
  method?: string
  /**
   * Child components
   */
  children?: ComponentSnapshot[]
  /**
   * Scripts to execute
   */
  scripts?: string[]
  /**
   * Assets to load
   */
  assets?: string[]
  /**
   * Validation errors
   */
  errors?: Record<string, string[]>
  /**
   * Failed validation rules (field => rules)
   */
  failedRules?: Record<string, string[]>
  /**
   * Locale
   */
  locale?: string
}

/**
 * Component update payload
 */
export type ComponentUpdate = {
  /**
   * Snapshot to hydrate from
   */
  snapshot: ComponentSnapshot
  /**
   * Property updates
   */
  updates: Record<string, any>
  /**
   * Method calls to execute
   */
  calls: ComponentCall[]
}

/**
 * Component method call
 */
export type ComponentCall = {
  /**
   * Method name to call
   */
  method: string
  /**
   * Parameters to pass to method
   */
  params: any[]
}

/**
 * Component effects (responses to client)
 */
export type ComponentEffects = {
  /**
   * HTML to update
   */
  html?: string
  /**
   * Method return values
   */
  returns?: any[]
  /**
   * Events to dispatch
   */
  dispatches?: string[]
  /**
   * Redirect URL
   */
  redirect?: string
  /**
   * Download file
   */
  download?: {
    url: string
    filename?: string
  }
  /**
   * Browser events to fire
   */
  browserEvent?: {
    event: string
    params?: Record<string, any>
  }
  /**
   * Validation errors (field => messages)
   */
  errors?: Record<string, string[]>
  /**
   * Failed validation rules (field => rules)
   */
  failedRules?: Record<string, string[]>
  /**
   * Allow dynamic properties for extensibility
   */
  [key: string]: any
}

/**
 * Component mount options
 */
export type MountOptions = {
  /**
   * Layout to use for component
   */
  layout?: {
    name: string
    props?: Record<string, any>
  }
  /**
   * Component key for re-mounting
   */
  key?: string
}

/**
 * Base component interface
 */
export interface BaseComponent {
  /**
   * HTTP context
   */
  ctx: HttpContext
  /**
   * Application service
   */
  app: ApplicationService
  /**
   * Get component ID
   */
  getId(): string
  /**
   * Get component name
   */
  getName(): string
  /**
   * Set component ID
   */
  setId(id: string): void
  /**
   * Set component name
   */
  setName(name: string): void
  /**
   * Set view path
   */
  setViewPath(path: string): void
  /**
   * Render component template
   */
  render(): Promise<string>
  /**
   * Skip rendering (return early)
   */
  skipRender(html?: string): void
  /**
   * Skip mounting
   */
  skipMount(): void
  /**
   * Skip hydration
   */
  skipHydrate(): void
}

export type ComponentConstructor = new (...args: any[]) => Component

export type ComponentHookConstructor = new (...args: any[]) => ComponentHook

export type ViewComponentConstructor = new (...args: any[]) => ViewComponent

export type SynthesizerConstructor = new (context: ComponentContext, path: string | null) => Synth
