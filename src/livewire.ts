import { ApplicationService, HttpRouterService } from '@adonisjs/core/types'
import { HttpContext, errors } from '@adonisjs/core/http'
import string from '@adonisjs/core/helpers/string'
import { Component } from './component.js'
import ComponentContext from './component_context.js'
import { DataStore, getLivewireContext, livewireContext, store } from './store.js'
import { Checksum } from './checksum.js'
import Layout from './features/support_page_components/layout.js'
import { Secret } from '@adonisjs/core/helpers'
import type { Config } from './define_config.js'
import { EventBus } from './event_bus.js'
import edge from 'edge.js'
import { Synth } from '../index.js'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import debug from './debug.js'
import type {
  ComponentSnapshot,
  ComponentCall,
  ComponentEffects,
  MountOptions,
  ComponentHookConstructor,
  ComponentConstructor,
} from './types.js'
import { Testable } from './features/support_testing/testable.js'
import { HttpContextFactory } from '@adonisjs/http-server/factories'
import { isSyntheticTuple } from './utils/synthetic.js'
import { insertAttributesIntoHtmlRoot as insertAttributesIntoHtml } from './utils/html.js'
import { extractComponentParts } from './utils/component.js'

export default class Livewire {
  app: ApplicationService
  router: HttpRouterService
  config: Config
  components = new Map<string, ComponentConstructor>()
  checksum: Checksum
  static FEATURES: ComponentHookConstructor[] = []
  static PROPERTY_SYNTHESIZERS: Array<typeof Synth> = []

  /**
   * Testing state - query params to pass to test context
   */
  #queryParamsForTesting: Record<string, any> = {}

  /**
   * Testing state - cookies to pass to test context
   */
  #cookiesForTesting: Record<string, string> = {}

  /**
   * Testing state - headers to pass to test context
   */
  #headersForTesting: Record<string, string> = {}

  /**
   * Testing state - whether lazy loading is disabled
   */
  #disableLazyLoading = false

  /**
   * Testing state - authenticated user for tests
   */
  #actingAsUser: { user: any; guard?: string } | null = null

  #ctxForTesting: HttpContext | null = null

  constructor(app: ApplicationService, router: HttpRouterService, config: Config) {
    this.app = app
    this.router = router
    this.config = config

    const appKey = this.app.config.get<string | Secret<string>>('app.appKey', 'appKey')
    const key = appKey instanceof Secret ? appKey.release() : appKey

    this.checksum = new Checksum(key)
  }

  static componentHook(feature: ComponentHookConstructor) {
    this.FEATURES.push(feature)
  }

  componentHook(feature: ComponentHookConstructor) {
    Livewire.FEATURES.push(feature)
  }

  static registerPropertySynthesizer(synth: typeof Synth | (typeof Synth)[]) {
    if (Array.isArray(synth)) {
      synth.forEach((s) => this.PROPERTY_SYNTHESIZERS.push(s))
    } else {
      this.PROPERTY_SYNTHESIZERS.push(synth)
    }
  }

  registerPropertySynthesizer(synth: typeof Synth | (typeof Synth)[]) {
    if (Array.isArray(synth)) {
      synth.forEach((s) => Livewire.PROPERTY_SYNTHESIZERS.push(s))
    } else {
      Livewire.PROPERTY_SYNTHESIZERS.push(synth)
    }
  }

  /**
   * Check if a component exists by name
   * PHP parity: exists($componentNameOrClass)
   */
  exists(name: string): boolean {
    if (this.components.has(name)) {
      return true
    }

    const jsPath = name
      .split('.')
      .map((s) => string.snakeCase(s))
      .join('/')

    const livewirePaths = [
      this.app.makeURL(`./app/livewire/${jsPath}.js`),
      this.app.makeURL(`./app/livewire/${jsPath}/index.js`),
      this.app.makeURL(`./app/livewire/${jsPath}.ts`),
      this.app.makeURL(`./app/livewire/${jsPath}.tsx`),
      this.app.makeURL(`./app/livewire/${jsPath}/index.ts`),
      this.app.makeURL(`./app/livewire/${jsPath}/index.tsx`),
    ]

    for (const livewirePath of livewirePaths) {
      if (existsSync(fileURLToPath(livewirePath))) {
        return true
      }
    }

    const viewPath = name
      .split('.')
      .map((s) => string.snakeCase(s))
      .join('/')

    const livewireViewPaths = [
      this.app.makeURL(`./resources/views/livewire/${viewPath}.edge`),
      this.app.makeURL(`./resources/views/livewire/${viewPath}/index.edge`),
    ]

    for (const livewireViewPath of livewireViewPaths) {
      if (existsSync(fileURLToPath(livewireViewPath))) {
        return true
      }
    }

    return false
  }

