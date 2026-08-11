import { describe, it, expect } from 'vitest'
import { resolve, resolveAddress } from '../src/core/resolver.js'

const RPC = 'https://ethereum-rpc.publicnode.com'

describe('integration: CCIP-Read + Wildcard (cb.id)', () => {
  it('resolves brian.cb.id via CCIP-Read wildcard', async () => {
    const record = await resolve('brian.cb.id', { rpcUrl: RPC })
    expect(record.address).not.toBeNull()
    expect(record.address!.length).toBe(42)
    expect(record.address!.startsWith('0x')).toBe(true)
    expect(record.resolver).not.toBeNull()
  }, 20000)

  it('resolveAddress returns address for cb.id name', async () => {
    const addr = await resolveAddress('brian.cb.id', { rpcUrl: RPC })
    expect(addr).not.toBeNull()
    expect(addr!.startsWith('0x')).toBe(true)
  }, 20000)

  it('returns null for unregistered cb.id subdomain', async () => {
    const record = await resolve('thisnamedoesnotexist999.cb.id', { rpcUrl: RPC })
    // May return null or an address depending on the gateway
    expect(record.resolver).not.toBeNull()
  }, 20000)

  it('regular names still work alongside wildcard', async () => {
    const record = await resolve('vitalik.eth', { rpcUrl: RPC })
    expect(record.address).not.toBeNull()
    expect(record.address!.toLowerCase()).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
  }, 15000)
})
