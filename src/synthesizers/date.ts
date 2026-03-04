import { Synth } from './synth.js'

/**
 * DateSynth - Synthesizer for JavaScript Date objects
 * PHP parity: CarbonSynth (handles Carbon/DateTime in PHP)
 *
 * Serializes Date objects to ISO string format and hydrates them back to Date instances.
 */
export class DateSynth extends Synth {
  static key = 'date'

  /**
   * Match Date instances
   */
  static match(target: any): boolean {
    return target instanceof Date
  }

  /**
   * Dehydrate a Date object to an ISO string
   * PHP parity: CarbonSynth->dehydrate returns ['2024-01-01T00:00:00.000Z', {}]
   */
  async dehydrate(target: Date, _dehydrateChild: any): Promise<[string, Record<string, any>]> {
    return [target.toISOString(), {}]
  }

  /**
   * Hydrate an ISO string back to a Date object
   * PHP parity: CarbonSynth->hydrate creates Carbon instance from string
   */
  async hydrate(value: string, _meta: Record<string, any>, _hydrateChild: any): Promise<Date> {
    return new Date(value)
  }
}
