import type { HttpContext } from '@adonisjs/core/http'
import { BaseComponent } from './base_component.js'
import { HandlesJsEvaluation } from './features/support_js_evaluation/handles_js_evaluation.js'
import { HandlesPageComponents } from './features/support_page_components/handles_page_components.js'
import { HandlesDecorators } from './features/support_decorators/handles_decorators.js'
import { HandlesRedirects } from './features/support_redirects/handles_redirects.js'
import { HandlesEvents } from './features/support_events/handles_events.js'
import { HandlesValidation } from './features/support_validation/handles_validation.js'
import type { ApplicationService, HttpRouterService } from '@adonisjs/core/types'
import { compose } from '@poppinss/utils'
import { InferValidationReturnType } from './features/support_validation/types.js'

interface ComponentOptions {
  ctx: HttpContext
  app: ApplicationService
  router: HttpRouterService
  id: string
  name: string
}

export abstract class Component extends compose(
  BaseComponent,
  HandlesEvents,
  HandlesRedirects,
  HandlesDecorators,
  HandlesPageComponents,
  HandlesJsEvaluation,
  HandlesValidation
) {
  constructor({ ctx, app, router, id, name }: ComponentOptions) {
    super()

    // Use setters instead of direct property assignment
    this.__id = id
    this.__name = name
    this.app = app
    this.ctx = ctx
    this.__setRouter(router)
  }

  override validate(data?: Record<string, any>): Promise<InferValidationReturnType<this>> {
    return super.validate(data)
  }
}
