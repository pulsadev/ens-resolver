import { describe, it, expect } from 'vitest'
import { encodeBytes32, decodeAddress, decodeString, decodeBytes, isZeroAddress } from '../src/utils/rpc.js'

describe('encodeBytes32', () => {
  it('pads short hex to 64 chars', () => {
    expect(encodeBytes32('ff')).toBe('00000000000000000000000000000000000000000000000000000000000000ff')
  })

  it('handles 0x prefix', () => {
    expect(encodeBytes32('0xff')).toBe('00000000000000000000000000000000000000000000000000000000000000ff')
  })

  it('handles full 32-byte value', () => {
    const full = 'ee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a53475835'
    expect(encodeBytes32(full)).toBe(full)
  })
})

describe('decodeAddress', () => {
  it('extracts address from 32-byte word', () => {
    const hex = '000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045'
    expect(decodeAddress(hex)).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
  })

  it('handles 0x prefix', () => {
    expect(decodeAddress('0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045'))
      .toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
  })
})

describe('decodeString', () => {
  it('decodes ABI-encoded string', () => {
    const hex = '0x' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      '000000000000000000000000000000000000000000000000000000000000000b' +
      '7669746172696b2e657468000000000000000000000000000000000000000000'
    expect(decodeString(hex)).toBe('vitarik.eth')
  })

  it('decodes empty string', () => {
    const hex = '0x' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000000'
    expect(decodeString(hex)).toBe('')
  })

  it('returns null for short hex', () => {
    expect(decodeString('0x')).toBeNull()
    expect(decodeString('')).toBeNull()
    expect(decodeString('0x00')).toBeNull()
  })
})

describe('decodeBytes', () => {
  it('decodes ABI-encoded bytes', () => {
    const hex = '0x' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000004' +
      'deadbeef00000000000000000000000000000000000000000000000000000000'
    expect(decodeBytes(hex)).toBe('0xdeadbeef')
  })

  it('returns null for all zeros', () => {
    expect(decodeBytes('0x' + '0'.repeat(64))).toBeNull()
  })

  it('returns null for empty', () => {
    expect(decodeBytes('0x')).toBeNull()
  })
})

describe('isZeroAddress', () => {
  it('detects zero address', () => {
    expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true)
  })

  it('rejects non-zero address', () => {
    expect(isZeroAddress('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')).toBe(false)
  })

  it('case insensitive', () => {
    expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true)
  })
})
