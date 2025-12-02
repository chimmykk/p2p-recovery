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
import type { Wallet } from 'thirdweb/wallets';
import { client } from './thirdwebClient';


// Contract ABIs
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
        // First check if the contract exists at the address
        const code = await publicClient.getBytecode({ address: factoryAddress });
        if (!code || code === '0x') {
            const error = new Error('Factory not deployed on this network yet');
            (error as any).isHandled = true;
            throw error;
        }

        const smartAccountAddress = await publicClient.readContract({
            address: factoryAddress,
            abi: ACCOUNT_FACTORY_ABI,
            functionName: 'getAddress',
            args: [adminAddress, data],
        });

        // Check if the result is valid (not empty)
        if (!smartAccountAddress || smartAccountAddress === '0x' || smartAccountAddress === '0x0000000000000000000000000000000000000000') {
            const error = new Error('Factory not deployed on this network yet');
            (error as any).isHandled = true;
            throw error;
        }

        return smartAccountAddress as Address;
    } catch (error: any) {
        if ((error as any).isHandled) {
            throw error;
        }
        // Just handle all errors 
        if (error?.message?.includes('returned no data') ||
            error?.message?.includes('does not have the function') ||
            error?.message?.includes('address is not a contract') ||
            error?.name === 'ContractFunctionExecutionError') {
            const friendlyError = new Error('Factory not deployed on this network yet');
            (friendlyError as any).isHandled = true;
            throw friendlyError;
        }

        const genericError = new Error('Failed to derive smart account address');
        (genericError as any).isHandled = true;
        throw genericError;
    }
}



