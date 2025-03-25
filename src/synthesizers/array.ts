import { Synth } from './synth.js'

export class ArraySynth extends Synth {
  static key = 'arr'

  static match(target: any) {
    return Array.isArray(target)
  }

  async dehydrate(target: any, dehydrateChild: any) {
    for (const key in target) {
      target[key] = await dehydrateChild(key, target[key])
    }

    return [target, {}]
  }

  async hydrate(value: any, _meta: any, hydrateChild: any) {
    if (!Array.isArray(value)) {
      return value
    }

    for (const key in value) {
      value[key] = await hydrateChild(key, value[key])
    }

    return value
  }
}
