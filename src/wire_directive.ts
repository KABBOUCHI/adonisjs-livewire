/**
 * Represents a wire: directive parsed from Blade/Edge templates
 * Equivalent to PHP's WireDirective class
 *
 * @example
 * ```typescript
 * // For a directive like wire:model.live="name"
 * const directive = new WireDirective('model', 'wire:model.live', 'name')
 * directive.name()       // 'model'
 * directive.value()      // 'name'
 * directive.modifiers()  // ['live']
 * directive.hasModifier('live') // true
 * ```
 */
export class WireDirective {
  constructor(
    /**
     * The directive name (e.g., 'model', 'click', 'submit')
     */
    readonly _name: string,
    /**
     * The full directive string (e.g., 'wire:model.live', 'wire:click.prevent')
     */
    readonly _directive: string,
    /**
     * The directive value (e.g., 'name', 'save', 'handleSubmit')
     */
    readonly _value: string
  ) {}

  /**
   * Get the directive name
   *
   * @example
   * // wire:model.live="name" -> 'model'
   */
  name(): string {
    return this._name
  }

  /**
   * Get the full directive string
   *
   * @example
   * // wire:model.live="name" -> 'wire:model.live'
   */
  directive(): string {
    return this._directive
  }

  /**
   * Get the directive value
   *
   * @example
   * // wire:model.live="name" -> 'name'
   */
  value(): string {
    return this._value
  }

  /**
   * Get all modifiers applied to the directive
   *
   * @example
   * // wire:model.live.debounce.500ms -> ['live', 'debounce', '500ms']
   * // wire:click.prevent.stop -> ['prevent', 'stop']
   */
  modifiers(): string[] {
    // Remove the base directive (wire:name) and split by dots
    const withoutBase = this._directive.replace(`wire:${this._name}`, '')

    return withoutBase.split('.').filter((mod) => mod.length > 0)
  }

  /**
   * Check if the directive has a specific modifier
   *
   * @param modifier - The modifier to check for
   *
   * @example
   * // wire:model.live.debounce="name"
   * directive.hasModifier('live')     // true
   * directive.hasModifier('debounce') // true
   * directive.hasModifier('blur')     // false
   */
  hasModifier(modifier: string): boolean {
    return this.modifiers().includes(modifier)
  }

  /**
   * Convert to HTML attribute string
   *
   * @example
   * // wire:model.live="name" -> ' wire:model.live="name"'
   */
  toHtml(): string {
    const escapedValue = this.escapeHtml(this._value)
    return ` ${this._directive}="${escapedValue}"`
  }

  /**
   * Convert to string (returns the value)
   */
  toString(): string {
    return this._value
  }

  /**
   * Escape HTML special characters in a string
   */
  private escapeHtml(str: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return str.replace(/[&<>"']/g, (char) => map[char])
  }

  /**
   * Create a WireDirective from an attribute string
   *
   * @param attributeName - The full attribute name (e.g., 'wire:model.live')
   * @param value - The attribute value
   *
   * @example
   * const directive = WireDirective.fromAttribute('wire:model.live', 'name')
   */
  static fromAttribute(attributeName: string, value: string): WireDirective | null {
    if (!attributeName.startsWith('wire:')) {
      return null
    }

    // Extract the name (first part after wire:, before any dots)
    const withoutPrefix = attributeName.slice(5) // Remove 'wire:'
    const name = withoutPrefix.split('.')[0]

    return new WireDirective(name, attributeName, value)
  }

  /**
   * Parse all wire directives from an attributes object
   *
   * @param attributes - Object containing HTML attributes
   *
   * @example
   * const directives = WireDirective.parseAll({
   *   'wire:model.live': 'name',
   *   'wire:click': 'save',
   *   'class': 'btn'
   * })
   * // Returns [WireDirective(model), WireDirective(click)]
   */
  static parseAll(attributes: Record<string, string>): WireDirective[] {
    const directives: WireDirective[] = []

    for (const [key, value] of Object.entries(attributes)) {
      const directive = WireDirective.fromAttribute(key, value)
      if (directive) {
        directives.push(directive)
      }
    }

    return directives
  }
}
