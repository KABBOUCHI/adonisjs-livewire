import { ApplicationService } from '@adonisjs/core/types'
import { HttpContext, errors } from '@adonisjs/core/http'
import string from '@adonisjs/core/helpers/string'
import { Component } from './component.js'
import ComponentContext from './component_context.js'
import { DataStore, getLivewireContext, livewireContext, store } from './store.js'
import { Checksum } from './checksum.js'
import Layout from './features/support_page_components/layout.js'
import Computed from './features/support_computed/computed.js'
import { SupportLazyLoading } from './features/support_lazy_loading/support_lazy_loading.js'
import { Secret } from '@adonisjs/core/helpers'
import type { Config } from './define_config.js'
import { EventBus } from './event_bus.js'
import edge from 'edge.js'
import { Synth } from '../index.js'

const isSyntheticTuple = (data) => Array.isArray(data) && data.length === 2 && !!data[1]['s']

export default class Livewire {
  app: ApplicationService
  config: Config
  components = new Map<string, typeof Component>()
  checksum: Checksum
  static FEATURES: any[] = []
  static PROPERTY_SYNTHESIZERS: Array<typeof Synth> = []

  constructor(app: ApplicationService, config: Config) {
    this.app = app
    this.config = config
    this.checksum = new Checksum(
      this.app.config.get<Secret<string>>('app.appKey', 'appKey').release()
    )
  }

  static componentHook(feature: any) {
    this.FEATURES.push(feature)
  }

  static registerPropertySynthesizer(synth: typeof Synth | (typeof Synth)[]) {
    if (Array.isArray(synth)) {
      synth.forEach((s) => this.PROPERTY_SYNTHESIZERS.push(s))
    } else {
      this.PROPERTY_SYNTHESIZERS.push(synth)
    }
  }

  async trigger(event: string, component: Component, ...params: any[]) {
    const { context, features } = getLivewireContext()!
    const eventBus = await this.app.container.make(EventBus)

    // TODO: migrate everything to event bus
    await eventBus.trigger(event, component, ...params)

    const callbacks = await Promise.all(
      features.map(async (feature) => {
        feature.setComponent(component)
        feature.setApp(this.app)

        if (event === 'mount') {
          await feature.callBoot()
          await feature.callMount(params[0])
        } else if (event === 'hydrate') {
          await feature.callBoot()
          await feature.callHydrate(context.memo, context)
        } else if (event === 'dehydrate') {
          await feature.callDehydrate(context)
        } else if (event === 'render') {
          return await feature.callRender(...params)
        } else if (event === 'update') {
          await feature.callUpdate(params[0], params[1], params[2])
        }
      })
    )

    return callbacks
  }

