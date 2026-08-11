# @pulsadev/ens-resolver

Lightweight ENS resolver — forward/reverse resolution, avatar, text records, contenthash, CCIP-Read, multi-chain addresses. Zero dependencies, pure RPC.

Resolve any `.eth` name to an address, look up text records, get full profiles. Supports offchain names (cb.id, L2 subdomains). No ethers, no viem — just an RPC URL.

## Features

- **Forward resolution** — resolve ENS names to Ethereum addresses
- **Reverse resolution** — look up ENS names from addresses
- **CCIP-Read (ERC-3668)** — offchain resolution for L2 names, cb.id, and wildcard subdomains
- **Wildcard resolution (ENSIP-10)** — automatic parent domain resolver lookup
- **Multi-chain addresses** — resolve BTC, SOL, and EVM chain addresses via `addr(bytes32,uint256)`
- **Text records** — avatar, email, url, description, twitter, github, discord, telegram
- **Full profile** — get everything in one call
- **Contenthash** — IPFS/Swarm/Onion content resolution
- **Batch resolution** — resolve multiple names or addresses in parallel
- **ENS normalization** — ENSIP-15 compatible: ß→ss, fullwidth→ASCII, zero-width removal, NFC, combining mark validation
- **Namehash** — pure JS EIP-137 namehash implementation
- **SLIP-44 coin types** — built-in BTC, ETH, SOL, DOT, ATOM, and 20+ coin type constants
- **Zero dependencies** — ~16 KB bundled, ESM + CJS, pure TypeScript

## Install

```bash
npm install @pulsadev/ens-resolver
```

## Quick Start

### Resolve a name

```typescript
import { resolve, resolveAddress } from '@pulsadev/ens-resolver'

const record = await resolve('vitalik.eth', {
  rpcUrl: 'https://ethereum-rpc.publicnode.com',
})

console.log(record.address)  // '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
console.log(record.resolver) // '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63'
```

### Offchain / CCIP-Read names (cb.id, L2 subdomains)

```typescript
// Works automatically — no extra config
const record = await resolve('brian.cb.id', { rpcUrl: '...' })
console.log(record.address) // '0xc1d9d4e2facf0f4e72cad1579ac7a86598dd605d'
```

### Reverse resolution

```typescript
import { reverse } from '@pulsadev/ens-resolver'

const record = await reverse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', {
  rpcUrl: 'https://ethereum-rpc.publicnode.com',
})
console.log(record.name) // 'vitalik.eth'
```

### Multi-chain addresses

```typescript
import { resolveMultichainAddress, resolveBtcAddress, resolveSolAddress, resolveEvmAddress, COIN_TYPE } from '@pulsadev/ens-resolver'

// BTC address
const btc = await resolveBtcAddress('vitalik.eth', { rpcUrl: '...' })

// SOL address
const sol = await resolveSolAddress('vitalik.eth', { rpcUrl: '...' })

// Any EVM chain (ENSIP-11)
const arb = await resolveEvmAddress('vitalik.eth', 42161, { rpcUrl: '...' })

// Any coin type
const dot = await resolveMultichainAddress('vitalik.eth', COIN_TYPE.DOT, { rpcUrl: '...' })
```

### Text records

```typescript
import { getText, getAvatar } from '@pulsadev/ens-resolver'

const avatar = await getAvatar('vitalik.eth', { rpcUrl: '...' })
const twitter = await getText('vitalik.eth', 'com.twitter', { rpcUrl: '...' })
const github = await getText('vitalik.eth', 'com.github', { rpcUrl: '...' })
```

### Full profile

```typescript
import { getProfile } from '@pulsadev/ens-resolver'

const profile = await getProfile('vitalik.eth', { rpcUrl: '...' })

console.log(profile.address)     // '0xd8dA...'
console.log(profile.avatar)      // 'https://euc.li/vitalik.eth'
console.log(profile.twitter)     // 'VitalikButerin'
console.log(profile.github)      // 'vbuterin'
console.log(profile.url)         // 'https://vitalik.ca'
console.log(profile.contenthash) // '0xe301...'
```

### Batch resolution

```typescript
import { batchResolve, batchReverse } from '@pulsadev/ens-resolver'

const records = await batchResolve(['vitalik.eth', 'nick.eth'], { rpcUrl: '...' })
const reverses = await batchReverse(['0xd8dA...', '0xb8c2...'], { rpcUrl: '...' })
```

### Namehash utilities

```typescript
import { namehash, labelhash, dnsEncode, normalize } from '@pulsadev/ens-resolver'

namehash('vitalik.eth')  // '0xee6c4522aab0003e8d14cd40a6af439055fd2577...'
labelhash('vitalik')     // '0x...'
normalize('Vitalik.ETH') // 'vitalik.eth'
normalize('faß.eth')     // 'fass.eth' (ENSIP-15)
```

## API

### Resolution

| Function | Description |
|----------|-------------|
| `resolve(name, options)` | Resolve name to address + resolver + TTL |
| `resolveAddress(name, options)` | Resolve name to address only |
| `resolveMultichainAddress(name, coinType, options)` | Resolve non-ETH chain address |
| `resolveBtcAddress(name, options)` | Resolve BTC address |
| `resolveSolAddress(name, options)` | Resolve SOL address |
| `resolveEvmAddress(name, chainId, options)` | Resolve EVM chain address (ENSIP-11) |
| `reverse(address, options)` | Reverse resolve address to name |
| `getText(name, key, options)` | Get a text record |
| `getAvatar(name, options)` | Get avatar text record |
| `getContenthash(name, options)` | Get contenthash |
| `getProfile(name, options)` | Get full profile (address + all text records + contenthash) |
| `batchResolve(names, options)` | Resolve multiple names in parallel |
| `batchReverse(addresses, options)` | Reverse resolve multiple addresses |

### Coin Types

```typescript
import { COIN_TYPE, COIN_NAME, evmCoinType, coinTypeToChainId } from '@pulsadev/ens-resolver'

COIN_TYPE.BTC   // 0
COIN_TYPE.ETH   // 60
COIN_TYPE.SOL   // 501
COIN_TYPE.DOT   // 354

evmCoinType(42161)       // ENSIP-11 coin type for Arbitrum
coinTypeToChainId(0x80000001) // 1 (Ethereum mainnet)
```

### Utilities

| Function | Description |
|----------|-------------|
| `namehash(name)` | EIP-137 namehash |
| `labelhash(label)` | Hash a single label |
| `dnsEncode(name)` | DNS wire format encoding |
| `normalize(name)` | ENSIP-15 normalization |
| `ensNormalize(name)` | Same as normalize |
| `ethCallWithCcip(rpcUrl, to, data)` | Raw CCIP-Read aware eth_call |

## How it works

Unlike `@ensdomains/ensjs` which requires viem and 11 dependencies, this package works with raw RPC calls:

1. **Registry lookup** — queries ENS Registry (`0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`) for resolver address
2. **Wildcard climbing** — if no resolver found, walks up the domain tree (ENSIP-10)
3. **CCIP-Read** — if resolver reverts with `OffchainLookup`, fetches from gateway URLs and calls back (ERC-3668)
4. **Resolver calls** — queries resolver for `addr()`, `text()`, `contenthash()` etc.
5. **Multi-chain** — uses `addr(bytes32,uint256)` with SLIP-44/ENSIP-11 coin types

All in ~16KB with zero dependencies.

## License

MIT © [Yuto Nakamura](https://github.com/yutonakamura-dev)