  /**
   * Set query params for testing
   * PHP parity: withQueryParams($params)
   *
   * @example
   * ```ts
   * await Livewire
   *   .withQueryParams({ page: 1, sort: 'name' })
   *   .test(SearchComponent)
   *   .mount()
   * ```
   */
  withQueryParams(params: Record<string, any>): this {
    this.#queryParamsForTesting = params
    return this
  }

  /**
   * Set a cookie for testing
   * PHP parity: withCookie($name, $value)
   */
  withCookie(name: string, value: string): this {
    this.#cookiesForTesting[name] = value
    return this
  }

  /**
   * Set cookies for testing
   * PHP parity: withCookies($cookies)
   *
   * @example
   * ```ts
   * await Livewire
   *   .withCookies({ session_id: 'abc123' })
   *   .test(MyComponent)
   *   .mount()
   * ```
   */
  withCookies(cookies: Record<string, string>): this {
    this.#cookiesForTesting = { ...this.#cookiesForTesting, ...cookies }
    return this
  }

  /**
   * Set headers for testing
   * PHP parity: withHeaders($headers)
   *
   * @example
   * ```ts
   * await Livewire
   *   .withHeaders({ 'Accept-Language': 'pt-BR' })
   *   .test(MyComponent)
   *   .mount()
   * ```
   */
  withHeaders(headers: Record<string, string>): this {
    this.#headersForTesting = { ...this.#headersForTesting, ...headers }
    return this
  }

  /**
   * Disable lazy loading for testing
   * PHP parity: withoutLazyLoading()
   *
   * @example
   * ```ts
   * await Livewire
   *   .withoutLazyLoading()
   *   .test(LazyComponent)
   *   .mount()
   * ```
   */
  withoutLazyLoading(): this {
    this.#disableLazyLoading = true
    return this
  }

  withHttpContext(ctx: HttpContext): this {
    this.#ctxForTesting = ctx
    return this
  }

  /**
   * Set the authenticated user for testing
   * PHP parity: actingAs($user, $driver = null)
   *
   * @example
   * ```ts
   * const user = await User.find(1)
   * await Livewire
   *   .actingAs(user)
   *   .test(ProfileComponent)
   *   .mount()
   * ```
   */
  actingAs(user: any, guard?: string): this {
    this.#actingAsUser = { user, guard }
    return this
  }

