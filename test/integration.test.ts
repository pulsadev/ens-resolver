import { describe, it, expect } from 'vitest'
import { resolve, resolveAddress, reverse, getText, getAvatar, getProfile, getContenthash, batchResolve, batchReverse } from '../src/core/resolver.js'
import type { Address } from '../src/types/index.js'

const RPC = 'https://ethereum-rpc.publicnode.com'
const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address

describe('integration: resolve', () => {
  it('resolves vitalik.eth', async () => {
    const record = await resolve('vitalik.eth', { rpcUrl: RPC })
    expect(record.name).toBe('vitalik.eth')
    expect(record.address).not.toBeNull()
    expect(record.address!.toLowerCase()).toBe(VITALIK.toLowerCase())
    expect(record.resolver).not.toBeNull()
  }, 15000)

  it('resolves nick.eth', async () => {
    const record = await resolve('nick.eth', { rpcUrl: RPC })
    expect(record.name).toBe('nick.eth')
    expect(record.address).not.toBeNull()
    expect(record.resolver).not.toBeNull()
  }, 15000)

  it('returns null address for unregistered name', async () => {
    const record = await resolve('thisdoesnotexist99999999.eth', { rpcUrl: RPC })
    expect(record.address).toBeNull()
  }, 15000)
})

describe('integration: resolveAddress', () => {
  it('returns address directly', async () => {
    const addr = await resolveAddress('vitalik.eth', { rpcUrl: RPC })
    expect(addr).not.toBeNull()
    expect(addr!.toLowerCase()).toBe(VITALIK.toLowerCase())
  }, 15000)
})

describe('integration: reverse', () => {
  it('reverse resolves vitalik address', async () => {
    const record = await reverse(VITALIK, { rpcUrl: RPC })
    expect(record.address).toBe(VITALIK)
    expect(record.name).toBe('vitalik.eth')
  }, 15000)
})

describe('integration: getText', () => {
  it('gets avatar for vitalik.eth', async () => {
    const avatar = await getText('vitalik.eth', 'avatar', { rpcUrl: RPC })
    // vitalik has an avatar set
    expect(avatar).not.toBeNull()
  }, 15000)

  it('gets url for nick.eth', async () => {
    const url = await getText('nick.eth', 'url', { rpcUrl: RPC })
    // nick.eth may or may not have url set
    expect(typeof url === 'string' || url === null).toBe(true)
  }, 15000)

  it('returns null for missing text record', async () => {
    const result = await getText('vitalik.eth', 'nonexistent_key_xyz', { rpcUrl: RPC })
    // should return empty string or null
    expect(result === null || result === '').toBe(true)
  }, 15000)
})

describe('integration: getAvatar', () => {
  it('gets avatar for vitalik.eth', async () => {
    const avatar = await getAvatar('vitalik.eth', { rpcUrl: RPC })
    expect(avatar).not.toBeNull()
  }, 15000)
})

describe('integration: getContenthash', () => {
  it('gets contenthash for a name', async () => {
    const ch = await getContenthash('vitalik.eth', { rpcUrl: RPC })
    // may or may not have contenthash
    expect(ch === null || typeof ch === 'string').toBe(true)
  }, 15000)
})

describe('integration: getProfile', () => {
  it('gets full profile for vitalik.eth', async () => {
    const profile = await getProfile('vitalik.eth', { rpcUrl: RPC })
    expect(profile.name).toBe('vitalik.eth')
    expect(profile.address).not.toBeNull()
    expect(profile.address!.toLowerCase()).toBe(VITALIK.toLowerCase())
    expect(profile.resolver).not.toBeNull()
    expect(profile.avatar).not.toBeNull()
  }, 30000)
})

describe('integration: batchResolve', () => {
  it('resolves multiple names', async () => {
    const records = await batchResolve(['vitalik.eth', 'nick.eth'], { rpcUrl: RPC })
    expect(records).toHaveLength(2)
    expect(records[0]!.address).not.toBeNull()
    expect(records[1]!.address).not.toBeNull()
  }, 20000)
})

describe('integration: batchReverse', () => {
  it('reverse resolves multiple addresses', async () => {
    const records = await batchReverse([VITALIK], { rpcUrl: RPC })
    expect(records).toHaveLength(1)
    expect(records[0]!.name).toBe('vitalik.eth')
  }, 15000)
})
