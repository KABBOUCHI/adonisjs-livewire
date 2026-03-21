/**
 * Check if data is a synthetic tuple
 *
 * Synthetic tuples are arrays with two elements where the second element
 * contains a 's' property, indicating it's a synthesized/dehydrated value
 * that needs special handling during hydration/dehydration.
 *
 * @param data - The data to check
 * @returns True if data is a synthetic tuple, false otherwise
 *
 * @example
 * ```ts
 * isSyntheticTuple([value, { s: 'model' }])
 * // Returns: true
 *
 * isSyntheticTuple([value, { other: 'prop' }])
 * // Returns: false
 * ```
 */
export function isSyntheticTuple(data: any): boolean {
  return Array.isArray(data) && data.length === 2 && data[1]?.['s'] !== undefined
}
