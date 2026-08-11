import { describe, it, expect } from 'vitest'
import { resolve, reverse, getText, getProfile, resolveAddress } from '../src/core/resolver.js'
import { namehash, normalize } from '../src/core/namehash.js'
import type { Address } from '../src/types/index.js'

const RPC = 'https://ethereum-rpc.publicnode.com'

describe('edge: namehash consistency', () => {
  it('same name always produces same hash', () => {
    const h1 = namehash('vitalik.eth')
    const h2 = namehash('vitalik.eth')
    expect(h1).toBe(h2)
  })

  it('different names produce different hashes', () => {
    expect(namehash('vitalik.eth')).not.toBe(namehash('nick.eth'))
    expect(namehash('foo.eth')).not.toBe(namehash('bar.eth'))
  })

  it('subdomains are different from parent', () => {
    expect(namehash('sub.vitalik.eth')).not.toBe(namehash('vitalik.eth'))
  })

  it('normalized input matches lowercase', () => {
    expect(namehash(normalize('VITALIK.ETH'))).toBe(namehash('vitalik.eth'))
    expect(namehash(normalize('Nick.Eth'))).toBe(namehash('nick.eth'))
  })
})

describe('edge: unregistered names', () => {
  it('resolve returns null address', async () => {
    const r = await resolve('xyznonexistent123456789.eth', { rpcUrl: RPC })
    expect(r.address).toBeNull()
    expect(r.resolver).toBeNull()
  }, 15000)

  it('resolveAddress returns null', async () => {
    const addr = await resolveAddress('xyznonexistent123456789.eth', { rpcUrl: RPC })
    expect(addr).toBeNull()
  }, 15000)

  it('getText returns null', async () => {
    const text = await getText('xyznonexistent123456789.eth', 'avatar', { rpcUrl: RPC })
    expect(text).toBeNull()
  }, 15000)
})

describe('edge: reverse with no ENS name', () => {
  it('returns null name for random address', async () => {
    const r = await reverse('0x0000000000000000000000000000000000000001' as Address, { rpcUrl: RPC })
    expect(r.name).toBeNull()
  }, 15000)
})

describe('edge: getProfile for real name', () => {
  it('nick.eth has address and resolver', async () => {
    const p = await getProfile('nick.eth', { rpcUrl: RPC })
    expect(p.address).not.toBeNull()
    expect(p.resolver).not.toBeNull()
    expect(p.name).toBe('nick.eth')
  }, 30000)

  it('getProfile for nonexistent returns empty profile', async () => {
    const p = await getProfile('doesnotexist999999.eth', { rpcUrl: RPC })
    expect(p.address).toBeNull()
    expect(p.resolver).toBeNull()
    expect(p.avatar).toBeNull()
    expect(Object.keys(p.textRecords)).toHaveLength(0)
  }, 15000)
})
