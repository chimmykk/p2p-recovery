import { defineChain, Address } from 'viem';

// Define Monad Mainnet
export const monadMainnet = defineChain({
    id: 143,
    name: 'Monad Mainnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc3.monad.xyz'],
        },
        public: {
            http: ['https://rpc3.monad.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Monad Explorer',
            url: 'https://mainnet-beta.monvision.io',
        },
    },
    testnet: false,
});

// Define BNB Smart Chain
export const bnbChain = defineChain({
    id: 56,
    name: 'BNB Smart Chain',
    nativeCurrency: {
        decimals: 18,
        name: 'BNB',
        symbol: 'BNB',
    },
    rpcUrls: {
        default: {
            http: ['https://bsc-dataseed1.binance.org'],
        },
        public: {
            http: ['https://bsc-dataseed1.binance.org'],
        },
    },
    blockExplorers: {
        default: {
            name: 'BscScan',
            url: 'https://bscscan.com',
        },
    },
    testnet: false,
});

// Define Avalanche C-Chain
export const avalancheChain = defineChain({
    id: 43114,
    name: 'Avalanche C-Chain',
    nativeCurrency: {
        decimals: 18,
        name: 'Avalanche',
        symbol: 'AVAX',
    },
    rpcUrls: {
        default: {
            http: ['https://avax.api.pocket.network'],
        },
        public: {
            http: ['https://avax.api.pocket.network'],
        },
    },
    blockExplorers: {
        default: {
            name: 'SnowTrace',
            url: 'https://snowtrace.io',
        },
    },
    testnet: false,
});

// Network configuration type
export type NetworkConfig = {
    chain: typeof monadMainnet | typeof bnbChain | typeof avalancheChain;
    bundlerUrl: string;
    entryPoint: Address;
    usdcAddress: Address;
    usdcDecimals: number;
};

// Network key type
export type NetworkKey = 'monad' | 'bnb' | 'avax';

// Network configurations
export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
    monad: {
        chain: monadMainnet,
        bundlerUrl: 'https://api.pimlico.io/v2/143/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        usdcAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' as Address,
        usdcDecimals: 6,
    },
    bnb: {
        chain: bnbChain,
        bundlerUrl: 'https://api.pimlico.io/v2/56/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        usdcAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address,
        usdcDecimals: 18,
    },
    avax: {
        chain: avalancheChain,
        bundlerUrl: 'https://api.pimlico.io/v2/43114/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as Address,
        usdcDecimals: 6,
    },
};

// Network display labels
export const NETWORK_LABELS: Record<NetworkKey, string> = {
    monad: 'Monad',
    bnb: 'BNB Smart Chain',
    avax: 'Avalanche',
};

// Network chain IDs
export const NETWORK_CHAIN_IDS: Record<NetworkKey, number> = {
    monad: 143,
    bnb: 56,
    avax: 43114,
};
