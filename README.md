# P2P Recovery

P2P.ME recovery platform to recover stuck USDC tokens on multiple networks.

## Overview

This application provides a simple interface for connecting wallets, managing smart account addresses, and executing token transfers using the ERC-4337 account abstraction standard. All operations are performed client-side with wallet-based authentication.

## Features

- Wallet connection via Thirdweb
- ERC-4337 smart account address derivation
- USDC token transfers via UserOperation flow
- Multi-chain support (multiple networks)
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

### 1. Connect Wallet

Connect your wallet using the wallet connection interface. The application will display your connected address.

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


## Contract Addresses

```
EntryPoint: 0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789
Factory: 0xdE320c2E2b4953883f61774c006f9057A55B97D1
```

## Architecture

```
src/
├── app/
│   ├── api/
│   │   └── network-request/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── wallet-connect.tsx
│   ├── smart-account-display.tsx
│   ├── token-transfer.tsx
│   ├── network-request-form.tsx
│   └── network-requests-list.tsx
└── lib/
    ├── smart-account.ts
    ├── storage.ts
    ├── network.ts
    ├── providers.tsx
    └── thirdwebClient.ts
```

## Transaction Flow

1. Connect wallet and retrieve signer account
2. Query current USDC balance
3. Retrieve nonce from EntryPoint contract
4. Encode ERC20 transfer calldata
5. Wrap calldata in smart account execute function
6. Fetch current gas prices from network
7. Construct UserOperation with dummy signature
8. Estimate gas limits via bundler RPC
9. Sign UserOperation hash with connected wallet
10. Submit UserOperation to bundler
11. Poll for transaction receipt
12. Display result with explorer link

## API Reference

### Storage Module

```typescript
saveSmartAccountData(data: object): void
getSmartAccountData(): object | null
clearSmartAccountData(): void
```

### Smart Account Module

```typescript
deriveSmartAccountAddress(
  admin: Address,
  factory: Address,
  data: `0x${string}`,
  network: string
): Promise<Address>

getUserOpHash(userOp: UserOperation, entryPoint: Address, chainId: number): Hash
formatUserOpForBundler(userOp: UserOperation): object
bundlerRpc(method: string, params: any[], url: string): Promise<any>
getTokenBalance(token: Address, account: Address, network: string): Promise<bigint>
```

## Contributing

### Adding Networks or Tokens

Network and token requests are now handled through our built-in community dashboard. Visit the "Community Network Requests" section in the application to submit or vote on network additions.




## Security Considerations

All wallet operations are handled client-side through secure wallet connections. No private keys or sensitive data are stored or transmitted to external servers. 
## Technology Stack

- Next.js 15
- TypeScript
- Thirdweb SDK
- Viem (Ethereum interactions)
- Tailwind CSS
- Lucide React

## License

MIT

## Author

Rilsosing
