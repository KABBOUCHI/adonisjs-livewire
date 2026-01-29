import { AssertionError } from 'node:assert'
import { ComponentState } from './component_state.ts'
import { DataStore, livewireContext } from '../../store.ts'
import ComponentContext from '../../component_context.ts'

export class Testable {
  protected component: any
  protected componentClass: any
  protected pendingUpdates: Record<string, any> = {}
  protected pendingCalls: Array<{ method: string; params: any[] }> = []
  protected renderedHtml: string = ''
  protected viewName: string = ''
  protected viewData: Record<string, any> = {}
  protected statusCode: number = 200
  protected redirectTo: string | null = null
  protected dispatched: Array<{ name: string; params: any; to?: string; self?: boolean }> = []
  protected browserEvents: Array<{ event: string; data: any }> = []
  protected validationErrors: Record<string, string[]> = {}
  protected queryParams: Record<string, any> = {}
  protected cookies: Record<string, any> = {}
  protected headers: Record<string, any> = {}
  protected dataStore: DataStore
  protected lastReturnedValue: any = undefined

  constructor(
    protected lastState: ComponentState | null,
    componentClass: any
  ) {
    this.componentClass = componentClass
    this.component = null
    this.dataStore = new DataStore('test')
  }

  static create(
    componentClass: any,
    params: Record<string, any> = {},
    queryParams: Record<string, any> = {},
    cookies: Record<string, any> = {},
    headers: Record<string, any> = {}
  ) {
    const testable = new Testable(null, componentClass)
    testable.queryParams = queryParams
    testable.cookies = cookies
    testable.headers = headers
    testable.initializeComponent(params)
    return testable
  }

  protected initializeComponent(params: Record<string, any> = {}) {
    const ComponentClass = this.componentClass

    this.component = Object.create(ComponentClass.prototype)

    const tempInstance = new ComponentClass({ ctx: null, app: null, id: 'test', name: 'test' })
    const instanceProps = Object.getOwnPropertyNames(tempInstance)

    for (const prop of instanceProps) {
      if (!prop.startsWith('__') && prop !== 'ctx' && prop !== 'app') {
        this.component[prop] = tempInstance[prop]
      }
    }

    for (const [key, value] of Object.entries(params)) {
      if (key in this.component) {
        this.component[key] = value
      }
    }

    for (const [key, value] of Object.entries(this.queryParams)) {
      if (key in this.component) {
        this.component[key] = value
      }
    }
  }

  protected runInContext<T>(fn: () => T): T {
    const context = new ComponentContext(this.component, false)
    return livewireContext.run({ dataStore: this.dataStore, context, features: [] }, fn)
  }

  setProperty(name: string, value: any) {
    this.pendingUpdates[name] = value
    return this
  }

  protected applyPendingUpdates() {
    for (const [name, value] of Object.entries(this.pendingUpdates)) {
      this.component[name] = value
    }
    this.pendingUpdates = {}
  }

  protected async applyPendingCalls() {
    for (const call of this.pendingCalls) {
      if (typeof this.component[call.method] === 'function') {
        try {
          await this.runInContext(async () => {
            this.lastReturnedValue = await this.component[call.method](...call.params)
          })
          this.syncStoreData()
        } catch (error: any) {
          if (error.status) {
            this.statusCode = error.status
          } else if (error.code === 'E_ROUTE_NOT_FOUND') {
            this.statusCode = 404
          } else if (error.code === 'E_UNAUTHORIZED_ACCESS') {
            this.statusCode = 401
          } else if (error.code === 'E_AUTHORIZATION_FAILURE') {
            this.statusCode = 403
          } else if (error.code === 'E_VALIDATION_ERROR') {
            this.validationErrors = error.messages || {}
          } else {
            this.statusCode = 500
          }
        }
      }
    }
    this.pendingCalls = []
  }

  protected syncStoreData() {
    const storeData = this.dataStore.lookup.get(this.component)
    if (storeData) {
      if (storeData.dispatched) {
        this.dispatched.push(...storeData.dispatched)
      }
      if (storeData.redirect) {
        this.redirectTo = storeData.redirect[storeData.redirect.length - 1]
      }
      if (storeData.dispatchBrowserEvent) {
        this.browserEvents.push(...storeData.dispatchBrowserEvent)
      }
    }
  }

  set(name: string | Record<string, any>, value: any = null) {
    if (typeof name === 'object' && name !== null) {
      for (const key in name) {
        this.setProperty(key, name[key])
      }
    } else {
      this.setProperty(name, value)
    }

    this.applyPendingUpdates()

    return this
  }

  toggle(name: string) {
    this.component[name] = !this.component[name]
    return this
  }

  async call(method: string, ...params: any[]) {
    if (method === '$refresh') {
      return this
    }

    if (method === '$set') {
      return this.set(params[0], params[1])
    }

    this.pendingCalls.push({ method, params })
    await this.applyPendingCalls()

    return this
  }

