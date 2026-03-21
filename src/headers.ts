/**
 * List of possible headers used by Livewire for client-server communication.
 * These headers control various aspects of Livewire requests and responses,
 * enabling features like streaming, navigation, and request identification.
 *
 * @example
 * ```typescript
 * // Check if request is a Livewire request
 * const isLivewireRequest = request.header(LivewireHeaders.Livewire) === '1'
 *
 * // Check if response is a stream
 * if (response.header(LivewireHeaders.Stream)) {
 *   // Handle streaming response
 * }
 *
 * // Set navigate header for navigation requests
 * request.header(LivewireHeaders.Navigate, '1')
 * ```
 */
export const LivewireHeaders = {
  /**
   * Header to identify Livewire.js requests.
   * Set to '1' by Livewire.js client to indicate a Livewire request.
   * The '1' value means nothing, but it stops Cloudflare from stripping the header.
   */
  Livewire: 'x-livewire',

  /**
   * Header to identify Livewire streaming responses.
   * Used when the server is sending a stream response (e.g., wire:stream).
   */
  Stream: 'x-livewire-stream',

  /**
   * Header to identify Livewire navigation requests.
   * Set to '1' by Livewire.js client for navigation requests.
   * The '1' value means nothing, but it stops Cloudflare from stripping the header.
   */
  Navigate: 'x-livewire-navigate',
} as const
