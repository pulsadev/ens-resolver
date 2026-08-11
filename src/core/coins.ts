// SLIP-44 coin types for multi-chain address resolution
// https://github.com/satoshilabs/slips/blob/master/slip-0044.md
export const COIN_TYPE: Record<string, number> = {
  BTC: 0,
  LTC: 2,
  DOGE: 3,
  ETH: 60,
  ETC: 61,
  BNB: 714,
  SOL: 501,
  ATOM: 118,
  DOT: 354,
  NEAR: 397,
  XRP: 144,
  ADA: 1815,
  AVAX: 9005,
  MATIC: 966,
  FTM: 1007,
  ALGO: 283,
  TRX: 195,
  FIL: 461,
  HBAR: 3030,
  ONE: 1023,
  KLAY: 8217,
  AR: 472,
}

// EVM chain IDs use coin type = 0x80000000 | chainId (ENSIP-11)
export function evmCoinType(chainId: number): number {
  return (0x80000000 | chainId) >>> 0
}

export function isEvmCoinType(coinType: number): boolean {
  return (coinType & 0x80000000) !== 0
}

export function coinTypeToChainId(coinType: number): number | null {
  if (!isEvmCoinType(coinType)) return null
  return coinType & 0x7FFFFFFF
}

export const COIN_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(COIN_TYPE).map(([k, v]) => [v, k])
)