  get(key: string) {
    return this.component[key]
  }

  assertSet(name: string, value: any, strict: boolean = false) {
    let actual = this.get(name)

    if (typeof value === 'function') {
      if (!value(actual)) {
        throw new AssertionError({ message: `Assertion callback failed for "${name}"` })
      }
    } else {
      if (strict) {
        if (value !== actual) {
          throw new AssertionError({
            message: `Expected "${name}" to be strictly equal`,
            actual,
            expected: value,
          })
        }
      } else {
        if (value != actual) {
          throw new AssertionError({
            message: `Expected "${name}" to be equal`,
            actual,
            expected: value,
          })
        }
      }
    }

    return this
  }

  assertNotSet(name: string, value: any, strict: boolean = false) {
    let actual = this.get(name)

    if (strict) {
      if (actual === value) {
        throw new AssertionError({
          message: `Expected "${name}" to not be strictly equal`,
          actual,
          expected: `not ${value}`,
        })
      }
    } else {
      if (actual == value) {
        throw new AssertionError({
          message: `Expected "${name}" to not be equal`,
          actual,
          expected: `not ${value}`,
        })
      }
    }

    return this
  }

  assertSetStrict(name: string, value: any) {
    return this.assertSet(name, value, true)
  }

  assertNotSetStrict(name: string, value: any) {
    return this.assertNotSet(name, value, true)
  }

  assertReturned(value: any) {
    if (typeof value === 'function') {
      if (!value(this.lastReturnedValue)) {
        throw new AssertionError({
          message: `Assertion callback failed for returned value`,
          actual: this.lastReturnedValue,
        })
      }
    } else {
      if (this.lastReturnedValue !== value) {
        throw new AssertionError({
          message: `Expected method to return value`,
          actual: this.lastReturnedValue,
          expected: value,
        })
      }
    }

    return this
  }

  assertCount(name: string, count: number) {
    const actual = this.get(name)

    if (!Array.isArray(actual)) {
      throw new AssertionError({
        message: `Expected "${name}" to be an array`,
        actual: typeof actual,
        expected: 'array',
      })
    }

    if (actual.length !== count) {
      throw new AssertionError({
        message: `Expected "${name}" to have count of ${count}`,
        actual: actual.length,
        expected: count,
      })
    }

    return this
  }

  assertPayloadSet(name: string, value: any) {
    return this.assertSet(name, value)
  }

  assertPayloadNotSet(name: string, value: any) {
    return this.assertNotSet(name, value)
  }

  assertViewIs(viewName: string) {
    if (this.viewName !== viewName) {
      throw new AssertionError({
        message: `Expected view to be "${viewName}"`,
        actual: this.viewName,
        expected: viewName,
      })
    }

    return this
  }

  assertViewHas(key: string, value?: any) {
    if (!(key in this.viewData)) {
      throw new AssertionError({
        message: `Expected view to have key "${key}"`,
      })
    }

    if (value !== undefined && this.viewData[key] != value) {
      throw new AssertionError({
        message: `Expected view key "${key}" to have value`,
        actual: this.viewData[key],
        expected: value,
      })
    }

    return this
  }

  assertSee(text: string) {
    const content = this.renderedHtml.replace(/<[^>]*>/g, '')

    if (!content.includes(text)) {
      throw new AssertionError({
        message: `Expected to see "${text}" in rendered content`,
      })
    }

    return this
  }

  assertDontSee(text: string) {
    const content = this.renderedHtml.replace(/<[^>]*>/g, '')

    if (content.includes(text)) {
      throw new AssertionError({
        message: `Expected NOT to see "${text}" in rendered content`,
      })
    }

    return this
  }

  assertSeeHtml(html: string) {
    if (!this.renderedHtml.includes(html)) {
      throw new AssertionError({
        message: `Expected to see HTML "${html}" in rendered content`,
      })
    }

    return this
  }

  assertDontSeeHtml(html: string) {
    if (this.renderedHtml.includes(html)) {
      throw new AssertionError({
        message: `Expected NOT to see HTML "${html}" in rendered content`,
      })
    }

    return this
  }

  assertSeeInOrder(texts: string[]) {
    const content = this.renderedHtml.replace(/<[^>]*>/g, '')
    let lastIndex = -1

    for (const text of texts) {
      const index = content.indexOf(text, lastIndex + 1)
      if (index === -1 || index <= lastIndex) {
        throw new AssertionError({
          message: `Expected to see "${text}" after previous text in rendered content`,
        })
      }
      lastIndex = index
    }

    return this
  }

  assertSeeHtmlInOrder(htmls: string[]) {
    let lastIndex = -1

    for (const html of htmls) {
      const index = this.renderedHtml.indexOf(html, lastIndex + 1)
      if (index === -1 || index <= lastIndex) {
        throw new AssertionError({
          message: `Expected to see HTML "${html}" after previous HTML in rendered content`,
        })
      }
      lastIndex = index
    }

    return this
  }