// Helper to sign userOpHash using the connected thirdweb wallet/address
export async function signUserOpHashWithThirdwebWallet(
    wallet: Wallet,
    userOpHash: `0x${string}`
): Promise<`0x${string}`> {
    // Get the owner/admin account from the wallet (the account that controls the smart account)
    let ownerAccount = null;

    // Try getAdminAccount first (for smart accounts, this gets the owner)
    if (wallet.getAdminAccount) {
        try {
            ownerAccount = await wallet.getAdminAccount();
        } catch (e) {
            // Fall through to getAccount
        }
    }

    // Fallback to getAccount (the connected wallet account)
    if (!ownerAccount) {
        ownerAccount = wallet.getAccount();
    }

    if (!ownerAccount) {
        throw new Error('No owner account found in wallet');
    }

    // Sign using owner account's signMessage
    try {
        const sig = await ownerAccount.signMessage({
            message: { raw: userOpHash },
        });
        if (typeof sig === "string" && sig.startsWith("0x")) {
            return sig as `0x${string}`;
        }
    } catch (error) {
        // Fall through to error
    }

    throw new Error(
        `Unable to get raw signature for ERC-4337 UserOperation from owner account ${ownerAccount.address}. ` +
        "checks for lgs."
    );
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

// Get Thirdweb Paymaster data for sponsored transactions
export async function getThirdwebPaymasterData(
    userOp: any,
    entryPoint: Address,
    chainId: number
): Promise<{ paymasterAndData: `0x${string}` }> {
    try {
        const clientId = client.clientId;
        if (!clientId) {
            console.warn('No Thirdweb client ID found, skipping paymaster');
            return { paymasterAndData: '0x' as `0x${string}` };
        }

        // Thirdweb paymaster endpoint
        const paymasterUrl = `https://${chainId}.bundler.thirdweb.com/${clientId}`;

        const response = await fetch(paymasterUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'pm_sponsorUserOperation',
                params: [
                    {
                        sender: userOp.sender,
                        nonce: toHex(userOp.nonce),
                        initCode: userOp.initCode,
                        callData: userOp.callData,
                        callGasLimit: toHex(userOp.callGasLimit),
                        verificationGasLimit: toHex(userOp.verificationGasLimit),
                        preVerificationGas: toHex(userOp.preVerificationGas),
                        maxFeePerGas: toHex(userOp.maxFeePerGas),
                        maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
                    },
                    entryPoint,
                ],
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.warn('Paymaster sponsorship failed:', data.error);
            return { paymasterAndData: '0x' as `0x${string}` };
        }

        if (data.result?.paymasterAndData) {
            console.log('✅ Gas sponsored by Thirdweb paymaster');
            return { paymasterAndData: data.result.paymasterAndData as `0x${string}` };
        }

        return { paymasterAndData: '0x' as `0x${string}` };
    } catch (error) {
        console.warn('Error getting paymaster data:', error);
        return { paymasterAndData: '0x' as `0x${string}` };
    }
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
    networkKey: NetworkKey
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

// Deploy smart account using thirdweb wallet (follows same pattern as token transfers)
export async function deploySmartAccountWithWallet(
    wallet: Wallet,
    smartAccountAddress: Address,
    networkKey: NetworkKey = 'monad'
): Promise<{ success: boolean; txHash?: string; userOpHash?: string; error?: string }> {
    try {
        const network = NETWORKS[networkKey];

        // Check if already deployed
        const deployed = await isAccountDeployed(smartAccountAddress, networkKey);
        if (deployed) {
            return { success: false, error: 'Account is already deployed' };
        }

        // Get the owner/admin account from the wallet
        let ownerAccount = null;

        // Try getAdminAccount first (for smart accounts, this gets the owner)
        if (wallet.getAdminAccount) {
            try {
                ownerAccount = await wallet.getAdminAccount();
            } catch (e) {
                // Fall through to getAccount
            }
        }

        // Fallback to getAccount (the connected wallet account)
        if (!ownerAccount) {
            ownerAccount = wallet.getAccount();
        }

        if (!ownerAccount || !ownerAccount.address) {
            return {
                success: false,
                error: 'No owner account found in wallet'
            };
        }

        const ownerAddress = ownerAccount.address as Address;

        // Create public client
        const publicClient = createPublicClient({
            chain: network.chain,
            transport: http(network.chain.rpcUrls.default.http[0]),
        });

        // Generate initCode using owner address
        const initCode = getInitCode(network.factoryAddress, ownerAddress);

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

        // Get paymaster data from Thirdweb (for sponsored gas)
        try {
            const paymasterData = await getThirdwebPaymasterData(
                userOp,
                network.entryPoint,
                network.chain.id
            );
            userOp.paymasterAndData = paymasterData.paymasterAndData;
        } catch (e: any) {
            console.warn('Failed to get paymaster data, user will pay gas:', e.message);
        }

        // Sign UserOperation using Thirdweb wallet
        userOp.signature = '0x' as `0x${string}`;
        const userOpHash = getUserOpHash(userOp, network.entryPoint, network.chain.id);

        const signature = await signUserOpHashWithThirdwebWallet(
            wallet,
            userOpHash
        );
        userOp.signature = signature;

        // Submit to bundler
        const formattedUserOp = formatUserOpForBundler(userOp);
        let userOpHashResult: string;
        try {
            userOpHashResult = await bundlerRpc('eth_sendUserOperation', [
                formattedUserOp,
                network.entryPoint,
            ], network.bundlerUrl);
        } catch (bundlerError: any) {
            // Check for prefund error
            const errorMessage = bundlerError.message || JSON.stringify(bundlerError);
            if (errorMessage.includes('didn\'t pay prefund') || errorMessage.includes('AA21')) {
                return {
                    success: false,
                    error: 'Fund your smart account address'
                };
            }
            throw bundlerError; // Re-throw if not a prefund error
        }

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
        console.error('Error deploying smart account with wallet:', error);
        
        // Check for prefund error
        const errorMessage = error.message || JSON.stringify(error);
        if (errorMessage.includes('didn\'t pay prefund') || errorMessage.includes('AA21')) {
            return {
                success: false,
                error: 'Fund your smart account address'
            };
        }
        
        return {
            success: false,
            error: error.message || 'Failed to deploy smart account'
        };
    }
}

