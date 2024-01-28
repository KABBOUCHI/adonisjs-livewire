import { Mixin } from 'ts-mixer'
import type { HttpContext } from '@adonisjs/core/http'
import { HandlesEvents } from './Features/SupportEvents/HandlesEvents.js'
import { HandlesDecorators } from './Features/SupportDecorators/HandlesDecorators.js'
import { HandlesRedirects } from './Features/SupportRedirects/HandlesRedirects.js'
import { HandlesPageComponents } from './Features/SupportPageComponents/HandlesPageComponents.js'
import { HandlesJsEvaluation } from './Features/SupportJsEvaluation/HandlesJsEvaluation.js'
import { BaseComponent } from './BaseComponent.js'

interface ComponentOptions {
  ctx: HttpContext | null
  id: string
  name: string
}

export class Component extends Mixin(
  BaseComponent,
  HandlesEvents,
  HandlesRedirects,
  HandlesDecorators,
  HandlesPageComponents,
  HandlesJsEvaluation
) {
  constructor({ ctx, id, name }: ComponentOptions) {
    super()

    // @ts-ignore
    this.__ctx = ctx
    // @ts-ignore
    this.__id = id
    // @ts-ignore
    this.__name = name
  }
}
