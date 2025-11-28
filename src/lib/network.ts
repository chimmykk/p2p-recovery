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

// Define Polygon Mainnet
export const polygonChain = defineChain({
    id: 137,
    name: 'Polygon',
    nativeCurrency: {
        decimals: 18,
        name: 'MATIC',
        symbol: 'MATIC',
    },
    rpcUrls: {
        default: {
            http: ['https://polygon-rpc.com'],
        },
        public: {
            http: ['https://polygon-rpc.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'PolygonScan',
            url: 'https://polygonscan.com',
        },
    },
    testnet: false,
});

// Define Optimism Mainnet
export const optimismChain = defineChain({
    id: 10,
    name: 'Optimism',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['https://optimism-public.nodies.app'],
        },
        public: {
            http: ['https://optimism-public.nodies.app'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Optimism Explorer',
            url: 'https://optimistic.etherscan.io',
        },
    },
    testnet: false,
});

// Network configuration type
export type NetworkConfig = {
    chain: typeof monadMainnet | typeof bnbChain | typeof avalancheChain | typeof polygonChain | typeof optimismChain;
    bundlerUrl: string;
    entryPoint: Address;
    factoryAddress: Address;
    usdcAddress: Address;
    usdcDecimals: number;
};

// Network key type
export type NetworkKey = 'monad' | 'bnb' | 'avax' | 'polygon' | 'optimism';

// Network configurations
export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
    monad: {
        chain: monadMainnet,
        bundlerUrl: 'https://api.pimlico.io/v2/143/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        factoryAddress: '0xdE320c2E2b4953883f61774c006f9057A55B97D1' as Address,
        usdcAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' as Address,
        usdcDecimals: 6,
    },
    bnb: {
        chain: bnbChain,
        bundlerUrl: 'https://api.pimlico.io/v2/56/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        factoryAddress: '0xdE320c2E2b4953883f61774c006f9057A55B97D1' as Address,
        usdcAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address,
        usdcDecimals: 18,
    },
    avax: {
        chain: avalancheChain,
        bundlerUrl: 'https://api.pimlico.io/v2/43114/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        factoryAddress: '0xdE320c2E2b4953883f61774c006f9057A55B97D1' as Address,
        usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as Address,
        usdcDecimals: 6,
    },
    polygon: {
        chain: polygonChain,
        bundlerUrl: 'https://api.pimlico.io/v2/137/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        factoryAddress: '0xdE320c2E2b4953883f61774c006f9057A55B97D1' as Address,
        usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Address,
        usdcDecimals: 6,
    },
    optimism: {
        chain: optimismChain,
        bundlerUrl: 'https://api.pimlico.io/v2/10/rpc?apikey=pim_DgBeb1uoMpzzV4RG1Kxy6E',
        entryPoint: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789' as Address,
        factoryAddress: '0xdE320c2E2b4953883f61774c006f9057A55B97D1' as Address,
        usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as Address,
        usdcDecimals: 6,
    },
};

// Network display labels
export const NETWORK_LABELS: Record<NetworkKey, string> = {
    monad: 'Monad',
    bnb: 'BNB Smart Chain',
    avax: 'Avalanche',
    polygon: 'Polygon',
    optimism: 'Optimism',
};

// Network chain IDs
export const NETWORK_CHAIN_IDS: Record<NetworkKey, number> = {
    monad: 143,
    bnb: 56,
    avax: 43114,
    polygon: 137,
    optimism: 10,
};
