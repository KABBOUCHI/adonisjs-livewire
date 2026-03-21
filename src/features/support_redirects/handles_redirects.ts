/// <reference types="@adonisjs/session/session_middleware" />

import { BaseComponent } from '../../base_component.js'
import { Config } from '../../define_config.js'
import { store } from '../../store.js'
import { Constructor } from '../../types.js'

/** PHP parity: set (last wins), skipRender by default, redirectRoute/redirectIntended/redirectAction when router/session available */
export function HandlesRedirects<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    redirect(url: string, navigate: boolean = false) {
      store(this).set('redirect', url)

      if (navigate) store(this).set('redirectUsingNavigate', true)

      const livewireConfig = this.app.config.get<Config>('livewire', {})

      !livewireConfig.renderOnRedirect && this.skipRender()
    }

    redirectRoute(name: string, params?: Record<string, any>, navigate: boolean = false) {
      const router = this.__getRouter()
      if (!router.commited) router.commit()

      const url = router.makeUrl(name, params)

      this.redirect(url, navigate)
    }

    redirectIntended(defaultUrl: string = '/', navigate: boolean = false) {
      let url = defaultUrl

      if (this.ctx?.session) url = this.ctx.session.pull('url.intended', defaultUrl)

      this.redirect(url, navigate)
    }
  }
}
