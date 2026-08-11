import type { Address, Hex, EnsRecord, EnsProfile, ReverseRecord, ResolveOptions } from '../types/index.js'
import { namehash, dnsEncode, normalize } from './namehash.js'
import { selector } from '../utils/keccak.js'
import { ethCallSafe, encodeBytes32, decodeAddress, decodeString, decodeBytes, isZeroAddress } from '../utils/rpc.js'
import { ethCallWithCcip } from './ccip.js'
import { COIN_TYPE, evmCoinType } from './coins.js'

const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address

const RESOLVER_SEL = selector('resolver(bytes32)')
const ADDR_SEL = selector('addr(bytes32)')
const ADDR_MULTICHAIN_SEL = selector('addr(bytes32,uint256)')
const NAME_SEL = selector('name(bytes32)')
const TEXT_SEL = selector('text(bytes32,string)')
const CONTENTHASH_SEL = selector('contenthash(bytes32)')
const TTL_SEL = selector('ttl(bytes32)')
const RESOLVE_SEL = selector('resolve(bytes,bytes)')

function encodeString(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const len = bytes.length
  const offset = '0000000000000000000000000000000000000000000000000000000000000040'
  const lenHex = len.toString(16).padStart(64, '0')
  let dataHex = ''
  for (const b of bytes) {
    dataHex += b.toString(16).padStart(2, '0')
  }
  const padLen = Math.ceil(len / 32) * 64
  dataHex = dataHex.padEnd(padLen, '0')
  return offset + lenHex + dataHex
}

function encodeUint256(value: number | bigint): string {
  return BigInt(value).toString(16).padStart(64, '0')
}

async function getResolver(rpcUrl: string, node: string, registry: Address): Promise<Address | null> {
  const data = (RESOLVER_SEL + encodeBytes32(node.slice(2))) as Hex
  const result = await ethCallSafe(rpcUrl, registry, data)
  if (!result) return null
  const addr = decodeAddress(result)
  return isZeroAddress(addr) ? null : addr
}

async function getResolverWithWildcard(rpcUrl: string, name: string, registry: Address): Promise<{ resolver: Address; isWildcard: boolean } | null> {
  const normalized = normalize(name)
  const parts = normalized.split('.')

  // Don't climb past the 2nd-level domain (e.g. stop at "cb.id", not "id")
  const maxClimb = Math.max(0, parts.length - 1)

  for (let i = 0; i < maxClimb; i++) {
    const ancestor = parts.slice(i).join('.')
    if (!ancestor || !ancestor.includes('.')) continue
    const node = namehash(ancestor)
    const resolver = await getResolver(rpcUrl, node, registry)
    if (resolver) {
      return { resolver, isWildcard: i > 0 }
    }
  }

  return null
}

async function ccipAwareCall(rpcUrl: string, to: Address, data: Hex): Promise<Hex | null> {
  const direct = await ethCallSafe(rpcUrl, to, data)
  if (direct) return direct
  return ethCallWithCcip(rpcUrl, to, data)
}

function encodeDnsNameForResolve(name: string): string {
  const dnsName = dnsEncode(name)
  const dnsClean = dnsName.startsWith('0x') ? dnsName.slice(2) : dnsName
  return dnsClean
}

function encodeResolveCall(name: string, innerCalldata: string): string {
  const dnsBytes = encodeDnsNameForResolve(name)
  const innerClean = innerCalldata.startsWith('0x') ? innerCalldata.slice(2) : innerCalldata

  const dnsLen = dnsBytes.length / 2
  const innerLen = innerClean.length / 2

  const dnsPadded = dnsBytes.padEnd(Math.ceil(dnsLen / 32) * 64, '0')
  const innerPadded = innerClean.padEnd(Math.ceil(innerLen / 32) * 64, '0')

  // ABI encode resolve(bytes, bytes): offset1 + offset2 + len1+data1 + len2+data2
  const offset1 = 64
  const offset2 = offset1 + 32 + Math.ceil(dnsLen / 32) * 32

  return (
    RESOLVE_SEL.slice(2) +
    offset1.toString(16).padStart(64, '0') +
    offset2.toString(16).padStart(64, '0') +
    dnsLen.toString(16).padStart(64, '0') +
    dnsPadded +
    innerLen.toString(16).padStart(64, '0') +
    innerPadded
  )
}

async function wildcardResolveCall(
  rpcUrl: string,
  resolverAddr: Address,
  name: string,
  innerCalldata: string,
): Promise<Hex | null> {
  const data = ('0x' + encodeResolveCall(name, innerCalldata)) as Hex
  const result = await ccipAwareCall(rpcUrl, resolverAddr, data)
  if (!result) return null

  // resolve(bytes,bytes) returns abi-encoded bytes wrapping the inner result
  // Unwrap: find the inner bytes data
  const unwrapped = unwrapResolveResponse(result)
  return unwrapped ? ('0x' + unwrapped) as Hex : result
}

