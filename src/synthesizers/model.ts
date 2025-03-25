import string from '@poppinss/utils/string'
import { Synth } from './synth.js'
import { BaseModel } from '@adonisjs/lucid/orm'

export class ModelSynth extends Synth {
  static key = 'mdl'

  static match(target: any) {
    return target instanceof BaseModel
  }

  async dehydrate(target: any) {
    return [null, { key: target.$primaryKeyValue, model: target.constructor.name }]
  }

  async hydrate(_data: any, meta: any) {
    let modelFile = string.snakeCase(meta.model)
    const { default: model } = await import(this.app.makeURL(`./app/models/${modelFile}.js`).href)

    return await model.find(meta.key)
  }
}
