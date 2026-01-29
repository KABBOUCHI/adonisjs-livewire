import { isSyntheticTuple } from '../../livewire.ts'

interface Snapshot {
  data: Record<string, unknown>
  [key: string]: unknown
}

interface Effects {
  [key: string]: unknown
}

export class ComponentState {
  protected component: unknown
  protected response: unknown
  protected view: unknown
  protected html: string
  protected snapshot: Snapshot
  protected effects: Effects

  constructor(
    component: unknown,
    response: unknown,
    view: unknown,
    html: string,
    snapshot: Snapshot,
    effects: Effects
  ) {
    this.component = component
    this.response = response
    this.view = view
    this.html = html
    this.snapshot = snapshot
    this.effects = effects
  }

  getComponent(): unknown {
    return this.component
  }

  getSnapshot(): Snapshot {
    return this.snapshot
  }

  getSnapshotData(): Record<string, unknown> {
    return this.untupleify(this.snapshot.data) as Record<string, unknown>
  }

  getEffects(): Effects {
    return this.effects
  }

  getView(): unknown {
    return this.view
  }

  getResponse(): unknown {
    return this.response
  }

  untupleify(payload: unknown): unknown {
    let value = isSyntheticTuple(payload) ? (payload as unknown[])[0] : payload

    if (Array.isArray(value)) {
      value = value.map((child) => this.untupleify(child))
    } else if (value !== null && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      for (const key of Object.keys(obj)) {
        obj[key] = this.untupleify(obj[key])
      }
      value = obj
    }

    return value
  }

  getHtml(stripInitialData: boolean = false): string {
    let html = this.html

    if (stripInitialData) {
      const snapshotMatch = html.match(/wire:snapshot="([^"]*)"/)
      if (snapshotMatch && snapshotMatch[1]) {
        html = html.replace(snapshotMatch[1], '')
      }

      const effectsMatch = html.match(/wire:effects="([^"]*)"/)
      if (effectsMatch && effectsMatch[1]) {
        html = html.replace(effectsMatch[1], '')
      }
    }

    return html
  }
}
