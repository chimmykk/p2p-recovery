import {
    createPublicClient,
    http,
    encodeFunctionData,
    keccak256,
    encodeAbiParameters,
    toHex,
    parseAbi,
    Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORKS, type NetworkKey } from './network';


// ABIs
export const ENTRY_POINT_ABI = [
    {
        inputs: [
            { name: 'sender', type: 'address' },
            { name: 'key', type: 'uint192' }
        ],
        name: 'getNonce',
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

export const ERC20_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
]);

export const SMART_ACCOUNT_ABI = parseAbi([
    'function execute(address dest, uint256 value, bytes calldata func)',
    'function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func)',
]);

// Account Factory ABI for deriving smart account address
export const ACCOUNT_FACTORY_ABI = [
    {
        name: 'getAddress',
        type: 'function',
        inputs: [
            { name: 'admin', type: 'address' },
            { name: 'data', type: 'bytes' }
        ],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view'
    },
    {
        name: 'createAccount',
        type: 'function',
        inputs: [
            { name: 'admin', type: 'address' },
            { name: 'data', type: 'bytes' }
        ],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'nonpayable'
    }
] as const;

// Helper function to derive smart account address
export async function deriveSmartAccountAddress(
    adminAddress: Address,
    factoryAddress: Address,
    data: `0x${string}` = '0x',
    networkKey: NetworkKey = 'monad'
): Promise<Address> {
    const network = NETWORKS[networkKey];
    const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(network.chain.rpcUrls.default.http[0]),
    });

    try {
        const smartAccountAddress = await publicClient.readContract({
            address: factoryAddress,
            abi: ACCOUNT_FACTORY_ABI,
            functionName: 'getAddress',
            args: [adminAddress, data],
        });

        return smartAccountAddress as Address;
    } catch (error) {
        console.error('Error deriving smart account address:', error);
        throw error;
    }
}

// Helper function to get account from private key
export function getAccountFromPrivateKey(privateKey: string) {
    try {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        return account;
    } catch (error) {
        console.error('Error creating account from private key:', error);
        throw error;
    }
}

// Pack UserOperation for hashing (ERC-4337 v0.6)
function packUserOp(userOp: any) {
    return encodeAbiParameters(
        [
            { type: 'address' },
            { type: 'uint256' },
            { type: 'bytes32' },
            { type: 'bytes32' },
            { type: 'uint256' },
            { type: 'uint256' },
            { type: 'uint256' },
            { type: 'uint256' },
            { type: 'uint256' },
            { type: 'bytes32' },
        ],
        [
            userOp.sender,
            userOp.nonce,
            keccak256(userOp.initCode),
            keccak256(userOp.callData),
            userOp.callGasLimit,
            userOp.verificationGasLimit,
            userOp.preVerificationGas,
            userOp.maxFeePerGas,
            userOp.maxPriorityFeePerGas,
            keccak256(userOp.paymasterAndData),
        ]
    );
}

// Calculate UserOperation hash
export function getUserOpHash(userOp: any, entryPoint: Address, chainId: number) {
    const packed = packUserOp(userOp);
    const userOpHash = keccak256(packed);

    return keccak256(
        encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }],
            [userOpHash, entryPoint, BigInt(chainId)]
        )
    );
}

// Format UserOp for bundler (convert BigInts to hex strings)
export function formatUserOpForBundler(userOp: any) {
    return {
        sender: userOp.sender,
        nonce: toHex(userOp.nonce),
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: toHex(userOp.callGasLimit),
        verificationGasLimit: toHex(userOp.verificationGasLimit),
        preVerificationGas: toHex(userOp.preVerificationGas),
        maxFeePerGas: toHex(userOp.maxFeePerGas),
        maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature,
    };
}

// JSON-RPC call helper
export async function bundlerRpc(method: string, params: any[], bundlerRpcUrl: string) {
    const response = await fetch(bundlerRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
        }),
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(`Bundler RPC Error: ${JSON.stringify(data.error)}`);
    }
    return data.result;
}

// Get token balance
export async function getTokenBalance(
    tokenAddress: Address,
    accountAddress: Address,
    networkKey: NetworkKey = 'monad'
): Promise<bigint> {
    const network = NETWORKS[networkKey];
    const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(network.chain.rpcUrls.default.http[0]),
    });

    const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [accountAddress],
    });

    return balance;
}
