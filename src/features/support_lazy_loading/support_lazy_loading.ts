import ComponentHook from '../../component_hook.js'
import { getLivewireContext, store } from '../../store.js'
import Lazy from './lazy.js'
import Defer from './defer.js'
import { base64 } from '../../utils/encoding.js'

export class SupportLazyLoading extends ComponentHook {
  static disableWhileTesting = false

  static disableForTesting() {
    SupportLazyLoading.disableWhileTesting = true
  }

  async mount(params) {
    const args = params ?? {}

    let shouldBeLazy = false
    let isDeferred = false
    let isolate = true

    // Check for lazy param variations
    if (args['lazy'] && args['lazy'] !== false) shouldBeLazy = true
    if (args['lazy.bundle']) shouldBeLazy = true
    if (args['defer']) shouldBeLazy = true
    if (args['defer.bundle']) shouldBeLazy = true

    // Check for deferred mode
    if (args['lazy'] === 'on-load') isDeferred = true
    if (args['lazy.bundle'] === 'on-load') isDeferred = true
    if (args['defer']) isDeferred = true
    if (args['defer.bundle']) isDeferred = true

    // Check for bundle mode (non-isolated)
    if (args['lazy.bundle']) isolate = false
    if (args['defer.bundle']) isolate = false

    // Check for decorators
    const lazyDecorator = this.component
      .getDecorators()
      .find((decorator) => decorator instanceof Lazy) as Lazy | undefined

    const deferDecorator = this.component
      .getDecorators()
      .find((decorator) => decorator instanceof Defer) as Defer | undefined

    // Apply decorators only if the corresponding param is not explicitly false
    const lazyDisabled = args.hasOwnProperty('lazy') && args['lazy'] === false
    const deferDisabled = args.hasOwnProperty('defer') && args['defer'] === false

    if (lazyDecorator && !lazyDisabled) shouldBeLazy = true
    if (deferDecorator && !deferDisabled) {
      shouldBeLazy = true
      isDeferred = true
    }

    // If disabled during testing, return early
    if (SupportLazyLoading.disableWhileTesting) return

    // If no lazy loading is included at all, return
    if (!shouldBeLazy) return

    // Apply decorator settings for isolate/bundle
    if (lazyDecorator) {
      if (lazyDecorator.bundle !== undefined) isolate = !lazyDecorator.bundle
      if (lazyDecorator.isolate !== undefined) isolate = lazyDecorator.isolate
    }

    if (deferDecorator) {
      if (deferDecorator.bundle !== undefined) isolate = !deferDecorator.bundle
      if (deferDecorator.isolate !== undefined) isolate = deferDecorator.isolate
    }

    this.component.skipMount()

    store(this.component).set('isLazyLoadMounting', true)
    store(this.component).set('isLazyIsolated', isolate)
    store(this.component).set('isDeferred', isDeferred)

    this.component.skipRender(await this.generatePlaceholderHtml(params, isDeferred))
  }

  async hydrate(memo) {
    // Check if lazyLoaded is not set in memo
    if (!('lazyLoaded' in memo)) return
    if (memo['lazyLoaded'] === true) return

    this.component.skipHydrate()

    store(this.component).set('isLazyLoadHydrating', true)
  }

  async dehydrate(context) {
    if (store(this.component).get('isLazyLoadMounting') === true) {
      context.addMemo('lazyLoaded', false)
      context.addMemo('lazyIsolated', store(this.component).get('isLazyIsolated'))
    } else if (store(this.component).get('isLazyLoadHydrating') === true) {
      context.addMemo('lazyLoaded', true)
    }
  }

  async generatePlaceholderHtml(params, isDeferred = false) {
    const Livewire = await this.app.container.make('livewire')
    let { context } = getLivewireContext()!
    let placeholder = await this.getPlaceholderHtml(params)

    // Filter out lazy/defer params from mount params
    const mountParams = this.filterLazyParams(params)
    context.addMemo('__for_mount', mountParams)

    const snapshot = await Livewire.snapshot(this.component, context)
    const encoded = base64.encode(JSON.stringify(snapshot))

    // Use x-init for deferred loading, x-intersect for lazy loading
    const directive = isDeferred ? 'x-init' : 'x-intersect'

    return Livewire.insertAttributesIntoHtmlRoot(placeholder, {
      [directive]: `$wire.__lazyLoad('${encoded}')`,
    })
  }

  filterLazyParams(params) {
    const filtered = { ...params }
    delete filtered['lazy']
    delete filtered['lazy.bundle']
    delete filtered['defer']
    delete filtered['defer.bundle']
    return filtered
  }

  async getPlaceholderHtml(params) {
    // 1. Check if component has a placeholder() method
    if (this.component['placeholder']) {
      return await this.component.view.renderRaw(await this.component['placeholder'](params))
    }

    // 2. Check for global componentPlaceholder config
    const componentPlaceholder = this.app.config.get<string | null>('livewire.componentPlaceholder')
    if (componentPlaceholder) {
      return await this.component.view.render(componentPlaceholder, params)
    }

    // 3. Fallback to empty div
    return '<div></div>'
  }

  async call(method, params, returnEarly) {
    if (method !== '__lazyLoad') return

    const [encoded] = params
    const mountParams = this.resurrectMountParams(encoded)

    await this.callMountLifecycleMethod(mountParams)

    returnEarly()
  }

  resurrectMountParams(encoded: string) {
    const snapshot = JSON.parse(base64.decode(encoded))
    return snapshot.memo?.__for_mount ?? {}
  }

  async callMountLifecycleMethod(params) {
    const component = this.component

    if (typeof component['mount'] === 'function') {
      const resolvedParams = [params]

      const isResourceModel = (value: any) => {
        if (!value) return false
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

      // @ts-ignore
      await component.mount(...resolvedParams)
    } else {
      // If no mount method, assign params directly to properties
      for (const paramKey in params) {
        if (paramKey in component) {
          component[paramKey] = params[paramKey]
        }
      }
    }
  }
}
