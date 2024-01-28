import CryptoJS from 'crypto-js'

class CorruptComponentPayloadException extends Error {
  constructor() {
    super(`Livewire encountered corrupt data when trying to hydrate a component.
Ensure that the [name, id, data] of the Livewire component wasn't tampered with between requests.`)
    this.name = 'CorruptComponentPayloadException'
  }
}

export class Checksum {
  constructor(private key: string) {}

  verify(snapshot: any) {
    let checksum = snapshot['checksum']

    delete snapshot['checksum']

    if (checksum !== this.generate(snapshot)) {
      throw new CorruptComponentPayloadException()
    }
  }

  generate(snapshot: any) {
    return CryptoJS.HmacSHA256(JSON.stringify(snapshot), this.key).toString()
  }
}
