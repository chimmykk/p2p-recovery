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

// Check if smart account is deployed
export async function isAccountDeployed(
    accountAddress: Address,
    networkKey: NetworkKey = 'monad'
): Promise<boolean> {
    const network = NETWORKS[networkKey];
    const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(network.chain.rpcUrls.default.http[0]),
    });

    try {
        const code = await publicClient.getBytecode({ address: accountAddress });
        return !!(code && code !== '0x');
    } catch (error) {
        console.error('Error checking account deployment:', error);
        return false;
    }
}

// Generate initCode for account deployment
export function getInitCode(factoryAddress: Address, ownerAddress: Address): `0x${string}` {
    const createAccountCallData = encodeFunctionData({
        abi: parseAbi(['function createAccount(address owner, bytes data) returns (address)']),
        functionName: 'createAccount',
        args: [ownerAddress, '0x'], // Empty bytes for data parameter
    });

    // initCode = factory address + createAccount calldata
    return (factoryAddress.toLowerCase() + createAccountCallData.slice(2)) as `0x${string}`;
}

// Deploy smart account
export async function deploySmartAccount(
    privateKey: string,
    smartAccountAddress: Address,
    networkKey: NetworkKey = 'monad'
): Promise<{ success: boolean; txHash?: string; userOpHash?: string; error?: string }> {
    try {
        const network = NETWORKS[networkKey];
        const signer = privateKeyToAccount(privateKey as `0x${string}`);

        // Check if already deployed
        const deployed = await isAccountDeployed(smartAccountAddress, networkKey);
        if (deployed) {
            return { success: false, error: 'Account is already deployed' };
        }

        // Create public client
        const publicClient = createPublicClient({
            chain: network.chain,
            transport: http(network.chain.rpcUrls.default.http[0]),
        });

        // Generate initCode
        const initCode = getInitCode(network.factoryAddress, signer.address);

        // Get nonce
        const nonce = await publicClient.readContract({
            address: network.entryPoint,
            abi: ENTRY_POINT_ABI,
            functionName: 'getNonce',
            args: [smartAccountAddress, 0n],
        });

        // Get gas prices from Pimlico
        let maxFeePerGas: bigint;
        let maxPriorityFeePerGas: bigint;

        try {
            const gasPrices = await bundlerRpc('pimlico_getUserOperationGasPrice', [], network.bundlerUrl);
            maxFeePerGas = BigInt(gasPrices.standard.maxFeePerGas);
            maxPriorityFeePerGas = BigInt(gasPrices.standard.maxPriorityFeePerGas);
        } catch (e) {
            console.warn('Failed to get bundler gas prices, using fallback');
            maxFeePerGas = 1500000000n; // 1.5 gwei minimum
            maxPriorityFeePerGas = 1500000000n;
        }

        // Dummy signature for gas estimation
        const DUMMY_SIG = '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c';

        // Build UserOperation for deployment (empty callData - just deploy)
        let userOp = {
            sender: smartAccountAddress,
            nonce: nonce,
            initCode: initCode,
            callData: '0x' as `0x${string}`, // Empty call - just deploy
            callGasLimit: 100000n,
            verificationGasLimit: 1000000n, // Higher for deployment
            preVerificationGas: 500000n,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            paymasterAndData: '0x' as `0x${string}`,
            signature: DUMMY_SIG as `0x${string}`,
        };

        // Estimate gas
        try {
            const gasEstimate = await bundlerRpc('eth_estimateUserOperationGas', [
                formatUserOpForBundler(userOp),
                network.entryPoint,
            ], network.bundlerUrl);

            if (gasEstimate) {
                userOp.callGasLimit = BigInt(gasEstimate.callGasLimit || '0x186a0');
                userOp.verificationGasLimit = BigInt(gasEstimate.verificationGasLimit || '0xf4240');
                userOp.preVerificationGas = BigInt(gasEstimate.preVerificationGas || '0x7a120');
            }
        } catch (e: any) {
            console.warn('Gas estimation failed, using defaults:', e.message);
        }

        // Sign UserOperation
        userOp.signature = '0x' as `0x${string}`;
        const userOpHash = getUserOpHash(userOp, network.entryPoint, network.chain.id);
        const signature = await signer.signMessage({
            message: { raw: userOpHash },
        });
        userOp.signature = signature;

        // Submit to bundler
        const formattedUserOp = formatUserOpForBundler(userOp);
        const userOpHashResult = await bundlerRpc('eth_sendUserOperation', [
            formattedUserOp,
            network.entryPoint,
        ], network.bundlerUrl);

        // Wait for receipt
        let receipt = null;
        let attempts = 0;

        while (!receipt && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            try {
                receipt = await bundlerRpc('eth_getUserOperationReceipt', [userOpHashResult], network.bundlerUrl);
            } catch (e) {
                // Receipt not ready yet
            }
            attempts++;
        }

        if (receipt && receipt.success) {
            return {
                success: true,
                txHash: receipt.receipt?.transactionHash,
                userOpHash: userOpHashResult
            };
        } else {
            return {
                success: false,
                error: 'Deployment transaction pending or failed',
                userOpHash: userOpHashResult
            };
        }

    } catch (error: any) {
        console.error('Error deploying smart account:', error);
        return {
            success: false,
            error: error.message || 'Failed to deploy smart account'
        };
    }
}
