import type { Infer, ConstructableSchema } from '@vinejs/vine/types'

/**
 * Opaque type for validated properties
 */
export type HasValidate<T> = T & {
  readonly __opaque_type?: 'hasValidate'
  readonly __validated_type?: T
}

/**
 * Check if a type is any
 */
type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Check if a type has the HasValidate marker properties
 * This checks if BOTH __opaque_type AND __validated_type are present in the type
 * AND that the type is not 'any' or other invalid types
 */
/**
 * Check if a type is exactly the markers we added (not inherited from base types)
 * This is more strict - checks if __validated_type actually holds the validated type
 */
type IsHasValidate<T> =
  IsAny<T> extends true
    ? false
    : T extends (...args: any[]) => any
      ? false
      : '__opaque_type' extends keyof T
        ? '__validated_type' extends keyof T
          ? T extends HasValidate<infer U>
            ? U extends string | number | boolean | Date | Array<any> | null | undefined
              ? true // Only allow primitives and simple types
              : false
            : false
          : false
        : false

/**
 * Extract properties that have HasValidate type
 */
export type ExtractValidatedProperties<Component> = {
  [Key in keyof Component]: IsHasValidate<Component[Key]> extends true ? Key : never
}[keyof Component]

/**
 * Extract the validated type from a HasValidate property
 */
export type GetValidatedType<Property extends HasValidate<any>> =
  Property extends HasValidate<infer T> ? T : never

/**
 * Build a type object with validated properties and their types
 * This is used as the return type for validate() method
 */
export type ValidatedProperties<Component> = {
  [Key in ExtractValidatedProperties<Component>]: Component[Key] extends HasValidate<infer T>
    ? T
    : never
}

/**
 * Infer validation return type from component
 * Prioritizes rules() method return type, falls back to ValidatedProperties
 */
export type InferValidationReturnType<Component> = Component extends {
  rules(): infer TSchema
}
  ? TSchema extends ConstructableSchema<any, any, any>
    ? Infer<TSchema>
    : ValidatedProperties<Component>
  : ValidatedProperties<Component>