  /**
   * Reset testing state
   * Called internally after test() to clean up
   */
  #resetTestingState(): void {
    this.#queryParamsForTesting = {}
    this.#cookiesForTesting = {}
    this.#headersForTesting = {}
    this.#disableLazyLoading = false
    this.#actingAsUser = null
  }

  /**
   * Test a Livewire component
   * PHP parity: Livewire::test($name, $params = [])
   *
   * Creates a Testable instance for fluent testing of components.
   *
   * @example
   * ```ts
   * import Livewire from 'adonisjs-livewire/services/main'
   * import Counter from '#livewire/counter'
   *
   * await Livewire.test(Counter)
   *   .mount()
   *   .call('increment')
   *   .assertSet('count', 1)
   * ```
   */
  test(componentClass: ComponentConstructor): Testable {
    debug('test: preparing testable for component %s', componentClass.name)

    const ctx = this.#ctxForTesting || new HttpContextFactory().create()

    // Apply query params to request
    if (Object.keys(this.#queryParamsForTesting).length > 0) {
      for (const [key, value] of Object.entries(this.#queryParamsForTesting)) {
        ctx.request.updateQs({ [key]: value })
      }
    }

    // Apply headers to request
    if (Object.keys(this.#headersForTesting).length > 0) {
      for (const [key, value] of Object.entries(this.#headersForTesting)) {
        ctx.request.request.headers[key.toLowerCase()] = value
      }
    }

    // Apply cookies to request
    // Note: cookies handling depends on session/cookie implementation

    // Handle authenticated user
    if (this.#actingAsUser) {
      const { user, guard } = this.#actingAsUser
      // Auth is optional and may not be configured
      const auth = (ctx as any).auth
      if (auth) {
        auth.use(guard).login(user)
      }
    }

    // Capture state before reset
    const disableLazyLoading = this.#disableLazyLoading

    // Reset testing state for next test
    this.#resetTestingState()

    const testable = new Testable(componentClass, this.app, this.router, ctx)

    // Apply lazy loading setting
    if (disableLazyLoading) {
      // TODO: Implement lazy loading disable on testable
    }

    return testable
  }

  /**
   * Check if current request is a Livewire request
   * PHP parity: isLivewireRequest()
   */
  static isLivewireRequest(ctx?: HttpContext): boolean {
    const context = ctx || getLivewireContext()?.ctx
    if (!context) return false
    return context.request.header('x-livewire') !== undefined
  }

  /**
   * Instance method for isLivewireRequest
   */
  isLivewireRequest(ctx?: HttpContext): boolean {
    return Livewire.isLivewireRequest(ctx)
  }

  /**
   * Get the current component from the Livewire context
   * PHP parity: current()
   */
  static current(): Component | null {
    const context = getLivewireContext()
    return context?.context?.component ?? null
  }

  /**
   * Flush static state between requests (useful for testing)
   * PHP parity: flushState()
   */
  static flushState(): void {
    debug('flushState: clearing static state')
    Livewire.FEATURES = []
    Livewire.PROPERTY_SYNTHESIZERS = []
  }

  /**
   * Instance method to flush state and clear component cache
   */
  flushState(): void {
    debug('flushState: clearing instance and static state')
    this.components.clear()
    Livewire.flushState()
  }

  async trigger(event: string, component: Component, ...params: any[]) {
    debug('trigger: event=%s component=%s', event, component.getName())
    const context = getLivewireContext()
    if (!context) return []

    const eventBus = await this.app.container.make(EventBus)

    // TODO: migrate everything to event bus
    await eventBus.trigger(event, component, ...params)

    const { features } = context
    const callbacks: any[] = []
    for (const feature of features) {
      feature.setComponent(component)
      feature.setApp(this.app)

      if (event === 'mount') {
        await feature.callBoot()
        await feature.callMount(params[0])
      } else if (event === 'hydrate') {
        await feature.callBoot()
        await feature.callHydrate(params[0], params[1])
      } else if (event === 'dehydrate') {
        await feature.callDehydrate(params[0])
      } else if (event === 'render') {
        const callback = await feature.callRender(...params)
        if (callback) {
          callbacks.push(callback)
        }
      } else if (event === 'update') {
        await feature.callUpdate(params[0], params[1], params[2])
      } else if (event === 'call') {
        // params = [method, methodParams, componentContext, returnEarly]
        const callback = await feature.callCall(
          params[0], // method
          params[1], // params
          params[3], // returnEarly
          undefined, // metadata (not used currently)
          params[2] // componentContext
        )
        if (callback) {
          callbacks.push(callback)
        }
      } else if (event === 'destroy') {
        await feature.callDestroy(...params)
      } else if (event === 'exception') {
        await feature.callException(...params)
      }
    }

    return callbacks
  }

  static generateComponentData(component: Component) {
    let data: Record<string, any> = {}
    let prototype = Object.getPrototypeOf(component)

    while (prototype && prototype !== Object.prototype) {
      const props = Object.getOwnPropertyNames(prototype)

      for (const prop of props) {
        // Properties starting with # are automatically excluded by runtime
        // Only exclude methods that start with __ (like __dispatch, __lazyLoad)
        if (
          [
            'constructor',
            'render',
            'ctx',
            'view',
            'setId',
            'setName',
            'addDecorator',
            'redirect',
            'setViewPath',
            'dispatch',
            'getListeners',
            'skipRender',
            'skipMount',
            'skipHydrate',
            'js',
            'getDecorators',
            'app',
          ].includes(prop)
        ) {
          continue
        }

        const descriptor = Object.getOwnPropertyDescriptor(prototype, prop)

        if (descriptor && (descriptor.get || descriptor.set)) {
          data = Object.assign(data, {
            get [prop]() {
              return component[prop]
            },
          })
        } else if (typeof component[prop] === 'function') {
          data[prop] = component[prop].bind(component)
        } else {
          data[prop] = component[prop]
        }
      }

      prototype = Object.getPrototypeOf(prototype)
    }

    for (const key of Object.keys(component)) {
      // Properties starting with # are automatically excluded by runtime
      // Only exclude methods that start with __ (like __dispatch, __lazyLoad)
      if (key.startsWith('__') && typeof component[key] === 'function') {
        continue
      }

      if (['app', 'ctx'].includes(key)) continue

      // if ([].includes(key)) {
      //   continue
      // }

      data[key] = component[key]
    }

    return data
  }

  async mount(
    ctx: HttpContext,
    name: string,
    params: Record<string, any> = {},
    options: MountOptions = {}
  ) {
    debug('mounting component %s with params %O and options %O', name, params, options)
    let component = await this.new(ctx, name)

    let context = new ComponentContext(component, true)
    let dataStore = new DataStore(string.generateRandom(32))
    let features = Livewire.FEATURES.map((Feature) => {
      let feature = new Feature()
      feature.setComponent(component)
      feature.setApp(this.app)
      return feature
    })

    return await livewireContext.run({ dataStore, context, features, ctx }, async () => {
      if (options.layout && !component.getDecorators().some((d) => d instanceof Layout)) {
        component.addDecorator(new Layout(options.layout.name))
      }

      context.addMemo('path', ctx.request.url())

      await this.trigger('mount', component, params, options.key)

      const s = store(component)

      let skipMount = s.get('skipMount') ?? false
      skipMount = Array.isArray(skipMount) ? skipMount[0] : skipMount
      if (!skipMount) {
        //@ts-ignore
        if (typeof component.mount === 'function') {
          const resolvedParams = [params]

          const isResourceModel = (value: any) => {
            if (!value) {
              return false
            }

            return (
              typeof value['findForRequest'] === 'function' ||
              typeof value['findOrFail'] === 'function' ||
              typeof value['findRelatedForRequest'] === 'function'
            )
          }

          if (component['bindings'] && component['bindings']['mount']) {
            for (let index = 1; index < component['bindings']['mount'].length; index++) {
              const binding = component['bindings']['mount'][index]

              if (isResourceModel(binding.type)) {
                resolvedParams.push(await binding.type.findOrFail(params[binding.name]))
              } else {
                resolvedParams.push(params[binding.name])
              }
            }
          }

          //@ts-ignore
          await component.mount(...resolvedParams)
        } else {
          for (let paramKey in params) {
            if (paramKey in component) {
              component[paramKey] = params[paramKey]
            }
          }
        }
      }

      // pickup newely added props, like ts declared props
      Livewire.setOrUpdateComponentView(component, ctx)
      ;(await this.trigger('render', component, component.view, [])) as any

      let content = (await this.render(component, '<div></div>')) || '<div></div>'
      let html = await component.view.renderRaw(content)

      await this.trigger('dehydrate', component, context)

      let snapshot = await this.snapshot(component, context)

      for (const key of Object.keys(params)) {
        if (key.startsWith('@')) {
          let value = params[key]
          let fullEvent = string.dashCase(key.replace('@', ''))
          let attributeKey = 'x-on:' + fullEvent
          let attributeValue = `$wire.$parent.${value}`

          html = this.insertAttributesIntoHtmlRoot(html, {
            [attributeKey]: attributeValue,
          })
        } else if (key.startsWith('wire:')) {
          let value = params[key]
          let attributeKey = key
          let attributeValue = value

          html = this.insertAttributesIntoHtmlRoot(html, {
            [attributeKey]: attributeValue,
          })
        }
      }

      let binding = s.get('bindings')[0]
      if (binding) {
        html = this.insertAttributesIntoHtmlRoot(html, {
          'x-modelable': `$wire.${binding.inner}`,
        })
      }

      html = this.insertAttributesIntoHtmlRoot(html, {
        'wire:snapshot': JSON.stringify(snapshot),
        'wire:effects': JSON.stringify(context.effects),
      })

      let decorators = component.getDecorators()
      let layout = decorators.find((d) => d instanceof Layout) as Layout

      // TODO: find a better way to do this
      if (layout) {
        let layoutName = layout.name.replaceAll('.', '/')
        let layoutProps = layout.props
        html = await component.view.renderRaw(
          `@component(layoutName, layoutProps)\n${html}\n@end`,
          {
            layoutProps,
            layoutName,
          }
        )
      }

      return html
    })
  }

  async fromSnapshot(ctx: HttpContext, snapshot: ComponentSnapshot) {
    debug('fromSnapshot: restoring component=%s id=%s', snapshot.memo.name, snapshot.memo.id)
    this.checksum.verify(snapshot)
    debug('fromSnapshot: checksum verified for %s', snapshot.memo.name)

    const router = await this.app.container.make('router')
    const path = snapshot.memo.path
    const route = path ? router.find(path) : null

    if (route) {
      await route.middleware.runner().run((handler, next) => {
        return typeof handler !== 'function' && !!handler.name
          ? handler.handle(ctx.containerResolver, ctx, next, handler.args)
          : next()
      })

      if (ctx.response.getStatus() >= 300) {
        throw errors.E_HTTP_REQUEST_ABORTED.invoke(ctx.response.getBody(), ctx.response.getStatus())
      }
    }

    let data = snapshot['data']
    let name = snapshot['memo']['name']
    let id = snapshot['memo']['id']

    let component = await this.new(ctx, name, id)
    let context = new ComponentContext(component)

    await this.hydrateProperties(component, data, context)

    return [component, context] as [Component, ComponentContext]
  }

  async new(ctx: HttpContext, name: string, id: string | null = null) {
    debug('new: creating component=%s id=%s', name, id || 'auto-generated')
    let LivewireComponent: ComponentConstructor

    if (this.components.has(name)) {
      debug('new: found cached component class for %s', name)
      LivewireComponent = this.components.get(name)!
    } else {
      let jsPath = name
        .split('.')
        .map((s) => string.snakeCase(s))
        .join('/')

      const livewirePaths = [
        this.app.makeURL(`./app/livewire/${jsPath}.js`),
        this.app.makeURL(`./app/livewire/${jsPath}/index.js`),
        this.app.makeURL(`./app/livewire/${jsPath}.ts`),
        this.app.makeURL(`./app/livewire/${jsPath}.tsx`),
        this.app.makeURL(`./app/livewire/${jsPath}/index.ts`),
        this.app.makeURL(`./app/livewire/${jsPath}/index.tsx`),
      ]

      for (const livewirePath of livewirePaths) {
        if (existsSync(fileURLToPath(livewirePath))) {
          LivewireComponent = await import(livewirePath.href.replace(/\.(ts|tsx)$/, '.js')).then(
            (m) => m.default
          )
          if (this.app.inProduction) {
            this.components.set(name, LivewireComponent)
          }
          break
        }
      }

      //@ts-ignore
      if (!LivewireComponent) {
        let viewPath = name
          .split('.')
          .map((s) => string.snakeCase(s))
          .join('/')

        const livewireViewPaths = [
          this.app.makeURL(`./resources/views/livewire/${viewPath}.edge`),
          this.app.makeURL(`./resources/views/livewire/${viewPath}/index.edge`),
        ]

        for (const livewireViewPath of livewireViewPaths) {
          if (existsSync(fileURLToPath(livewireViewPath))) {
            let component = await this.buildSingleFileComponent(name, livewireViewPath.href)

            if (component) {
              LivewireComponent = component
              if (this.app.inProduction && LivewireComponent) {
                this.components.set(name, LivewireComponent)
              }
              break
            }
          }
        }
      }

      //@ts-ignoreß
      if (!LivewireComponent) {
        throw new Error(`Livewire component not found for ${name}`)
      }
    }

    let componentId = id ?? string.generateRandom(20)
    const router = await this.app.container.make('router')

    let component = new LivewireComponent({
      ctx,
      app: this.app,
      router,
      id: componentId,
      name,
    })
    debug('new: instantiated component=%s with id=%s', name, componentId)

    let viewPath = name
      .split('.')
      .map((s) => string.dashCase(s))
      .join('/')

    component.setViewPath(`livewire/${viewPath}`)

    Livewire.setOrUpdateComponentView(component, ctx)

    return component
  }

  // TODO: https://github.com/edge-js/edge/pull/156
  static extractRequestViewLocals(ctx?: HttpContext) {
    const context = ctx || getLivewireContext()?.ctx

    if (!context || !context.view) {
      return {}
    }

    let extracted = {
      locals: {},
    }

    context.view.renderRawSync(`@eval(extracted.locals = state)`, {
      extracted,
    })

    return extracted.locals
  }

  static setOrUpdateComponentView(component: Component, ctx?: HttpContext) {
    const context = ctx || getLivewireContext()?.ctx

    if (!context) {
      throw new Error(
        'Cannot access http context. ctx must be passed explicitly or available in livewireContext.'
      )
    }

    const renderer = 'clone' in context.view ? context.view.clone() : edge.createRenderer()

    if (!('clone' in context.view)) {
      console.warn(
        `Livewire: The view renderer is not a clone. This may cause unexpected behavior, upgrade to Edge.js v6.2.0 or higher.`
      )
      renderer.share(Livewire.extractRequestViewLocals(context))
    }
    renderer.share(Livewire.generateComponentData(component))

    component.view = renderer
  }

  protected async hydrate(data: any, context: ComponentContext, path: string) {
    debug('hydrating property at path %s', path)
    if (!isSyntheticTuple(data)) {
      return data
    }

    const [value, meta] = data

    // Nested properties get set as `__rm__` when they are removed. We don't want to hydrate these.
    if (value === '__rm__' && path.includes('.')) {
      return value
    }

    const synth = this.propertySynth(meta['s'], context, path)

    return await synth.hydrate(value, meta, async (name: string, child: any) => {
      return await this.hydrate(child, context, `${path}.${name}`)
    })
  }

  protected async hydrateProperties(
    component: Component,
    data: Record<string, any>,
    context: ComponentContext
  ) {
    for (let key in data) {
      if (['view'].includes(key)) {
        continue
      }

      const child = await this.hydrate(data[key], context, key)
      if (typeof component[key] !== 'function') {
        component[key] = child
      }
    }
  }

  async update(
    ctx: HttpContext,
    snapshot: ComponentSnapshot,
    updates: Record<string, any>,
    calls: ComponentCall[]
  ) {
    debug('updating component %s with updates %O and calls %O', snapshot.memo.name, updates, calls)
    let dataStore = new DataStore(string.generateRandom(32))
    let [component, context] = await this.fromSnapshot(ctx, snapshot)
    let features = Livewire.FEATURES.map((Feature) => {
      let feature = new (Feature as any)()
      feature.setComponent(component)
      feature.setApp(this.app)
      return feature
    })

    return await livewireContext.run({ dataStore, context, features, ctx }, async () => {
      let data = snapshot.data
      let memo = snapshot.memo
      let path = snapshot.memo.path ?? ''

      context.addMemo('path', path)

      await this.trigger('hydrate', component, memo, context)

      await this.updateProperties(component, updates, data, context)

      await this.callMethods(component, calls, context)

      // handle declare properties, they should be set after mount
      Livewire.setOrUpdateComponentView(component, ctx)

      let html = await this.render(component)
      html = await component.view.renderRaw(html || '')

      if (html) {
        context.addEffect('html', html)
      }

      await this.trigger('dehydrate', component, context)

      let newSnapshot = await this.snapshot(component, context)

      return [newSnapshot, context.effects] as [ComponentSnapshot, ComponentEffects]
    })
  }

  /**
   * Get public methods from a component (excluding internal ones)
   * PHP parity: getPublicMethods
   */
  protected getPublicMethods(component: Component): string[] {
    const methods: string[] = []
    let prototype = Object.getPrototypeOf(component)

    while (prototype && prototype !== Object.prototype) {
      const props = Object.getOwnPropertyNames(prototype)

      for (const prop of props) {
        if (prop === 'constructor') continue
        if (prop === 'render') continue
        if (prop.startsWith('_')) continue

        const descriptor = Object.getOwnPropertyDescriptor(prototype, prop)
        if (descriptor && typeof descriptor.value === 'function') {
          methods.push(prop)
        }
      }

      prototype = Object.getPrototypeOf(prototype)
    }

    // Add internal dispatch methods
    methods.push('__dispatch')
    methods.push('__lazyLoad')
    methods.push('$refresh')
    methods.push('$commit')
    methods.push('$set')

    return methods
  }

  async callMethods(
    component: Component,
    calls: ComponentCall[],
    context: ComponentContext
  ): Promise<any[]> {
    debug('callMethods: executing %d calls on component=%s', calls.length, component.getName())

    // PHP parity: validate max calls limit
    const maxCalls = this.config.limits.maxCalls
    if (calls.length > maxCalls) {
      throw new Error(
        `Too many method calls. Maximum allowed: ${maxCalls}, received: ${calls.length}`
      )
    }

    // Get valid public methods for validation
    const publicMethods = this.getPublicMethods(component)

    let returns: any[] = []

    for (const call of calls) {
      try {
        let method = call['method']
        let params = call['params']
        debug('callMethods: executing method=%s with params=%O', method, params)

        // PHP parity: validate method is public and callable
        if (!publicMethods.includes(method)) {
          throw new Error(
            `Method \`${method}\` does not exist or is not callable on component ${component.getName()}`
          )
        }

        let earlyReturnCalled = false
        let earlyReturn: any = null
        const returnEarly = (returnVal: any = null) => {
          earlyReturnCalled = true
          earlyReturn = returnVal
        }

        const callbacks = await this.trigger(
          'call',
          component,
          method,
          params,
          context,
          returnEarly
        )

        if (earlyReturnCalled) {
          // Execute all callbacks returned by hooks
          for (const callback of callbacks) {
            if (typeof callback === 'function') {
              await callback(earlyReturn)
            }
          }
          returns.push(earlyReturn)

          continue
        }

        if (method === '__dispatch') {
          const features = getLivewireContext()!.features
          let result = await features[1].callCall('__dispatch', params, returnEarly)
          returns.push(result)
        } else if (method === '__lazyLoad') {
          // Handled by SupportLazyLoading via trigger('call', ...) above
          // If we reach here, returnEarly wasn't called - just push null
          returns.push(null)
        } else if (method === '$refresh') {
          // $refresh is a special method that just triggers a re-render
          // No actual method call needed - the component will be re-rendered at the end of the request
          returns.push(null)
        } else if (method === '$commit') {
          // $commit is similar to $refresh - just triggers a re-render
          returns.push(null)
        } else if (method === '$set') {
          // $set(property, value) - sets a property value
          const [property, value] = params
          if (property in component) {
            //@ts-ignore
            component[property] = value
          }
          returns.push(null)
        } else {
          //@ts-ignore
          let result = await component[method](...params)
          returns.push(result)
        }
      } catch (error) {
        debug('callMethods: ERROR in method=%s error=%O', call['method'], error)
        console.error(error)
        if ((error as any).code === 'E_VALIDATION_ERROR') {
          //@ts-ignore
          component.ctx.session?.flashValidationErrors(error)
        } else if ((error as any).code === 'E_INVALID_CREDENTIALS') {
          //@ts-ignore
          const session = component.ctx.session

          if (session) {
            session.flashExcept(['_csrf', '_method', 'password', 'password_confirmation'])
            session.flashErrors({ [(error as any).code!]: (error as any).message })
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    }

    context.addEffect('returns', returns)
    return returns
  }

  getSynthesizerByKey(key: string, context: ComponentContext, path: string): Synth {
    for (let synth of Livewire.PROPERTY_SYNTHESIZERS) {
      if (synth.getKey() === key) {
        // @ts-ignore
        return new synth(context, path, this.app)
      }
    }

    throw new Error('No synthesizer found for key: "' + key + '"')
  }

  getSynthesizerByTarget(target: any, context: ComponentContext, path: string): Synth {
    for (let synth of Livewire.PROPERTY_SYNTHESIZERS) {
      if (synth.match(target)) {
        // @ts-ignore
        return new synth(context, path, this.app)
      }
    }

    throw new Error(
      'Property type not supported in Livewire for property: [' + JSON.stringify(target) + ']'
    )
  }

  propertySynth(keyOrTarget: any, context: ComponentContext, path: string): Synth {
    return typeof keyOrTarget === 'string'
      ? this.getSynthesizerByKey(keyOrTarget, context, path)
      : this.getSynthesizerByTarget(keyOrTarget, context, path)
  }

  /**
   * Try to get a synthesizer for the target, return null if not found
   * PHP parity: propertySynth (but doesn't throw)
   */
  tryGetSynthesizerByTarget(target: any, context: ComponentContext, path: string): Synth | null {
    for (let synth of Livewire.PROPERTY_SYNTHESIZERS) {
      if (synth.match(target)) {
        // @ts-ignore
        return new synth(context, path, this.app)
      }
    }
    return null
  }

  /**
   * Recursively set a deeply nested value, using synthesizers when available
   * PHP parity: recursivelySetValue
   *
   * This ensures Form objects and other synthesized types have their
   * set() methods called correctly when updating nested properties
   */
  protected async recursivelySetValue(
    baseProperty: string,
    target: any,
    leafValue: any,
    segments: string[],
    index: number = 0,
    context: ComponentContext
  ): Promise<any> {
    const isLastSegment = index === segments.length - 1
    const property = segments[index]
    const path = segments.slice(0, index + 1).join('.')

    // Try to get a synthesizer for this target
    const synth = this.tryGetSynthesizerByTarget(target, context, path)

    let toSet: any
    if (isLastSegment) {
      toSet = leafValue
    } else {
      // Get the nested property value
      let propertyTarget = synth ? synth.get(target, property) : target[property]

      // If the nested value doesn't exist, create an empty object
      if (propertyTarget === null || propertyTarget === undefined) {
        propertyTarget = {}
      }

      toSet = await this.recursivelySetValue(
        baseProperty,
        propertyTarget,
        leafValue,
        segments,
        index + 1,
        context
      )
    }

    // Use synthesizer's set() if available, otherwise set directly
    if (synth) {
      synth.set(target, property, toSet)
    } else {
      target[property] = toSet
    }

    return target
  }

  async dehydrate(target: any, context: ComponentContext, path: string) {
    debug('dehydrating property at path %s', path)
    const isPrimitive = (v: any) =>
      v === null ||
      ['string', 'number', 'boolean', 'undefined'].includes(typeof v) ||
      (typeof target === 'object' && target.constructor.name === 'Object')

    if (isPrimitive(target)) {
      return target
    }

    if (Array.isArray(target) && target.every(isPrimitive)) {
      return target
    }

    try {
      const synth = this.propertySynth(target, context, path)

      const [data, meta] = await synth.dehydrate(target, async (name: string, child: any) => {
        return await this.dehydrate(child, context, `${path}.${name}`)
      })

      //@ts-ignore
      meta['s'] = synth.getKey()

      return [data, meta]
    } catch (error) {
      console.error(error)
      return target
    }
  }

  async dehydrateProperties(component: Component, context: ComponentContext) {
    const data = {}
    for (let key in component) {
      // Properties starting with # are automatically excluded by runtime
      // Only exclude methods that start with __ (like __dispatch, __lazyLoad)
      if (key.startsWith('__') && typeof component[key] === 'function') {
        continue
      }

      if (['ctx', 'app', 'router'].includes(key)) {
        continue
      }

      if (typeof component[key] === 'function') {
        continue
      }

      data[key] = component[key]
    }

    for (let key in data) {
      data[key] = await this.dehydrate(data[key], context, key)
    }

    return data

    // return JSON.parse(
    //   JSON.stringify(component, (key, value) => {
    //     if (key.startsWith('__')) return undefined

    //     return value
    //   })
    // )
  }

  async snapshot(
    component: Component,
    context: ComponentContext | null = null
  ): Promise<ComponentSnapshot> {
    debug('creating snapshot for component %s', component.getName())
    context = context ?? new ComponentContext(component)

    let data = await this.dehydrateProperties(component, context)

    const s = store(component)

    // if (context.mounting) {
    //     if (component.listeners && Object.keys(component.listeners).length > 0) {
    //         context.addEffect('listeners', component.listeners);
    //     }
    // }

    if (s.has('dispatched')) {
      context.addEffect('dispatches', s.get('dispatched'))
    }

    let snapshot: Omit<ComponentSnapshot, 'checksum'> = {
      data: data,
      memo: {
        id: component.getId(),
        name: component.getName(),
        path: component.getName().toLowerCase(),
        method: 'GET',
        // TODO: support nesting components
        children: [],
        scripts: [],
        assets: [],
        errors: {} as Record<string, string[]>,
        locale: 'en',
        ...context.memo,
      },
    }

    const finalSnapshot = snapshot as ComponentSnapshot
    finalSnapshot.checksum = this.checksum.generate(snapshot)

    return finalSnapshot
  }

  protected async updateProperties(
    component: Component,
    updates: Record<string, any>,
    data: Record<string, any>,
    context: ComponentContext
  ) {
    for (const key in updates) {
      if (['view'].includes(key)) continue

      let segments = key.split('.')
      let property = segments[0]
      if (!(property in component)) return

      let child = updates[key]

      if (isSyntheticTuple(data[property])) {
        child = await this.hydrate(updates[key], context, key)
      }

      if (Array.isArray(data[property]) && segments.length === 2 && child === '__rm__') {
        component[property].splice(segments[1], 1)
        continue
      }

      if (typeof component['updating'] === 'function') {
        await component['updating'](property, child)
      }

      let updatingPropMethod = `updating${string.titleCase(property)}`

      if (typeof component[updatingPropMethod] === 'function') {
        await component[updatingPropMethod](child)
      }

      if (segments.length > 1) {
        const propertyValue = component[property]
        component[property] = await this.recursivelySetValue(
          property,
          propertyValue,
          child,
          segments.slice(1),
          0,
          context
        )
      } else {
        const currentValue = component[property]
        const isForm =
          currentValue &&
          typeof currentValue === 'object' &&
          currentValue.constructor.name.includes('Form')

        if (isForm) {
          if (child && typeof child === 'object') {
            for (const [childKey, childValue] of Object.entries(child)) {
              currentValue[childKey] = childValue
            }
          }
        } else {
          component[property] = child
        }
      }

      await this.trigger('update', component, key, key, child)

      if (typeof component['updated'] === 'function') {
        await component['updated'](property, child)
      }

      let updatedPropMethod = `updated${string.titleCase(property)}`

      if (typeof component[updatedPropMethod] === 'function') {
        await component[updatedPropMethod](child)
      }
    }
  }

  async render(component: Component, defaultValue?: string) {
    debug('rendering component %s', component.getName())
    // let isRedirect = (store(component).get('redirect') ?? []).length > 0
    let skipRenderHtml = store(component).get('skipRender') ?? false
    skipRenderHtml = Array.isArray(skipRenderHtml) ? skipRenderHtml[0] : skipRenderHtml

    if (skipRenderHtml) {
      skipRenderHtml = skipRenderHtml ?? defaultValue ?? '<div></div>'

      if (skipRenderHtml === true) {
        return
      }

      return this.insertAttributesIntoHtmlRoot(skipRenderHtml, {
        'wire:id': component.getId(),
      })
    }

    let session: any = component.ctx['session']

    if (session) {
      //@ts-ignore
      const isLivewireRequest =
        typeof component.ctx.request.request.headers['x-livewire'] !== 'undefined'

      component.view.share({
        flashMessages: isLivewireRequest ? session.responseFlashMessages : session.flashMessages,
        old: function (key: string, defaultVal?: any) {
          return (isLivewireRequest ? session.responseFlashMessages : session.flashMessages).get(
            key,
            defaultVal
          )
        },
      })
    }

    let finish = (await this.trigger('render', component, component.view, [])) as any
    let html = (await component.render()) || defaultValue || '<div></div>'

    html = this.insertAttributesIntoHtmlRoot(html, {
      'wire:id': component.getId(),
    })

    for (const callback of finish) {
      if (typeof callback === 'function') {
        await callback(html, (newHtml: string) => {
          html = newHtml
        })
      }
    }

    return html
  }

  component(name: string, component: ComponentConstructor) {
    return this.components.set(name, component)
  }

  insertAttributesIntoHtmlRoot(html: string, attributes: { [key: string]: string }): string {
    return insertAttributesIntoHtml(html, attributes)
  }

  async buildSingleFileComponent(
    name: string,
    livewireViewPath: string
  ): Promise<ComponentConstructor | undefined> {
    const content = await readFile(fileURLToPath(livewireViewPath), 'utf-8')

    const { serverCode, template } = extractComponentParts(content)

    if (!serverCode) {
      return
    }

    const parts = name.split('.')
    const path = this.app.tmpPath('/livewire/', ...parts.slice(0, -1))
    const filePath = path + parts[parts.length - 1] + '.js'

    await mkdir(path, {
      recursive: true,
    })

    await writeFile(filePath, serverCode)

    const { default: component } = await import(filePath)
    component.prototype.render = function () {
      return template
    }

    return component
  }
}

// function getPublicMethods(obj: any) {
//   const proto = Object.getPrototypeOf(obj)
//   return Object.getOwnPropertyNames(proto).filter(
//     (prop) => typeof proto[prop] === 'function' && prop !== 'constructor'
//   )
// }
