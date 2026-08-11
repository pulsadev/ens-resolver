import { keccak256Bytes } from '../utils/keccak.js'
import { bytesToHex } from '../utils/keccak.js'

export function namehash(name: string): string {
  let node: Uint8Array = new Uint8Array(32)

  if (name === '') return '0x' + bytesToHex(node)

  const labels = name.split('.')
  for (let i = labels.length - 1; i >= 0; i--) {
    const label = labels[i]!
    const labelHash: Uint8Array = keccak256Bytes(new TextEncoder().encode(label))
    const combined = new Uint8Array(64)
    combined.set(node, 0)
    combined.set(labelHash, 32)
    node = new Uint8Array(keccak256Bytes(combined))
  }

  return '0x' + bytesToHex(node)
}

export function labelhash(label: string): string {
  return '0x' + bytesToHex(keccak256Bytes(new TextEncoder().encode(label)))
}

export function dnsEncode(name: string): string {
  if (name === '') return '0x00'

  const labels = name.split('.')
  let result = ''

  for (const label of labels) {
    const encoded = new TextEncoder().encode(label)
    result += encoded.length.toString(16).padStart(2, '0')
    for (const byte of encoded) {
      result += byte.toString(16).padStart(2, '0')
    }
  }

  result += '00'
  return '0x' + result
}

export { ensNormalize as normalize } from '../utils/normalize.js'
