import ComponentHook from '../../ComponentHook.js'
import { store } from '../../store.js'

export class SupportEvents extends ComponentHook {
  async call(method: string, params: any[], _returnEarly: boolean) {
    if (method === '__dispatch') {
      let [name, args] = params
      let ev = store(this.component)
        .get('listeners')
        .find((l) => l.name === name)

      if (ev) {
        await this.component[ev.event](args)
      }

      let ev2 = this.component.getListeners()[name]

      if (!ev2) return

      await this[ev2](args)
    }
  }

  async dehydrate(context) {
    const s = store(this.component)

    if (context.mounting) {
      const listeners = [
        ...new Set([
          ...Object.keys(this.component.getListeners()),
          ...s.get('listeners').map((l) => l.name),
        ]),
      ]

      if (listeners.length > 0) {
        context.addEffect('listeners', listeners)
      }
    }

    if (!s.has('dispatched')) return

    context.addEffect('dispatched', store(this.component).get('dispatched'))
  }
}
