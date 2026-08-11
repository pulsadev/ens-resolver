export {
  resolve,
  resolveAddress,
  resolveMultichainAddress,
  resolveBtcAddress,
  resolveSolAddress,
  resolveEvmAddress,
  reverse,
  getText,
  getContenthash,
  getAvatar,
  getProfile,
  batchResolve,
  batchReverse,
} from './core/resolver.js'

export { namehash, labelhash, dnsEncode, normalize } from './core/namehash.js'
export { ensNormalize } from './utils/normalize.js'
export { ethCallWithCcip } from './core/ccip.js'
export { COIN_TYPE, COIN_NAME, evmCoinType, isEvmCoinType, coinTypeToChainId } from './core/coins.js'
export { keccak256, keccak256Bytes, keccak256Hex, selector, bytesToHex, hexToBytes } from './utils/keccak.js'

export type {
  Hex,
  Address,
  EnsRecord,
  EnsProfile,
  ReverseRecord,
  ResolveOptions,
  BatchResolveResult,
} from './types/index.js'