function unwrapResolveResponse(hex: string): string | null {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length < 128) return clean

  try {
    const firstWord = clean.slice(0, 64)
    const offset = Number(BigInt('0x' + firstWord.replace(/^0+/, '') || '0'))
    if (offset === 32 || offset === 0x20) {
      const lenStart = offset * 2
      if (lenStart + 64 > clean.length) return clean
      const len = Number(BigInt('0x' + clean.slice(lenStart, lenStart + 64).replace(/^0+/, '') || '0'))
      if (len > 0 && lenStart + 64 + len * 2 <= clean.length) {
        return clean.slice(lenStart + 64, lenStart + 64 + len * 2)
      }
    }
  } catch {
    // fallthrough
  }
  return clean
}

export async function resolve(name: string, options: ResolveOptions): Promise<EnsRecord> {
  const { rpcUrl } = options
  const registry = options.registryAddress ?? ENS_REGISTRY
  const normalized = normalize(name)
  const node = namehash(normalized)

  const resolverInfo = await getResolverWithWildcard(rpcUrl, normalized, registry)

  if (!resolverInfo) {
    return { name: normalized, address: null, resolver: null, ttl: 0 }
  }

  const { resolver: resolverAddr, isWildcard } = resolverInfo
  const innerCalldata = ADDR_SEL.slice(2) + encodeBytes32(node.slice(2))

  let addrResult: string | null
  if (isWildcard) {
    addrResult = await wildcardResolveCall(rpcUrl, resolverAddr, normalized, innerCalldata)
  } else {
    addrResult = await ccipAwareCall(rpcUrl, resolverAddr, ('0x' + innerCalldata) as Hex)
  }

  const address = addrResult ? decodeAddress(addrResult) : null
  const finalAddr = address && !isZeroAddress(address) ? address : null

  let ttl = 0
  const ttlData = (TTL_SEL + encodeBytes32(node.slice(2))) as Hex
  const ttlResult = await ethCallSafe(rpcUrl, registry, ttlData)
  if (ttlResult) {
    const clean = ttlResult.startsWith('0x') ? ttlResult.slice(2) : ttlResult
    if (clean.length >= 64) {
      ttl = Number(BigInt('0x' + clean))
    }
  }

  return { name: normalized, address: finalAddr, resolver: resolverAddr, ttl }
}

export async function resolveAddress(name: string, options: ResolveOptions): Promise<Address | null> {
  const record = await resolve(name, options)
  return record.address
}

async function resolverCall(
  rpcUrl: string,
  name: string,
  registry: Address,
  innerCalldata: string,
): Promise<Hex | null> {
  const normalized = normalize(name)
  const resolverInfo = await getResolverWithWildcard(rpcUrl, normalized, registry)
  if (!resolverInfo) return null

  const { resolver, isWildcard } = resolverInfo
  if (isWildcard) {
    return wildcardResolveCall(rpcUrl, resolver, normalized, innerCalldata)
  }
  return ccipAwareCall(rpcUrl, resolver, ('0x' + innerCalldata) as Hex)
}

export async function resolveMultichainAddress(
  name: string,
  coinType: number,
  options: ResolveOptions,
): Promise<string | null> {
  const { rpcUrl } = options
  const registry = options.registryAddress ?? ENS_REGISTRY
  const normalized = normalize(name)
  const node = namehash(normalized)

  const innerCalldata = ADDR_MULTICHAIN_SEL.slice(2) + encodeBytes32(node.slice(2)) + encodeUint256(coinType)
  const result = await resolverCall(rpcUrl, name, registry, innerCalldata)
  if (!result) return null

  const decoded = decodeBytes(result)
  if (!decoded || decoded === '0x') return null

  return decoded
}

export async function resolveBtcAddress(name: string, options: ResolveOptions): Promise<string | null> {
  return resolveMultichainAddress(name, COIN_TYPE['BTC']!, options)
}

export async function resolveSolAddress(name: string, options: ResolveOptions): Promise<string | null> {
  return resolveMultichainAddress(name, COIN_TYPE['SOL']!, options)
}

export async function resolveEvmAddress(name: string, chainId: number, options: ResolveOptions): Promise<string | null> {
  return resolveMultichainAddress(name, evmCoinType(chainId), options)
}

