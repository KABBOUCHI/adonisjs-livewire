import type { Edge } from 'edge.js'

export abstract class EdgeComponent {
  declare view: Edge

  abstract render(): Promise<string>
}
