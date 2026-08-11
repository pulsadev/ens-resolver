import type { Hex, Address } from '../types/index.js'

let rpcId = 1

export async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
  })
  const json = (await response.json()) as { result?: unknown; error?: { message: string; data?: string; code?: number } }
  if (json.error) {
    const dataStr = json.error.data ? ` data:${json.error.data}` : ''
    throw new Error(`RPC error: ${json.error.message}${dataStr}`)
  }
  return json.result
}

export async function ethCall(url: string, to: Address, data: Hex): Promise<Hex> {
  const result = await rpcCall(url, 'eth_call', [{ to, data }, 'latest'])
  return (result as Hex) ?? '0x'
}

export async function ethCallSafe(url: string, to: Address, data: Hex): Promise<Hex | null> {
  try {
    return await ethCall(url, to, data)
  } catch {
    return null
  }
}

export function encodeBytes32(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  return clean.padStart(64, '0')
}

export function decodeAddress(hex: string): Address {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const addr = clean.slice(24).toLowerCase()
  return ('0x' + addr) as Address
}

export function decodeString(hex: string): string | null {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length < 128) return null

  try {
    const offset = Number(BigInt('0x' + clean.slice(0, 64)))
    const startHex = offset * 2
    if (startHex + 64 > clean.length) return null
    const length = Number(BigInt('0x' + clean.slice(startHex, startHex + 64)))
    if (length === 0) return ''
    if (length > 10000) return null
    const dataStart = startHex + 64
    const dataEnd = dataStart + length * 2
    if (dataEnd > clean.length) return null
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = parseInt(clean.slice(dataStart + i * 2, dataStart + i * 2 + 2), 16)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function decodeBytes(hex: string): string | null {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length < 128) {
    if (clean.length > 0 && clean !== '0'.repeat(64)) {
      return '0x' + clean
    }
    return null
  }

  try {
    const offset = Number(BigInt('0x' + clean.slice(0, 64)))
    const startHex = offset * 2
    if (startHex + 64 > clean.length) return null
    const length = Number(BigInt('0x' + clean.slice(startHex, startHex + 64)))
    if (length === 0) return null
    if (length > 10000) return null
    const dataStart = startHex + 64
    const dataEnd = dataStart + length * 2
    if (dataEnd > clean.length) return null
    return '0x' + clean.slice(dataStart, dataEnd)
  } catch {
    return null
  }
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isZeroAddress(addr: string): boolean {
  return addr.toLowerCase() === ZERO_ADDRESS
}
