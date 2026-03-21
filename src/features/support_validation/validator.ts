import { Decorator } from '../support_decorators/decorator.js'
import type { ConstructableSchema } from '@vinejs/vine/types'

/**
 * Validator decorator for properties
 *
 * Stores a schema factory function that will be called when building
 * the validation schema from decorators.
 */
export default class Validator extends Decorator {
  constructor(
    public propertyName: string,
    public schemaFactory: () => ConstructableSchema<any, any, any>,
    public onUpdate: boolean = true
  ) {
    super()
  }

  async mount() {
    // Register this property for validation
    // The schemaFactory will be called when building the schema
  }
}
