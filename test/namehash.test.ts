import { describe, it, expect } from 'vitest'
import { namehash, labelhash, dnsEncode, normalize } from '../src/core/namehash.js'

describe('namehash', () => {
  it('hashes empty string to zero', () => {
    expect(namehash('')).toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
  })

  it('hashes "eth" correctly', () => {
    expect(namehash('eth')).toBe('0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae')
  })

  it('hashes "vitalik.eth" correctly', () => {
    expect(namehash('vitalik.eth')).toBe('0xee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a53475835')
  })

  it('hashes "resolver.eth" correctly', () => {
    expect(namehash('resolver.eth')).toBe('0xfdd5d5de6dd63db72bbc2d487944ba13bf775b50a80805fe6fcaba9b0fba88f5')
  })

  it('hashes "foo.bar.eth" correctly', () => {
    expect(namehash('foo.bar.eth')).toBe('0x6033644d673b47b3bea04e79bbe06d78ce76b8be2fb8704f9c2a80fd139c81d3')
  })

  it('handles subdomains', () => {
    const hash = namehash('sub.domain.eth')
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(hash).not.toBe(namehash('domain.eth'))
  })
})

describe('labelhash', () => {
  it('hashes label correctly', () => {
    const hash = labelhash('vitalik')
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(hash.length).toBe(66)
  })

  it('different labels produce different hashes', () => {
    expect(labelhash('vitalik')).not.toBe(labelhash('ethereum'))
  })
})

describe('dnsEncode', () => {
  it('encodes empty name', () => {
    expect(dnsEncode('')).toBe('0x00')
  })

  it('encodes "eth"', () => {
    // length=3, 'e'=65, 't'=74, 'h'=68, terminator=00
    expect(dnsEncode('eth')).toBe('0x03657468' + '00')
  })

  it('encodes "vitalik.eth"', () => {
    const encoded = dnsEncode('vitalik.eth')
    expect(encoded.startsWith('0x')).toBe(true)
    expect(encoded.endsWith('00')).toBe(true)
  })
})

describe('normalize', () => {
  it('lowercases', () => {
    expect(normalize('Vitalik.ETH')).toBe('vitalik.eth')
  })

  it('trims whitespace', () => {
    expect(normalize('  vitalik.eth  ')).toBe('vitalik.eth')
  })
})
