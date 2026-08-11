import { describe, it, expect } from 'vitest'
import { resolveMultichainAddress, resolveBtcAddress, resolveSolAddress, resolveEvmAddress } from '../src/core/resolver.js'
import { COIN_TYPE, COIN_NAME, evmCoinType, isEvmCoinType, coinTypeToChainId } from '../src/core/coins.js'
import { selector } from '../src/utils/keccak.js'

const RPC = 'https://ethereum-rpc.publicnode.com'

describe('coin types', () => {
  it('has correct SLIP-44 values', () => {
    expect(COIN_TYPE['BTC']).toBe(0)
    expect(COIN_TYPE['ETH']).toBe(60)
    expect(COIN_TYPE['SOL']).toBe(501)
    expect(COIN_TYPE['BNB']).toBe(714)
    expect(COIN_TYPE['MATIC']).toBe(966)
  })

  it('COIN_NAME reverse mapping works', () => {
    expect(COIN_NAME[60]).toBe('ETH')
    expect(COIN_NAME[0]).toBe('BTC')
    expect(COIN_NAME[501]).toBe('SOL')
  })

  it('evmCoinType sets high bit (unsigned)', () => {
    expect(evmCoinType(1)).toBe(2147483649) // 0x80000001
    expect(evmCoinType(137)).toBe(2147483785) // 0x80000089
    expect(evmCoinType(56)).toBe(2147483704) // 0x80000038
    // Must encode as positive uint256
    expect(BigInt(evmCoinType(1)).toString(16)).toBe('80000001')
  })

  it('isEvmCoinType detects correctly', () => {
    expect(isEvmCoinType(evmCoinType(1))).toBe(true)
    expect(isEvmCoinType(60)).toBe(false)
    expect(isEvmCoinType(0)).toBe(false)
  })

  it('coinTypeToChainId extracts chain ID', () => {
    expect(coinTypeToChainId(evmCoinType(1))).toBe(1)
    expect(coinTypeToChainId(evmCoinType(137))).toBe(137)
    expect(coinTypeToChainId(60)).toBeNull()
  })
})

describe('addr(bytes32,uint256) selector', () => {
  it('has correct selector', () => {
    expect(selector('addr(bytes32,uint256)')).toBe('0xf1cb7e06')
  })
})

describe('integration: multichain resolution', () => {
  it('resolves ETH address via multichain (coinType 60)', async () => {
    const result = await resolveMultichainAddress('vitalik.eth', 60, { rpcUrl: RPC })
    // ETH address should be returned as bytes
    expect(result).not.toBeNull()
  }, 15000)

  it('resolves BTC address for vitalik.eth', async () => {
    const result = await resolveBtcAddress('vitalik.eth', { rpcUrl: RPC })
    // vitalik may or may not have BTC set
    expect(result === null || typeof result === 'string').toBe(true)
  }, 15000)

  it('resolves SOL address for vitalik.eth', async () => {
    const result = await resolveSolAddress('vitalik.eth', { rpcUrl: RPC })
    expect(result === null || typeof result === 'string').toBe(true)
  }, 15000)

  it('returns null for unregistered name', async () => {
    const result = await resolveMultichainAddress('doesnotexist99999.eth', 60, { rpcUrl: RPC })
    expect(result).toBeNull()
  }, 15000)
})
