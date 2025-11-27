# P2P Recovery

A browser-based ERC-4337 smart account management platform for USDC token transfers on Monad and BNB Smart Chain networks.

## Overview

This application provides a simple interface for managing private keys, deriving smart account addresses, and executing token transfers using the ERC-4337 account abstraction standard. Private keys are stored locally in browser localStorage with no server-side storage or wallet connection required.

## Features

- Private key management with browser-based storage
- ERC-4337 smart account address derivation
- USDC token transfers via UserOperation flow
- Multi-chain support (Monad, BNB Smart Chain)
- Real-time balance checking
- Transaction status tracking with explorer integration

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Navigate to http://localhost:3000

## Production Build

```bash
npm run build
npm start
```

## Usage

### 1. Private Key Setup

Enter your private key (64-character hex string with or without 0x prefix). The application will derive and display your EOA owner address.

### 2. Smart Account Derivation

Configure the factory contract:
- Factory Address: `0xdE320c2E2b4953883f61774c006f9057A55B97D1` (default)
- Factory Data: `0x` (optional initialization bytes)

Click derive to generate your smart account address and view USDC balance.

### 3. Token Transfer

Enter recipient address and amount, then submit the transaction. The application will:
- Validate balance
- Build and sign UserOperation
- Estimate gas via bundler
- Submit to network
- Poll for receipt
- Display transaction hash with explorer link

## Network Configuration

### Monad
- Chain ID: 143
- RPC: https://rpc3.monad.xyz
- Explorer: https://mainnet-beta.monvision.io
- USDC: `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`

### BNB Smart Chain
- Chain ID: 56
- RPC: https://bsc-dataseed.binance.org
- Explorer: https://bscscan.com
- USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

## Contract Addresses

```
EntryPoint: 0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789
Factory: 0xdE320c2E2b4953883f61774c006f9057A55B97D1
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── private-key-manager.tsx
│   ├── token-transfer.tsx
│   └── theme-provider.tsx
└── lib/
    ├── providers.tsx
    ├── smart-account.ts
    └── storage.ts
```

## Transaction Flow

1. Load private key and derive signer account
2. Query current USDC balance
3. Retrieve nonce from EntryPoint contract
4. Encode ERC20 transfer calldata
5. Wrap calldata in smart account execute function
6. Fetch current gas prices from network
7. Construct UserOperation with dummy signature
8. Estimate gas limits via bundler RPC
9. Sign UserOperation hash with private key
10. Submit UserOperation to bundler
11. Poll for transaction receipt
12. Display result with explorer link

## API Reference

### Storage Module

```typescript
savePrivateKey(privateKey: string): void
getPrivateKey(): string | null
clearPrivateKey(): void
isValidPrivateKey(key: string): boolean
formatPrivateKey(key: string): string
saveSmartAccountData(data: object): void
getSmartAccountData(): object | null
```

### Smart Account Module

```typescript
deriveSmartAccountAddress(
  admin: Address,
  factory: Address,
  data: `0x${string}`,
  network: 'monad' | 'bnb'
): Promise<Address>

getAccountFromPrivateKey(privateKey: string): Account
getUserOpHash(userOp: UserOperation, entryPoint: Address, chainId: number): Hash
formatUserOpForBundler(userOp: UserOperation): object
bundlerRpc(method: string, params: any[], url: string): Promise<any>
getTokenBalance(token: Address, account: Address, network: string): Promise<bigint>
```

## Contributing

### Adding Networks or Tokens

We welcome community contributions to expand network and token support. To request a new network or token, simply create a pull request with the required information.

#### Network Addition

Provide:
- **Network Name** (e.g., Polygon, Arbitrum)
- **Chain ID** (e.g., 137, 42161)

#### Token Addition

Provide:
- **Token Contract Address** (e.g., 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
- **Network** (e.g., Monad, BNB Smart Chain, Ethereum)

See `.github/PULL_REQUEST_TEMPLATE.md` for the PR template.

## Security Considerations

Private keys are stored in browser localStorage and never transmitted to external servers. This tool is designed for recovery and testing purposes. For production environments, consider using hardware wallets or secure key management solutions.

Always verify transaction details before signing. Review recipient addresses and amounts carefully.

## Technology Stack

- Next.js 15
- TypeScript
- Viem (Ethereum interactions)
- Tailwind CSS
- Lucide React

## License

ISC

## Author

Rilsosing
