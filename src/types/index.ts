export type Hex = `0x${string}`
export type Address = `0x${string}`

export interface EnsRecord {
  name: string
  address: Address | null
  resolver: Address | null
  ttl: number
}

export interface EnsProfile {
  name: string
  address: Address | null
  resolver: Address | null
  avatar: string | null
  email: string | null
  url: string | null
  description: string | null
  twitter: string | null
  github: string | null
  discord: string | null
  telegram: string | null
  contenthash: string | null
  textRecords: Record<string, string>
}

export interface ReverseRecord {
  address: Address
  name: string | null
}

export interface ResolveOptions {
  rpcUrl: string
  registryAddress?: Address
}

export interface BatchResolveResult {
  resolved: EnsRecord[]
  errors: Array<{ name: string; error: string }>
}
