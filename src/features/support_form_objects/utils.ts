/**
 * Utility functions for Form Objects
 * PHP parity: Helper functions from SupportFormObjects
 */

/**
 * Get the portion of a string before the first dot
 * PHP parity: Str::before($key, '.')
 *
 * @example
 * beforeFirstDot('form.name') // 'form'
 * beforeFirstDot('name') // 'name'
 */
export function beforeFirstDot(key: string): string {
  const dotIndex = key.indexOf('.')
  return dotIndex === -1 ? key : key.slice(0, dotIndex)
}

/**
 * Get the portion of a string after the first dot
 * PHP parity: Str::after($key, '.')
 *
 * @example
 * afterFirstDot('form.name') // 'name'
 * afterFirstDot('form.address.city') // 'address.city'
 * afterFirstDot('name') // ''
 */
export function afterFirstDot(key: string): string {
  const dotIndex = key.indexOf('.')
  return dotIndex === -1 ? '' : key.slice(dotIndex + 1)
}

/**
 * Get a value from an object using dot notation
 * PHP parity: data_get($target, $key)
 *
 * @example
 * dataGet({ form: { name: 'John' } }, 'form.name') // 'John'
 */
export function dataGet(target: any, key: string): any {
  if (!key) return target

  const keys = key.split('.')
  let current = target

  for (const k of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[k]
  }

  return current
}

/**
 * Set a value on an object using dot notation
 * PHP parity: data_set($target, $key, $value)
 *
 * @example
 * const obj = { form: { name: 'John' } }
 * dataSet(obj, 'form.name', 'Jane')
 * // obj.form.name === 'Jane'
 */
export function dataSet(target: any, key: string, value: any): void {
  if (!key) return

  const keys = key.split('.')
  let current = target

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (current[k] === null || current[k] === undefined) {
      current[k] = {}
    }
    current = current[k]
  }

  current[keys[keys.length - 1]] = value
}

/**
 * Convert the first character of a string to uppercase
 * PHP parity: ucfirst()
 */
export function ucfirst(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && value.constructor === Object
}