  assertDispatched(name: string, ...params: any[]) {
    const event = this.dispatched.find((e) => e.name === name)

    if (!event) {
      throw new AssertionError({
        message: `Expected event "${name}" to be dispatched`,
      })
    }

    if (params.length > 0) {
      const paramsMatch = JSON.stringify(event.params) === JSON.stringify(params)

      if (!paramsMatch) {
        throw new AssertionError({
          message: `Expected event "${name}" to be dispatched with params`,
          actual: event.params,
          expected: params,
        })
      }
    }

    return this
  }

  assertNotDispatched(name: string) {
    const event = this.dispatched.find((e) => e.name === name)

    if (event) {
      throw new AssertionError({
        message: `Expected event "${name}" NOT to be dispatched`,
      })
    }

    return this
  }

  assertDispatchedTo(component: string, name: string) {
    const event = this.dispatched.find((e) => e.name === name && e.to === component)

    if (!event) {
      throw new AssertionError({
        message: `Expected event "${name}" to be dispatched to "${component}"`,
      })
    }

    return this
  }

  assertHasErrors(keys: string | string[] | Record<string, string | string[]>) {
    if (typeof keys === 'string') {
      if (!this.validationErrors[keys]) {
        throw new AssertionError({
          message: `Expected "${keys}" to have validation errors`,
        })
      }
    } else if (Array.isArray(keys)) {
      for (const key of keys) {
        if (!this.validationErrors[key]) {
          throw new AssertionError({
            message: `Expected "${key}" to have validation errors`,
          })
        }
      }
    } else {
      for (const [key, rules] of Object.entries(keys)) {
        if (!this.validationErrors[key]) {
          throw new AssertionError({
            message: `Expected "${key}" to have validation errors`,
          })
        }

        const rulesArray = Array.isArray(rules) ? rules : [rules]
        for (const rule of rulesArray) {
          const hasRule = this.validationErrors[key].some((msg) =>
            msg.toLowerCase().includes(rule.toLowerCase())
          )
          if (!hasRule) {
            throw new AssertionError({
              message: `Expected "${key}" to have "${rule}" validation error`,
            })
          }
        }
      }
    }

    return this
  }

  assertHasNoErrors(keys?: string | string[]) {
    if (keys === undefined) {
      if (Object.keys(this.validationErrors).length > 0) {
        throw new AssertionError({
          message: `Expected no validation errors`,
          actual: this.validationErrors,
        })
      }
    } else if (typeof keys === 'string') {
      if (this.validationErrors[keys]) {
        throw new AssertionError({
          message: `Expected "${keys}" to have no validation errors`,
        })
      }
    } else {
      for (const key of keys) {
        if (this.validationErrors[key]) {
          throw new AssertionError({
            message: `Expected "${key}" to have no validation errors`,
          })
        }
      }
    }

    return this
  }

  assertNotFound() {
    return this.assertStatus(404)
  }

  assertUnauthorized() {
    return this.assertStatus(401)
  }

  assertForbidden() {
    return this.assertStatus(403)
  }

  assertStatus(status: number) {
    if (this.statusCode !== status) {
      throw new AssertionError({
        message: `Expected status code ${status}`,
        actual: this.statusCode,
        expected: status,
      })
    }

    return this
  }

  assertRedirect(path?: string) {
    if (!this.redirectTo) {
      throw new AssertionError({
        message: `Expected a redirect to occur`,
      })
    }

    if (path !== undefined && this.redirectTo !== path) {
      throw new AssertionError({
        message: `Expected redirect to "${path}"`,
        actual: this.redirectTo,
        expected: path,
      })
    }

    return this
  }

  assertNoRedirect() {
    if (this.redirectTo) {
      throw new AssertionError({
        message: `Expected no redirect to occur`,
        actual: this.redirectTo,
      })
    }

    return this
  }

  assertDispatchedBrowserEvent(event: string, data?: any) {
    const found = this.browserEvents.find((e) => e.event === event)

    if (!found) {
      throw new AssertionError({
        message: `Expected browser event "${event}" to be dispatched`,
      })
    }

    if (data !== undefined) {
      const dataMatch = JSON.stringify(found.data) === JSON.stringify(data)
      if (!dataMatch) {
        throw new AssertionError({
          message: `Expected browser event "${event}" to be dispatched with data`,
          actual: found.data,
          expected: data,
        })
      }
    }

    return this
  }

  assertNotDispatchedBrowserEvent(event: string) {
    const found = this.browserEvents.find((e) => e.event === event)

    if (found) {
      throw new AssertionError({
        message: `Expected browser event "${event}" NOT to be dispatched`,
      })
    }

    return this
  }
}
