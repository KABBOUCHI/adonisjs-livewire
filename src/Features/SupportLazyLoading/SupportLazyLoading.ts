import ComponentHook from '../../ComponentHook.js'
import { getLivewireContext, store } from '../../store.js'
import Lazy from './Lazy.js'

export class SupportLazyLoading extends ComponentHook {
  async mount(params) {
    const args = params ?? {}
    let hasLazyParam = args.hasOwnProperty('lazy')
    let lazyProperty = args.lazy ?? false
    let isolate = false

    const lazyDecorator = this.component
      .getDecorators()
      .find((decorator) => decorator instanceof Lazy) as Lazy | undefined

    if (hasLazyParam && !lazyProperty) return

    if (!hasLazyParam && !lazyDecorator) return

    if (lazyDecorator) {
      isolate = lazyDecorator.isolate
    }

    this.component.skipMount()

    store(this.component).set('isLazyLoadMounting', true)
    store(this.component).set('isLazyIsolated', isolate)

    this.component.skipRender(await this.generatePlaceholderHtml(params))
  }

  async hydrate(memo) {
    if (memo['lazyLoaded']) return
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

  async generatePlaceholderHtml(params) {
    const Livewire = await this.app.container.make('livewire')
    let { context } = getLivewireContext()!
    let placeholder = await this.getPlaceholderHtml()

    context.addMemo('__for_mount', params)

    let encoded = JSON.stringify(await Livewire.snapshot(this.component, context))

    return Livewire.insertAttributesIntoHtmlRoot(placeholder, {
      'x-intersect': `$wire.__lazyLoad('${encoded}')`,
    })
  }

  async getPlaceholderHtml() {
    if (!this.component['placeholder']) {
      return '<div></div>'
    }

    return await this.component.view.renderRaw(await this.component['placeholder']())
  }

  async call(method, params, _returnEarly) {
    if (method !== '__lazyLoad') return

    // const { Livewire } = await this.app.container.resolveBinding('Adonis/Addons/Livewire')
    let data = JSON.parse(params[0])

    if (data.memo.__for_mount) {
      // TODO: move this to a separate hook
      let component = this.component
      if (typeof component['mount'] === 'function') {
        const resolvedParams = [data.memo.__for_mount]

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
              resolvedParams.push(
                await binding.type.findOrFail(data.memo.__for_mount[binding.name])
              )
            } else {
              resolvedParams.push(data.memo.__for_mount[binding.name])
            }
          }
        }

        //@ts-ignore
        await component.mount(...resolvedParams)
      }

      delete data.memo.for_mount
    }
  }
}
