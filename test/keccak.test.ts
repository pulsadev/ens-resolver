import { describe, it, expect } from 'vitest'
import { keccak256, keccak256Hex, selector, bytesToHex, hexToBytes } from '../src/utils/keccak.js'

describe('keccak256', () => {
  it('hashes empty string', () => {
    expect(keccak256('')).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
  })

  it('hashes "hello"', () => {
    expect(keccak256('hello')).toBe('1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8')
  })
})

describe('keccak256Hex', () => {
  it('hashes hex bytes', () => {
    const result = keccak256Hex('0x' + '00'.repeat(32))
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('selector', () => {
  it('computes function selectors', () => {
    expect(selector('resolver(bytes32)')).toBe('0x0178b8bf')
    expect(selector('addr(bytes32)')).toBe('0x3b3b57de')
    expect(selector('name(bytes32)')).toBe('0x691f3431')
    expect(selector('text(bytes32,string)')).toBe('0x59d1d43c')
    expect(selector('contenthash(bytes32)')).toBe('0xbc1c58d1')
  })
})

describe('bytesToHex / hexToBytes', () => {
  it('round-trips correctly', () => {
    const hex = 'deadbeef'
    const bytes = hexToBytes(hex)
    expect(bytesToHex(bytes)).toBe(hex)
  })

  it('handles 0x prefix', () => {
    const bytes = hexToBytes('0xdeadbeef')
    expect(bytesToHex(bytes)).toBe('deadbeef')
  })
})
