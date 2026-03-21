import Macroable from '@poppinss/macroable'
import { Component } from '../../component.js'
import { ComponentConstructor, ComponentEffects, ComponentSnapshot } from '../../types.js'
import { ComponentState } from './component_state.js'
import { DataStore, livewireContext } from '../../store.js'
import ComponentContext from '../../component_context.js'
import ComponentHook from '../../component_hook.js'
import { HttpContext } from '@adonisjs/core/http'
import Livewire from '../../livewire.js'
import { ApplicationService, HttpRouterService } from '@adonisjs/core/types'
import { Testable } from './testable.js'
import { MakesAssertions } from './makes_assertions.js'
import { TestsValidation } from '../support_validation/tests_validation.js'
import { TestsRedirects } from '../support_redirects/tests_redirects.js'
import edge from 'edge.js'
import { TestsEvents } from '../support_events/tests_events.js'

/**
 * Type helper to convert MakesAssertions methods to return ChainableTest
 */
type ChainableAssertions<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => any
    ? (...args: Args) => ChainableTest
    : T[K]
}

/**
 * Chainable promise wrapper for fluent testing API
 * Allows method chaining on asynchronous test operations
 */
class ChainableTest implements PromiseLike<Testable> {
  constructor(readonly promise: Promise<any>) {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver)

        // If the property exists on ChainableTest, return it
        if (value !== undefined) {
          return value
        }

        // List of assertion methods that should be chainable
        const assertionMethods = [
          'assertSet',
          'assertNotSet',
          'assertCount',
          'assertSee',
          'assertDontSee',
          'assertSeeHtml',
          'assertDontSeeHtml',
          'assertDispatched',
          'assertNotDispatched',
          'assertHasErrors',
          'assertHasNoErrors',
          'assertRedirect',
          'assertRedirectContains',
          'assertRedirectToRoute',
          'assertNoRedirect',
        ]

        const isAssertionMethod = assertionMethods.includes(prop as string)

        // For unknown methods, assume they exist on Testable
        // and wrap them to maintain the chain
        return (...args: any[]) => {
          return new ChainableTest(
            target.promise.then((test) => {
              const method = (test as any)[prop]

              if (typeof method !== 'function') {
                throw new Error(`Method '${String(prop)}' does not exist on Testable`)
              }

              const result = method.apply(test, args)

              // For assertion methods, they return 'this' synchronously when in context
              if (isAssertionMethod) {
                return test
              }

              // If the result is a Promise, wait for it and return the test
              if (result && typeof result.then === 'function') {
                return result.then(() => test)
              }

              // Otherwise just return the test for chaining
              return test
            })
          )
        }
      },
    }) as ChainableTest & ChainableAssertions<MakesAssertions>
  }

  then<TResult1 = Testable, TResult2 = never>(
    onfulfilled?: ((value: Testable) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): PromiseLike<Testable | TResult> {
    return this.promise.catch(onrejected)
  }

  finally(onfinally?: (() => void) | undefined | null): PromiseLike<Testable> {
    return this.promise.finally(onfinally)
  }

  // Chainable mutation methods - these just pass through to the test methods
  mount(...params: any[]): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.mount(...params)
        await chainable
        return test
      })
    )
  }

  set(propertyName: string, value: any): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.set(propertyName, value)
        await chainable
        return test
      })
    )
  }

  call(method: string, ...params: any[]): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.call(method, ...params)
        await chainable
        return test
      })
    )
  }

  toggle(propertyName: string): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.toggle(propertyName)
        await chainable
        return test
      })
    )
  }

  // Terminal methods that return values (wrapped in promises)
  async get(propertyName: string): Promise<any> {
    const test = await this.promise
    return test.get(propertyName)
  }

  async snapshot(): Promise<ComponentSnapshot> {
    const test = await this.promise
    return test.snapshot()
  }

  async effects(): Promise<ComponentEffects> {
    const test = await this.promise
    return test.effects()
  }

  async html(): Promise<string> {
    const test = await this.promise
    return test.html()
  }

  async instance(): Promise<Component> {
    const test = await this.promise
    return test.instance()
  }
}

// Add interface declaration to extend ChainableTest with MakesAssertions methods
interface ChainableTest
  extends
    ChainableAssertions<MakesAssertions>,
    ChainableAssertions<TestsValidation>,
    ChainableAssertions<TestsRedirects>,
    ChainableAssertions<TestsEvents> {}

export class BaseTestable extends Macroable {
  #state: ComponentState
  #dataStore: DataStore
  #componentContext: ComponentContext

  #app: ApplicationService
  #ctx: HttpContext
  // #router: HttpRouterService

  #features: ComponentHook[] = []
  #mountParams: any[] = []

  constructor(
    componentClass: ComponentConstructor,
    app: ApplicationService,
    router: HttpRouterService,
    ctx: HttpContext
  ) {
    super()

    const initialComponent = new componentClass({
      ctx,
      app,
      router,
      id: BaseTestable.#generateId(),
      name: 'test-component',
    })

    // Configure Edge renderer for template compilation
    const renderer = 'clone' in ctx.view ? ctx.view.clone() : edge.createRenderer()
    renderer.share(Livewire.generateComponentData(initialComponent))
    initialComponent.view = renderer

    const initialSnapshot: ComponentSnapshot = {
      data: {},
      memo: {
        id: initialComponent.__id,
        name: initialComponent.__name,
      },
      checksum: '',
    }

    this.#app = app
    this.#ctx = ctx
    // this.#router = router

    this.#state = new ComponentState(initialComponent, initialSnapshot)
    this.#dataStore = new DataStore(BaseTestable.#generateId())
    this.#componentContext = new ComponentContext(initialComponent)

    this.#features.push(...this.#createFeatures(initialComponent))
  }

