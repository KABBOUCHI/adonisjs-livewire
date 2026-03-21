/**
 * Base64 encoding/decoding utilities
 * Compatible with both Node.js and browser environments
 */
export const base64 = {
  /**
   * Encode a string to base64
   */
  encode(str: string): string {
    if (typeof Buffer !== 'undefined') {
      // Node.js environment
      return Buffer.from(str, 'utf-8').toString('base64')
    }
    // Browser environment
    return btoa(unescape(encodeURIComponent(str)))
  },

  /**
   * Decode a base64 string
   */
  decode(str: string): string {
    if (typeof Buffer !== 'undefined') {
      // Node.js environment
      return Buffer.from(str, 'base64').toString('utf-8')
    }
    // Browser environment
    return decodeURIComponent(escape(atob(str)))
  },
}
