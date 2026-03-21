import { createHmac } from 'node:crypto'
import debug from './debug.js'

class CorruptComponentPayloadException extends Error {
  constructor() {
    super(`Livewire encountered corrupt data when trying to hydrate a component.
Ensure that the [name, id, data] of the Livewire component wasn't tampered with between requests.`)
    this.name = 'CorruptComponentPayloadException'
  }
}

export class Checksum {
  constructor(private key: string) {
    debug(
      'Checksum initialized with key length: %d, key preview: %s',
      key.length,
      key.substring(0, 10) + '...'
    )
  }

  verify(snapshot: any) {
    let checksum = snapshot['checksum']

    delete snapshot['checksum']

    const generated = this.generate(snapshot)
    debug(
      'Checksum verify: received=%s, generated=%s, match=%s',
      checksum,
      generated,
      checksum === generated
    )

    if (checksum !== generated) {
      debug('Checksum MISMATCH - snapshot JSON: %s', JSON.stringify(snapshot))
      throw new CorruptComponentPayloadException()
    }
  }

  generate(snapshot: any) {
    const json = JSON.stringify(snapshot)
    const result = createHmac('sha256', this.key).update(json).digest('hex')
    debug('Checksum generate: json length=%d, result=%s, json=%s', json.length, result, json)
    return result
  }
}
