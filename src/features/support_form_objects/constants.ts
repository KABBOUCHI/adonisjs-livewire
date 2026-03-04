/**
 * Registry for form class constructors
 * Maps form class names to their constructors for hydration
 */
export const FORM_CLASS_REGISTRY: Map<string, new () => any> = new Map()

/**
 * Register a form class for hydration
 * @param name - Class name
 * @param constructor - Form class constructor
 */
export function registerFormClass(name: string, constructor: new () => any): void {
  FORM_CLASS_REGISTRY.set(name, constructor)
}

/**
 * Get a form class constructor by name
 * @param name - Class name
 * @returns Form class constructor or undefined
 */
export function getFormClass(name: string): (new () => any) | undefined {
  return FORM_CLASS_REGISTRY.get(name)
}

/**
 * Reserved method names that should not be treated as form properties
 */
export const FORM_METHODS = new Set([
  'validate',
  'validateOnly',
  'addError',
  'resetErrorBag',
  'getErrorBag',
  'setErrorBag',
  'hasError',
  'getError',
  'all',
  'only',
  'except',
  'fill',
  'reset',
  'resetExcept',
  'pull',
  'toArray',
  'hasProperty',
  'getPropertyValue',
  'setPropertyValue',
  'rules',
  'messages',
  'attributes',
  'boot',
  'mount',
  'dehydrate',
  'hydrate',
  'updating',
  'updated',
])
