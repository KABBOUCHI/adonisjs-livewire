import { compose } from '@poppinss/utils'
import { BaseTestable } from './base_testable.js'
import { MakesAssertions } from './makes_assertions.js'
import { TestsValidation } from '../support_validation/tests_validation.js'
import { TestsRedirects } from '../support_redirects/tests_redirects.js'
import { TestsEvents } from '../support_events/tests_events.js'

export class Testable extends compose(
  BaseTestable,
  MakesAssertions,
  TestsValidation,
  TestsRedirects,
  TestsEvents
) {}