export async function reverse(address: Address, options: ResolveOptions): Promise<ReverseRecord> {
  const { rpcUrl } = options
  const registry = options.registryAddress ?? ENS_REGISTRY
  const addr = address.toLowerCase().slice(2)
  const reverseName = `${addr}.addr.reverse`
  const node = namehash(reverseName)

  const resolverAddr = await getResolver(rpcUrl, node, registry)
  if (!resolverAddr) {
    return { address, name: null }
  }

  const nameData = (NAME_SEL + encodeBytes32(node.slice(2))) as Hex
  const nameResult = await ccipAwareCall(rpcUrl, resolverAddr, nameData)
  const name = nameResult ? decodeString(nameResult) : null

  return { address, name: name || null }
}

export async function getText(name: string, key: string, options: ResolveOptions): Promise<string | null> {
  const { rpcUrl } = options
  const registry = options.registryAddress ?? ENS_REGISTRY
  const normalized = normalize(name)
  const node = namehash(normalized)

  const innerCalldata = TEXT_SEL.slice(2) + encodeBytes32(node.slice(2)) + encodeString(key)
  const result = await resolverCall(rpcUrl, name, registry, innerCalldata)
  return result ? decodeString(result) : null
}

export async function getContenthash(name: string, options: ResolveOptions): Promise<string | null> {
  const { rpcUrl } = options
  const registry = options.registryAddress ?? ENS_REGISTRY
  const normalized = normalize(name)
  const node = namehash(normalized)

  const innerCalldata = CONTENTHASH_SEL.slice(2) + encodeBytes32(node.slice(2))
  const result = await resolverCall(rpcUrl, name, registry, innerCalldata)
  return result ? decodeBytes(result) : null
}

export async function getAvatar(name: string, options: ResolveOptions): Promise<string | null> {
  return getText(name, 'avatar', options)
}

export async function getProfile(name: string, options: ResolveOptions): Promise<EnsProfile> {
  const { rpcUrl } = options
  const registry = options.registryAddress ?? ENS_REGISTRY
  const normalized = normalize(name)
  const node = namehash(normalized)

  const resolverInfo = await getResolverWithWildcard(rpcUrl, normalized, registry)
  if (!resolverInfo) {
    return {
      name: normalized, address: null, resolver: null,
      avatar: null, email: null, url: null, description: null,
      twitter: null, github: null, discord: null, telegram: null,
      contenthash: null, textRecords: {},
    }
  }

  const { resolver: resolverAddr, isWildcard } = resolverInfo

  async function profileCall(innerCalldata: string): Promise<Hex | null> {
    if (isWildcard) {
      return wildcardResolveCall(rpcUrl, resolverAddr, normalized, innerCalldata)
    }
    return ccipAwareCall(rpcUrl, resolverAddr, ('0x' + innerCalldata) as Hex)
  }

  const addrCalldata = ADDR_SEL.slice(2) + encodeBytes32(node.slice(2))
  const addrResult = await profileCall(addrCalldata)
  const address = addrResult ? decodeAddress(addrResult) : null
  const finalAddr = address && !isZeroAddress(address) ? address : null

  const textKeys = ['avatar', 'email', 'url', 'description', 'com.twitter', 'com.github', 'com.discord', 'org.telegram']
  const textResults = await Promise.all(
    textKeys.map(async key => {
      const innerCalldata = TEXT_SEL.slice(2) + encodeBytes32(node.slice(2)) + encodeString(key)
      const result = await profileCall(innerCalldata)
      return { key, value: result ? decodeString(result) : null }
    })
  )

  const chCalldata = CONTENTHASH_SEL.slice(2) + encodeBytes32(node.slice(2))
  const chResult = await profileCall(chCalldata)
  const contenthash = chResult ? decodeBytes(chResult) : null

  const textRecords: Record<string, string> = {}
  for (const { key, value } of textResults) {
    if (value) textRecords[key] = value
  }

  return {
    name: normalized,
    address: finalAddr,
    resolver: resolverAddr,
    avatar: textRecords['avatar'] ?? null,
    email: textRecords['email'] ?? null,
    url: textRecords['url'] ?? null,
    description: textRecords['description'] ?? null,
    twitter: textRecords['com.twitter'] ?? null,
    github: textRecords['com.github'] ?? null,
    discord: textRecords['com.discord'] ?? null,
    telegram: textRecords['org.telegram'] ?? null,
    contenthash,
    textRecords,
  }
}

export async function batchResolve(names: string[], options: ResolveOptions): Promise<EnsRecord[]> {
  return Promise.all(names.map(name => resolve(name, options)))
}

export async function batchReverse(addresses: Address[], options: ResolveOptions): Promise<ReverseRecord[]> {
  return Promise.all(addresses.map(addr => reverse(addr, options)))
}
