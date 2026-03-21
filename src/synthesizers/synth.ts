import ComponentContext from '../component_context.js'
import { ApplicationService } from '@adonisjs/core/types'

export abstract class Synth {
  constructor(
    public context: ComponentContext,
    public path: string,
    public app: ApplicationService
  ) {}

  static getKey() {
    // @ts-ignore
    if (!this.key) {
      throw new Error('You need to define static $key property on: ' + this.name)
    }

    // @ts-ignore
    return this.key
  }

  getKey() {
    // @ts-ignore
    if (!this.constructor.key) {
      throw new Error('You need to define static $key property on: ' + this.constructor.name)
    }

    // @ts-ignore
    return this.constructor.key
  }

  static match(target) {
    return false
  }

  static matchByType(type: string) {
    return false
  }

  async dehydrate(target: any, hydrateChild: any) {
    return [target, {}]
  }
  async hydrate(value: any, meta: any, hydrateChild: any) {
    return value
  }
  // abstract hydrateFromType(type, value)

  get(target: any | any[], key: string) {
    if (Array.isArray(target)) {
      return target[key] ?? null
    }

    return target[key]
  }

  /**
   * Set a property value on the target
   * Can be overridden by specific synthesizers (e.g., FormObjectSynth)
   */
  set(target: any, key: string, value: any): void {
    if (Array.isArray(target)) {
      target[key] = value
    } else {
      target[key] = value
    }
  }
}
