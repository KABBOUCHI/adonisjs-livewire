import { Mixin } from 'ts-mixer'
import type { HttpContext } from '@adonisjs/core/http'
import { BaseComponent } from './base_component.js'
import { HandlesJsEvaluation } from './features/support_js_valuation/handles_js_evaluation.js'
import { HandlesPageComponents } from './features/support_page_components/handles_page_components.js'
import { HandlesDecorators } from './features/support_decorators/handles_decorators.js'
import { HandlesRedirects } from './features/support_redirects/handles_redirects.js'
import { HandlesEvents } from './features/support_events/handles_events.js'
import type { ApplicationService } from '@adonisjs/core/types'

interface ComponentOptions {
  ctx: HttpContext
  app: ApplicationService
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
  constructor({ ctx, app, id, name }: ComponentOptions) {
    super()

    // @ts-ignore
    this.__id = id
    // @ts-ignore
    this.__name = name

    this.app = app
    this.ctx = ctx
  }
}
