import type { Address, Hex } from '../types/index.js'
import { rpcCall } from '../utils/rpc.js'

// ERC-3668 OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData)
// Error selector: 0x556f1830
const OFFCHAIN_LOOKUP_SELECTOR = '556f1830'

const MAX_CCIP_REDIRECTS = 4

interface OffchainLookup {
  sender: Address
  urls: string[]
  callData: string
  callbackFunction: string
  extraData: string
}

export async function ethCallWithCcip(
  rpcUrl: string,
  to: Address,
  data: Hex,
  maxRedirects: number = MAX_CCIP_REDIRECTS,
): Promise<Hex | null> {
  let currentTo = to
  let currentData = data
  let redirects = 0

  while (redirects < maxRedirects) {
    try {
      const result = await rpcCall(rpcUrl, 'eth_call', [{ to: currentTo, data: currentData }, 'latest'])
      return (result as Hex) ?? '0x'
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      const lookup = parseOffchainLookup(msg)
      if (!lookup) return null

      const response = await fetchOffchain(lookup.urls, lookup.callData, currentTo)
      if (!response) return null

      // Build callback: callbackFunction(bytes response, bytes extraData)
      currentData = ('0x' + lookup.callbackFunction + encodeTwoBytesArgs(response, lookup.extraData)) as Hex
      currentTo = lookup.sender as Address

      redirects++
    }
  }

  return null
}

function parseOffchainLookup(errorMessage: string): OffchainLookup | null {
  // RPC error data comes in different formats
  // Try to extract the revert data hex
  let dataHex = ''

  // Format 1: "execution reverted" with data in the error
  const hexMatch = errorMessage.match(/0x(556f1830[0-9a-fA-F]+)/i)
  if (hexMatch) {
    dataHex = hexMatch[1]!
  }

  // Format 2: error object with data field
  const dataMatch = errorMessage.match(/"data"\s*:\s*"0x(556f1830[0-9a-fA-F]+)"/i)
  if (!dataHex && dataMatch) {
    dataHex = dataMatch[1]!
  }

  if (!dataHex || !dataHex.toLowerCase().startsWith(OFFCHAIN_LOOKUP_SELECTOR)) {
    return null
  }

  try {
    const data = dataHex.slice(8) // Remove selector

    // Decode: address sender (32 bytes)
    const sender = '0x' + data.slice(24, 64).toLowerCase()

    // Decode: offset to urls array (32 bytes)
    const urlsOffset = Number(BigInt('0x' + data.slice(64, 128))) * 2

    // Decode: offset to callData (32 bytes)
    const callDataOffset = Number(BigInt('0x' + data.slice(128, 192))) * 2

    // Decode: bytes4 callbackFunction
    const callbackFunction = data.slice(192, 200)

    // Decode: offset to extraData (32 bytes)
    const extraDataOffset = Number(BigInt('0x' + data.slice(256, 320))) * 2

    // Decode urls array
    const urls = decodeStringArray(data, urlsOffset)

    // Decode callData bytes
    const callData = decodeBytesField(data, callDataOffset)

    // Decode extraData bytes
    const extraData = decodeBytesField(data, extraDataOffset)

    return {
      sender: sender as Address,
      urls,
      callData,
      callbackFunction,
      extraData,
    }
  } catch {
    return null
  }
}

function decodeStringArray(data: string, offset: number): string[] {
  const count = Number(BigInt('0x' + data.slice(offset, offset + 64)))
  const urls: string[] = []

  for (let i = 0; i < count; i++) {
    const elemOffset = Number(BigInt('0x' + data.slice(offset + 64 + i * 64, offset + 128 + i * 64))) * 2
    const absOffset = offset + 64 + elemOffset
    const len = Number(BigInt('0x' + data.slice(absOffset, absOffset + 64)))
    const strBytes = data.slice(absOffset + 64, absOffset + 64 + len * 2)
    const bytes = new Uint8Array(len)
    for (let j = 0; j < len; j++) {
      bytes[j] = parseInt(strBytes.slice(j * 2, j * 2 + 2), 16)
    }
    urls.push(new TextDecoder().decode(bytes))
  }

  return urls
}

function decodeBytesField(data: string, offset: number): string {
  const len = Number(BigInt('0x' + data.slice(offset, offset + 64)))
  return data.slice(offset + 64, offset + 64 + len * 2)
}

async function fetchOffchain(urls: string[], callData: string, sender: Address): Promise<string | null> {
  for (const urlTemplate of urls) {
    try {
      const url = urlTemplate
        .replace('{sender}', sender)
        .replace('{data}', '0x' + callData)

      let response: Response

      if (urlTemplate.includes('{data}')) {
        // GET request
        response = await fetch(url)
      } else {
        // POST request
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: '0x' + callData, sender }),
        })
      }

      if (!response.ok) continue

      const json = (await response.json()) as { data?: string }
      if (json.data) {
        return json.data.startsWith('0x') ? json.data.slice(2) : json.data
      }
    } catch {
      continue
    }
  }
  return null
}

function encodeTwoBytesArgs(hex1: string, hex2: string): string {
  const clean1 = hex1.startsWith('0x') ? hex1.slice(2) : hex1
  const clean2 = hex2.startsWith('0x') ? hex2.slice(2) : hex2

  const len1 = clean1.length / 2
  const len2 = clean2.length / 2

  const padLen1 = Math.ceil(len1 / 32) * 32
  const paddedData1 = clean1.padEnd(padLen1 * 2, '0')

  const padLen2 = Math.ceil(len2 / 32) * 32
  const paddedData2 = clean2.padEnd(padLen2 * 2, '0')

  // ABI: offset1 + offset2 + (len1 + data1) + (len2 + data2)
  // offset1 = 0x40 (64 bytes = past two 32-byte offset words)
  const offset1 = 64
  // offset2 = 64 + 32 + padLen1 (past offset words + length word + padded data1)
  const offset2 = offset1 + 32 + padLen1

  const offset1Hex = offset1.toString(16).padStart(64, '0')
  const offset2Hex = offset2.toString(16).padStart(64, '0')
  const len1Hex = len1.toString(16).padStart(64, '0')
  const len2Hex = len2.toString(16).padStart(64, '0')

  return offset1Hex + offset2Hex + len1Hex + paddedData1 + len2Hex + paddedData2
}
