export class CannotUpdateLockedPropertyException extends Error {
  constructor(name: string) {
    super(`Cannot update locked property: [${name}]`)
  }
}