  get mountParams() {
    return this.#mountParams
  }

  get state(): ComponentState {
    return this.#state
  }

  /**
   * Initialize the component with mount lifecycle
   */
  mount(...params: any[]): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.#dataStore,
        context: this.#componentContext,
        features: this.#features,
        ctx: this.#ctx,
      },
      () => this.#executeMount(...params)
    )
    return new ChainableTest(promise)
  }

  /**
   * Set a component property value
   */
  set(propertyName: string, value: any): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.#dataStore,
        context: this.#componentContext,
        features: this.#features,
        ctx: this.#ctx,
      },
      () => this.#executeSet(propertyName, value)
    )
    return new ChainableTest(promise)
  }

  /**
   * Call a component method
   */
  call(method: string, ...params: any[]): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.#dataStore,
        context: this.#componentContext,
        features: this.#features,
        ctx: this.#ctx,
      },
      () => this.#executeCall(method, ...params)
    )
    return new ChainableTest(promise)
  }

  /**
   * Toggle a boolean property
   */
  toggle(propertyName: string): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.#dataStore,
        context: this.#componentContext,
        features: this.#features,
        ctx: this.#ctx,
      },
      () => this.#executeToggle(propertyName)
    )
    return new ChainableTest(promise)
  }

  /**
   * Get a component property value
   */
  get(propertyName: string): any {
    return this.state.get(propertyName)
  }

  /**
   * Get the current component snapshot
   */
  snapshot(): ComponentSnapshot {
    return this.state.getSnapshot()
  }

  /**
   * Get the current component effects
   */
  effects(): ComponentEffects {
    return this.state.getEffects()
  }

  /**
   * Get the rendered HTML
   */
  html(): string {
    return this.state.getHtml()
  }

  /**
   * Get the component instance
   */
  instance(): Component {
    return this.state.getComponent()
  }

  /**
   * Get the component state
   */
  getState(): ComponentState {
    return this.state
  }

  // Private execution methods

  async #executeMount(...params: any[]): Promise<this> {
    this.#mountParams = params

    const component = this.state.getComponent()
    this.#componentContext.mounting = true

    // Call boot and mount hooks on all features
    for (const feature of this.#features) {
      await feature.callBoot()
      await feature.callMount(params[0] || {})
    }

    if (this.hasMethod(component, 'mount')) {
      await (component as any).mount(...params)
    }

    await this.#updateComponentState(component, this.#componentContext)

    return this
  }

  async #executeSet(propertyName: string, value: any): Promise<this> {
    const component = this.state.getComponent() as any

    // Handle nested properties like 'form.name'
    if (propertyName.includes('.')) {
      const parts = propertyName.split('.')
      let target = component
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]]
        if (target === undefined) {
          throw new Error(`Property '${parts.slice(0, i + 1).join('.')}' is undefined`)
        }
      }
      target[parts[parts.length - 1]] = value
    } else {
      component[propertyName] = value
    }

    await this.#updateComponentState(component, this.#componentContext)
    return this
  }

  async #executeCall(method: string, ...params: any[]): Promise<this> {
    const component = this.state.getComponent() as any

    if (!this.hasMethod(component, method)) {
      throw new Error(`Method '${method}' does not exist on component`)
    }

    await component[method](...params)
    await this.#updateComponentState(component, this.#componentContext)

    return this
  }

  async #executeToggle(propertyName: string): Promise<this> {
    const currentValue = this.get(propertyName)
    return this.#executeSet(propertyName, !currentValue)
  }

  async #updateComponentState(
    component: Component,
    componentContext: ComponentContext
  ): Promise<void> {
    let html = await component.render()

    // Process the HTML through Edge to compile directives like @if, @foreach, etc.
    // This mirrors PHP Livewire where Blade compiles the template
    html = await component.view.renderRaw(html, this.#getComponentState(component))

    const livewire = await component.app.container.make('livewire')
    const snapshot = await livewire.snapshot(component, componentContext)
    const effects = componentContext.effects

    this.state.update(snapshot, effects, html)
  }

  /**
   * Get component state for template rendering
   */
  #getComponentState(component: Component): Record<string, any> {
    const state: Record<string, any> = {}

    // Get all enumerable properties from the component
    for (const key of Object.keys(component)) {
      if (key.startsWith('_') || key.startsWith('#')) continue
      const value = (component as any)[key]
      if (typeof value !== 'function') {
        state[key] = value
      }
    }

    return state
  }

  #createFeatures(component: Component) {
    return Livewire.FEATURES.map((Feature) => {
      const feature = new Feature()
      feature.setComponent(component)
      feature.setApp(this.#app)
      return feature
    })
  }

  hasMethod(obj: any, methodName: string): boolean {
    return typeof obj[methodName] === 'function'
  }

  static #generateId(): string {
    return 'test-' + Math.random().toString(36).substring(2, 11)
  }
}
