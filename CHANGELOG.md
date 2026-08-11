# Changelog

## [0.1.0] - 2026-08-12

### Added

- Forward ENS resolution (name → address) with wildcard support
- Reverse ENS resolution (address → name)
- CCIP-Read (ERC-3668) offchain resolution — works with cb.id, L2 subdomains
- Wildcard resolution (ENSIP-10) — automatic parent domain resolver climbing
- Multi-chain address resolution via addr(bytes32,uint256) with SLIP-44 coin types
- Convenience functions: resolveBtcAddress, resolveSolAddress, resolveEvmAddress
- ENSIP-11 EVM chain coin type encoding (evmCoinType, coinTypeToChainId)
- Text record queries (avatar, email, url, description, twitter, github, discord, telegram)
- Full profile resolution (all records in one call)
- Contenthash resolution
- Batch forward and reverse resolution
- ENSIP-15 compatible name normalization (ß→ss, fullwidth→ASCII, zero-width removal, NFC, combining mark validation, hyphen rules)
- Pure JS EIP-137 namehash implementation
- Label hashing and DNS wire format encoding
- 20+ built-in SLIP-44 coin type constants
- ESM + CJS dual format with full TypeScript declarations
- 84 tests passing (unit + normalization + Ethereum mainnet + CCIP-Read integration)
- Zero runtime dependencies (~16 KB bundled)