  static generateComponentData(component: Component) {
    let data: Record<string, any> = {}
    let prototype = Object.getPrototypeOf(component)

    while (prototype && prototype !== Object.prototype) {
      const props = Object.getOwnPropertyNames(prototype)

      for (const prop of props) {
        if (prop.startsWith('__')) {
          continue
        }
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
      if (key.startsWith('__')) {
        continue
      }

      // if ([].includes(key)) {
      //   continue
      // }

      data[key] = component[key]
    }

    return data
  }

  async mount(name: string, params: object = {}, options: { layout?: any; key?: string } = {}) {
    let component = await this.new(name)

    let context = new ComponentContext(component, true)
    let dataStore = new DataStore(string.generateRandom(32))
    let features = Livewire.FEATURES.map((Feature) => {
      let feature = new Feature()
      feature.setComponent(component)
      feature.setApp(this.app)
      return feature
    })

    return await livewireContext.run({ dataStore, context, features }, async () => {
      if (
        options.layout &&
        (!component.__decorators || !component.__decorators.some((d) => d instanceof Layout))
      ) {
        component.addDecorator(new Layout(options.layout.name))
      }

      const ctx = HttpContext.get()

      if (ctx) {
        context.addMemo('path', ctx.request.url())
      }

      await this.trigger('mount', component, params, options.key)

      const s = store(component)

      let skipMount = s.get('skipMount') ?? false
      skipMount = Array.isArray(skipMount) ? skipMount[0] : skipMount
      //@ts-ignore
      if (!skipMount && typeof component.mount === 'function') {
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
      }

      // pickup newely added props, like ts declared props
      Livewire.setOrUpdateComponentView(component)
      ;(await this.trigger('render', component, component.view, [])) as any

      let content = (await this.render(component, '<div></div>')) || '<div></div>'
      let html = await component.view.renderRaw(content)

      await this.trigger('dehydrate', component, context)

      let snapshot = this.snapshot(component, context)

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
        'wire:snapshot': snapshot,
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

  async fromSnapshot(snapshot: any) {
    this.checksum.verify(snapshot)

    const router = await this.app.container.make('router')
    const path = snapshot['memo']['path']
    const route = router.find(path)
    const ctx = HttpContext.get()

    if (route && ctx) {
      await route.middleware.runner().run((handler, next) => {
        return typeof handler !== 'function' && !!handler.name
          ? handler.handle(ctx.containerResolver, ctx, next)
          : next()
      })

      if (ctx.response.getStatus() >= 300) {
        throw errors.E_HTTP_REQUEST_ABORTED.invoke(ctx.response.getBody(), ctx.response.getStatus())
      }
    }

    let data = snapshot['data']
    let name = snapshot['memo']['name']
    let id = snapshot['memo']['id']

    let component = await this.new(name, id)
    let context = new ComponentContext(component)

    await this.hydrateProperties(component, data, context)

    return [component, context] as const
  }

  async new(name: string, id: string | null = null) {
    let LivewireComponent: typeof Component

    if (this.components.has(name)) {
      LivewireComponent = this.components.get(name)!
    } else {
      let path = name
        .split('.')
        .map((s) => string.snakeCase(s))
        .join('/')

      LivewireComponent = await import(this.app.makeURL(`./app/livewire/${path}.js`).href)
        .then((module) => module.default)
        .catch(async (err) => {
          if (err.message.includes('Cannot find module')) {
            return await import(this.app.makeURL(`./app/livewire/${path}/index.js`).href).then(
              (module) => module.default
            )
          }

          throw err
        })
    }

    let componentId = id ?? string.generateRandom(20)

    let component = new LivewireComponent({
      ctx: HttpContext.get(),
      id: componentId,
      name,
    })

    let viewPath = name
      .split('.')
      .map((s) => string.dashCase(s))
      .join('/')

    component.setViewPath(`livewire/${viewPath}`)

    Livewire.setOrUpdateComponentView(component)

    return component
  }

  // TODO: https://github.com/edge-js/edge/pull/156
  static extractRequestViewLocals() {
    const ctx = HttpContext.get()

    if (!ctx || !ctx.view) {
      return {}
    }

    let extracted = {
      locals: {},
    }

    ctx.view.renderRawSync(`@eval(extracted.locals = state)`, {
      extracted,
    })

    return extracted.locals
  }

  static setOrUpdateComponentView(component: Component) {
    const renderer = edge.createRenderer()

    renderer.share(Livewire.extractRequestViewLocals())
    renderer.share(Livewire.generateComponentData(component))

    component.__view = renderer
  }

  protected async hydrate(data: any, context: ComponentContext, path: string) {
    if (!isSyntheticTuple(data)) {
      return data
    }

    const [value, meta] = data

    const synth = this.propertySynth(meta['s'], context, path)

    return await synth.hydrate(value, meta, async (name: string, child: any) => {
      return await this.hydrate(child, context, `${path}.${name}`)
    })
  }

  protected async hydrateProperties(
    component: Component,
    data: { [key: string]: any },
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

  async update(snapshot: any, updates: any, calls: any) {
    let dataStore = new DataStore(string.generateRandom(32))
    let [component, context] = await this.fromSnapshot(snapshot)
    let features = Livewire.FEATURES.map((Feature) => {
      let feature = new Feature()
      feature.setComponent(component)
      feature.setApp(this.app)
      return feature
    })

    return await livewireContext.run({ dataStore, context, features }, async () => {
      let data = snapshot['data']
      let memo = snapshot['memo']
      let path = snapshot['memo']['path'] ?? ''

      const ctx = HttpContext.get()
      if (ctx) {
        context.addMemo('path', path)
      }

      await this.trigger('hydrate', component, memo, context)

      await this.updateProperties(component, updates, data, context)

      await this.callMethods(component, calls, context)

      // handle declare properties, they should be set after mount
      Livewire.setOrUpdateComponentView(component)

      let html = await this.render(component)
      html = await component.view.renderRaw(html || '')

      if (html) {
        context.addEffect('html', html)
      }

      await this.trigger('dehydrate', component, context)

      let newSnapshot = this.snapshot(component, context)

      return [newSnapshot, context.effects] as const
    })
  }

  async callMethods(component: Component, calls: any, context: ComponentContext) {
    let returns: any[] = []

    for (const call of calls) {
      try {
        let method = call['method']
        let params = call['params']

        // let methods = getPublicMethods(component)
        // methods = methods.filter((m) => m !== 'render')
        // methods.push('__dispatch')
        // methods.push('__lazyLoad')
        // if (methods.includes(method) === false) {
        //   throw new Error(`Method \`${method}\` does not exist on component ${component.getName()}`)
        // }

        if (method === '__dispatch') {
          const features = getLivewireContext()!.features
          let result = await features[1].callCall('__dispatch', params)
          returns.push(result)
        } else if (method === '__lazyLoad') {
          const feature = getLivewireContext()!.features.find(
            (f) => f instanceof SupportLazyLoading
          ) as SupportLazyLoading
          let result = await feature.callCall('__lazyLoad', params)
          returns.push(result)
        } else {
          //@ts-ignore
          let result = await component[method](...params)
          returns.push(result)
        }
      } catch (error) {
        console.error(error)
        if (error.code === 'E_VALIDATION_ERROR') {
          //@ts-ignore
          HttpContext.get()?.session?.flashValidationErrors(error)
        } else {
          throw error
        }
      }
    }

    context.addEffect('returns', returns)
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

  dehydrate(target: any, context: ComponentContext, path: string) {
    if (target === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof target)) {
      return target
    }

    if (typeof target === 'object' && typeof target.constructor?.name !== 'string') {
      return target
    }

    const synth = this.propertySynth(target, context, path)

    const [data, meta] = synth.dehydrate(target, (name: string, child: any) => {
      return this.dehydrate(child, context, `${path}.${name}`)
    })

    //@ts-ignore
    meta['s'] = synth.getKey()

    return [data, meta]
  }

  dehydrateProperties(component: any, context: ComponentContext) {
    const data = {}
    for (let key in component) {
      if (key.startsWith('__')) {
        continue
      }

      if (typeof component[key] === 'function') {
        continue
      }

      data[key] = component[key]
    }

    for (let key in data) {
      data[key] = this.dehydrate(data[key], context, key)
    }

    return data

    // return JSON.parse(
    //   JSON.stringify(component, (key, value) => {
    //     if (key.startsWith('__')) return undefined

    //     return value
    //   })
    // )
  }

  snapshot(component: any, context: any = null): any {
    context = context ?? new ComponentContext(component)

    let data = this.dehydrateProperties(component, context)

    const s = store(component)

    // if (context.mounting) {
    //     if (component.listeners && Object.keys(component.listeners).length > 0) {
    //         context.addEffect('listeners', component.listeners);
    //     }
    // }

    if (s.has('dispatched')) {
      context.addEffect('dispatches', s.get('dispatched'))
    }

    let snapshot: any = {
      data: data,
      memo: {
        id: component.getId(),
        name: component.getName(),
        path: component.getName().toLowerCase(),
        method: 'GET',
        children: [],
        scripts: [],
        assets: [],
        errors: [],
        locale: 'en',
        ...context.memo,
      },
    }

    snapshot['checksum'] = this.checksum.generate(snapshot)

    return snapshot
  }

  protected async updateProperties(
    component: Component,
    updates: any,
    data: any,
    context: ComponentContext
  ) {
    const computedDecorators: Computed[] = component
      .getDecorators()
      .filter((d) => d instanceof Computed) as any

    for (const key in data) {
      if (computedDecorators.some((d) => d.name === key)) return
      if (!(key in component)) return
      if (['view'].includes(key)) return

      const child = data[key]

      if (isSyntheticTuple(child)) {
        component[key] = await this.hydrate(child, context, key)
      } else {
        component[key] = child
      }
    }

    for (const key in updates) {
      if (['view'].includes(key)) continue

      let segments = key.split('.')
      let property = segments[0]
      if (!(property in component)) return

      const child = updates[key]

      await this.trigger('update', component, key, key, child)

      if (typeof component['updating'] === 'function') {
        await component['updating'](property, child)
      }

      let updatingPropMethod = `updating${string.titleCase(property)}`

      if (typeof component[updatingPropMethod] === 'function') {
        await component[updatingPropMethod](child)
      }

      if (segments.length > 1) {
        let current = component[property]

        for (let i = 1; i < segments.length; i++) {
          let segment = segments[i]

          if (i === segments.length - 1) {
            current[segment] = child
          } else {
            current = current[segment]
          }
        }
      } else {
        component[property] = child
      }

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

    let ctx = HttpContext.get()
    let session: any = ctx?.['session']

    if (session) {
      await session.commit()

      if (session.has(session.flashKey)) {
        session.flashMessages.update(session.pull(session.flashKey, null))
      }

      component.view.share({
        flashMessages: session.flashMessages,
        old: function (key: string, defaultVal?: any) {
          return session.flashMessages.get(key, defaultVal)
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

    if (session) {
      session.responseFlashMessages.clear()
      session.flashMessages.clear()
    }

    return html
  }

  component(name: string, component: typeof Component) {
    return this.components.set(name, component)
  }

  insertAttributesIntoHtmlRoot(html: string, attributes: { [key: string]: string }): string {
    const attributesFormattedForHtmlElement = stringifyHtmlAttributes(attributes)

    const regex = /(?:\n\s*|^\s*)<([a-zA-Z0-9\-]+)/
    const matches = html.match(regex)

    if (!matches || matches.length === 0) {
      throw new Error('Could not find HTML tag in HTML string.')
    }

    const tagName = matches[1]
    const lengthOfTagName = tagName.length
    const positionOfFirstCharacterInTagName = html.indexOf(tagName)

    return (
      html.substring(0, positionOfFirstCharacterInTagName + lengthOfTagName) +
      ' ' +
      attributesFormattedForHtmlElement +
      html.substring(positionOfFirstCharacterInTagName + lengthOfTagName)
    )
  }
}

function stringifyHtmlAttributes(attributes: { [key: string]: any }): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeStringForHtml(value)}"`)
    .join(' ')
}

function escapeStringForHtml(subject: any): string {
  if (typeof subject === 'string' || typeof subject === 'number') {
    return htmlspecialchars(subject as any)
  }

  return htmlspecialchars(JSON.stringify(subject))
}

function htmlspecialchars(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }

  return text.replace(/[&<>"']/g, (m) => map[m])
}

// function getPublicMethods(obj: any) {
//   const proto = Object.getPrototypeOf(obj)
//   return Object.getOwnPropertyNames(proto).filter(
//     (prop) => typeof proto[prop] === 'function' && prop !== 'constructor'
//   )
// }
