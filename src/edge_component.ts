import type { Edge } from 'edge.js'

interface ComponentProps {
  all(): Record<string, any>
  has(key: string): boolean
  get(key: string, defaultValue?: any): any
  only(keys: string[]): ComponentProps
  except(keys: string[]): ComponentProps
  merge(values: Record<string, any>): ComponentProps
  mergeIf(conditional: any, values: Record<string, any>): ComponentProps
  mergeUnless(conditional: any, values: Record<string, any>): ComponentProps
  toAttrs(): string
}

export abstract class EdgeComponent {
  declare view: Edge
  declare $props: ComponentProps
  declare $slots: { [key: string]: any }
  declare $caller: { filename: string; line: number; col: number }

  abstract render(): Promise<string>
}
