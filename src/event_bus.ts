export class EventBus {
  private listeners: { [key: string]: Function[] } = {}
  private listenersAfter: { [key: string]: Function[] } = {}
  private listenersBefore: { [key: string]: Function[] } = {}

  on(name: string, callback: Function): () => void {
    if (!this.listeners[name]) this.listeners[name] = []
    this.listeners[name].push(callback)

    return () => this.off(name, callback)
  }

  before(name: string, callback: Function): () => void {
    if (!this.listenersBefore[name]) this.listenersBefore[name] = []
    this.listenersBefore[name].push(callback)

    return () => this.off(name, callback)
  }

  after(name: string, callback: Function): () => void {
    if (!this.listenersAfter[name]) this.listenersAfter[name] = []
    this.listenersAfter[name].push(callback)

    return () => this.off(name, callback)
  }

  off(name: string, callback: Function): void {
    let index = this.listeners[name]?.indexOf(callback)
    let indexAfter = this.listenersAfter[name]?.indexOf(callback)
    let indexBefore = this.listenersBefore[name]?.indexOf(callback)

    if (index !== undefined && index > -1) this.listeners[name].splice(index, 1)
    else if (indexAfter !== undefined && indexAfter > -1)
      this.listenersAfter[name].splice(indexAfter, 1)
    else if (indexBefore !== undefined && indexBefore > -1)
      this.listenersBefore[name].splice(indexBefore, 1)
  }

  async trigger(name: string, ...params: any[]): Promise<Function> {
    const middlewares: Function[] = []

    const listeners = [
      ...(this.listenersBefore[name] ?? []),
      ...(this.listeners[name] ?? []),
      ...(this.listenersAfter[name] ?? []),
    ]

    for (const callback of listeners) {
      const result = await callback(...params)
      if (result) {
        middlewares.push(result)
      }
    }

    return async (forward: any = null, ...extras: any[]): Promise<any> => {
      for (const finisher of middlewares) {
        if (!finisher) continue

        const finalCallback = Array.isArray(finisher) ? finisher[finisher.length - 1] : finisher

        const result = await finalCallback(forward, ...extras)

        forward = result ?? forward
      }

      return forward
    }
  }
}
