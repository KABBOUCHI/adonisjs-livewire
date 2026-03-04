/** PHP parity: CannotCallComputedDirectlyException */
export class CannotCallComputedDirectlyException extends Error {
  constructor(componentName: string, methodName: string) {
    super(
      `Cannot call [${methodName}()] computed property method directly on component: ${componentName}`
    )
    this.name = 'CannotCallComputedDirectlyException'
  }
}
