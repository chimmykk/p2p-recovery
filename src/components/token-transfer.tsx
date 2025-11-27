'use client'

import { useState, useEffect } from 'react'
import { Address, encodeFunctionData, createPublicClient, http } from 'viem'
import {
    getPrivateKey,
    getSmartAccountData
} from '@/lib/storage'
import {
    getAccountFromPrivateKey,
    ERC20_ABI,
    SMART_ACCOUNT_ABI,
    ENTRY_POINT_ABI,
    getUserOpHash,
    formatUserOpForBundler,
    bundlerRpc,
    getTokenBalance,
    isAccountDeployed,
    getInitCode
} from '@/lib/smart-account'
import { Send, ArrowRight, Loader2, CheckCircle, AlertCircle, Copy, X, AlertTriangle } from 'lucide-react'
import { NETWORKS, NETWORK_LABELS, type NetworkKey } from '@/lib/network'

const DUMMY_SIGNATURE = '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'

interface TokenTransferProps {
    network: NetworkKey;
}

export function TokenTransfer({ network }: TokenTransferProps) {
    const [recipient, setRecipient] = useState('')
    const [amount, setAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [txHash, setTxHash] = useState('')
    const [smartAccountAddress, setSmartAccountAddress] = useState('')
    const [balance, setBalance] = useState('0')
    const [hasPrivateKey, setHasPrivateKey] = useState(false)
    const [showFundingModal, setShowFundingModal] = useState(false)
    const [fundingAddress, setFundingAddress] = useState<string>('')

    useEffect(() => {
        const loadData = () => {
            const key = getPrivateKey()
            setHasPrivateKey(!!key)

            const accountData = getSmartAccountData()
            if (accountData?.smartAccountAddress) {
                setSmartAccountAddress(accountData.smartAccountAddress)
                fetchBalance(accountData.smartAccountAddress as Address)
            }
        }

        // Load initial data
        loadData()

        // Listen for storage changes (when PrivateKeyManager saves data)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'p2p_recovery_smart_account' || e.key === 'p2p_recovery_private_key') {
                loadData()
            }
        }

        // Listen for custom event from same window (storage event doesn't fire in same tab)
        const handleCustomUpdate = () => {
            loadData()
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('smartAccountUpdated', handleCustomUpdate)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('smartAccountUpdated', handleCustomUpdate)
        }
    }, [])

    // Refresh balance when network changes
    useEffect(() => {
        if (smartAccountAddress) {
            fetchBalance(smartAccountAddress as Address)
        }
    }, [network])

    const fetchBalance = async (address: Address) => {
        try {
            const networkConfig = NETWORKS[network];
            const bal = await getTokenBalance(networkConfig.usdcAddress, address, network)
            const divisor = Math.pow(10, networkConfig.usdcDecimals)
            setBalance((Number(bal) / divisor).toFixed(2))
        } catch (err) {
            console.error('Error fetching balance:', err)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setSuccess('Address copied to clipboard!')
        setTimeout(() => setSuccess(''), 2000)
    }

    const handleTransfer = async () => {
        setError('')
        setSuccess('')
        setTxHash('')

        // Validation
        if (!hasPrivateKey) {
            setError('Please save a private key first')
            return
        }

        if (!smartAccountAddress) {
            setError('Please derive your smart account address first')
            return
        }

        if (!recipient || !recipient.startsWith('0x')) {
            setError('Invalid recipient address')
            return
        }

        if (!amount || parseFloat(amount) <= 0) {
            setError('Invalid amount')
            return
        }

        const networkConfig = NETWORKS[network];
        const multiplier = Math.pow(10, networkConfig.usdcDecimals)
        const transferAmount = BigInt(Math.round(parseFloat(amount) * multiplier))
        const currentBalance = BigInt(Math.round(parseFloat(balance) * multiplier))

        if (transferAmount > currentBalance) {
            setError(`Insufficient balance. You have ${balance} USDC`)
            return
        }

        setIsLoading(true)

        try {
            const privateKey = getPrivateKey()
            if (!privateKey) throw new Error('Private key not found')

            const signer = getAccountFromPrivateKey(privateKey)

            // Create public client
            const publicClient = createPublicClient({
                chain: networkConfig.chain,
                transport: http(networkConfig.chain.rpcUrls.default.http[0]),
            })

            // Check if account is deployed
            const deployed = await isAccountDeployed(smartAccountAddress as Address, network)

            // Generate initCode if account is not deployed
            let initCode: `0x${string}` = '0x'
            if (!deployed) {
                initCode = getInitCode(networkConfig.factoryAddress, signer.address)
                console.log('Account not deployed, including initCode for deployment')
            }

            // Get nonce
            const nonce = await publicClient.readContract({
                address: networkConfig.entryPoint,
                abi: ENTRY_POINT_ABI,
                functionName: 'getNonce',
                args: [smartAccountAddress as Address, 0n],
            })

            // Encode transfer call
            const transferCallData = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [recipient as Address, transferAmount],
            })

            // Wrap in smart account execute
            const executeCallData = encodeFunctionData({
                abi: SMART_ACCOUNT_ABI,
                functionName: 'execute',
                args: [networkConfig.usdcAddress, 0n, transferCallData],
            })

            // Get gas prices from Pimlico
            let maxFeePerGas: bigint
            let maxPriorityFeePerGas: bigint

            try {
                const gasPrices = await bundlerRpc('pimlico_getUserOperationGasPrice', [], networkConfig.bundlerUrl)
                maxFeePerGas = BigInt(gasPrices.standard.maxFeePerGas)
                maxPriorityFeePerGas = BigInt(gasPrices.standard.maxPriorityFeePerGas)
            } catch (e) {
                console.warn('Failed to get Pimlico gas prices, using fallback:', e)
                maxFeePerGas = 1500000000n; // 1.5 gwei minimum
                maxPriorityFeePerGas = 1500000000n;
            }

            // Build UserOperation
            let userOp = {
                sender: smartAccountAddress,
                nonce: nonce,
                initCode: initCode, // Use generated initCode if not deployed
                callData: executeCallData,
                callGasLimit: 300000n,
                verificationGasLimit: deployed ? 300000n : 1000000n, // Higher for deployment
                preVerificationGas: 500000n,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                paymasterAndData: '0x' as `0x${string}`,
                signature: DUMMY_SIGNATURE as `0x${string}`,
            }

            // Estimate gas
            try {
                const gasEstimate = await bundlerRpc('eth_estimateUserOperationGas', [
                    formatUserOpForBundler(userOp),
                    networkConfig.entryPoint,
                ], networkConfig.bundlerUrl)

                if (gasEstimate) {
                    userOp.callGasLimit = BigInt(gasEstimate.callGasLimit || '0x493e0')
                    userOp.verificationGasLimit = BigInt(gasEstimate.verificationGasLimit || '0x493e0')
                    userOp.preVerificationGas = BigInt(gasEstimate.preVerificationGas || '0x7a120')
                }
            } catch (e: any) {
                console.warn('Gas estimation failed, using defaults:', e.message)
            }

            // Sign UserOperation
            userOp.signature = '0x' as `0x${string}`
            const userOpHash = getUserOpHash(userOp, networkConfig.entryPoint, networkConfig.chain.id)
            const signature = await signer.signMessage({
                message: { raw: userOpHash },
            })
            userOp.signature = signature

            // Submit to bundler
            const formattedUserOp = formatUserOpForBundler(userOp)
            const userOpHashResult = await bundlerRpc('eth_sendUserOperation', [
                formattedUserOp,
                networkConfig.entryPoint,
            ], networkConfig.bundlerUrl)

            setSuccess(`Transaction submitted! UserOp Hash: ${userOpHashResult}`)

            // Wait for receipt
            let receipt = null
            let attempts = 0

            while (!receipt && attempts < 30) {
                await new Promise(r => setTimeout(r, 2000))
                try {
                    receipt = await bundlerRpc('eth_getUserOperationReceipt', [userOpHashResult], networkConfig.bundlerUrl)
                } catch (e) {
                    // Receipt not ready yet
                }
                attempts++
            }

            if (receipt) {
                setTxHash(receipt.receipt?.transactionHash || '')
                const deployMsg = !deployed ? ' (Account deployed and transfer completed!)' : ''
                setSuccess(`Transfer successful! ${amount} USDC sent to ${recipient}${deployMsg}`)

                // Refresh balance
                await fetchBalance(smartAccountAddress as Address)

                // Reset form
                setRecipient('')
                setAmount('')

                // Notify components to refresh deployment status
                window.dispatchEvent(new Event('smartAccountUpdated'))
            } else {
                setSuccess(`Transaction pending. Check explorer for UserOp: ${userOpHashResult}`)
            }

        } catch (err: any) {
            const errorMessage = err.message || 'Failed to transfer tokens'
            // Check if it's an AA21 error (insufficient gas)
            if (errorMessage.includes('AA21') || errorMessage.includes("didn't pay prefund")) {
                setFundingAddress(smartAccountAddress)
                setShowFundingModal(true)
            } else {
                setError(errorMessage)
            }
            console.error('Transfer error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    if (!hasPrivateKey || !smartAccountAddress) {
        return (
            <div className="bg-white border-4 border-black rounded-2xl p-8 text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gray-200 border-3 border-black rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-black" />
                    </div>
                </div>
                <h3 className="text-xl font-black text-black mb-2">SETUP REQUIRED</h3>
                <p className="text-gray-700 font-medium">
                    Please save your private key and derive your smart account address to enable token transfers.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white border-4 border-black rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <span className="px-3 py-1 bg-blue-400 text-black text-xs font-bold rounded-full border-2 border-black">
                        TRANSFER
                    </span>
                    <h2 className="text-xl font-black text-black mt-2">SEND USDC</h2>
                </div>
            </div>

            <div className="space-y-4">
                {/* Balance Display */}
                <div className="p-4 bg-green-100 rounded-xl border-3 border-black">
                    <p className="text-sm text-black font-bold mb-1">AVAILABLE BALANCE</p>
                    <p className="text-3xl font-black text-black">${balance}</p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">USDC on {NETWORK_LABELS[network]}</p>
                </div>

                {/* Recipient Input */}
                <div>
                    <label className="block text-sm font-bold text-black mb-2">
                        RECIPIENT ADDRESS
                    </label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 bg-gray-50 border-3 border-black rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                    />
                </div>

                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-bold text-black mb-2">
                        AMOUNT (USDC)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-3 bg-gray-50 border-3 border-black rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                        />
                        <button
                            onClick={() => setAmount(balance)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-bold bg-blue-400 hover:bg-blue-500 text-black rounded-lg border-2 border-black transition-colors"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {/* Transfer Button */}
                <button
                    onClick={handleTransfer}
                    disabled={isLoading}
                    className="w-full px-6 py-4 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-400 text-black font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-lg border-3 border-black"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            PROCESSING...
                        </>
                    ) : (
                        <>
                            SEND USDC
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>

                {/* Transaction Hash */}
                {txHash && (
                    <div className="p-4 bg-green-100 border-3 border-green-500 rounded-xl">
                        <p className="text-sm text-black font-bold mb-1">TRANSACTION HASH</p>
                        <a
                            href={`${NETWORKS[network].chain.blockExplorers.default.url}/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-black font-mono break-all hover:text-green-700 transition-colors underline"
                        >
                            {txHash}
                        </a>
                    </div>
                )}
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-100 border-3 border-red-500 rounded-xl text-red-700 mt-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {success && !error && (
                <div className="flex items-center gap-3 p-4 bg-green-100 border-3 border-green-500 rounded-xl text-green-700 mt-4">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-bold">{success}</p>
                </div>
            )}

            {/* Funding Modal */}
            {showFundingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowFundingModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-black" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-orange-400 border-3 border-black rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-black" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-black text-black text-center mb-2">
                            INSUFFICIENT GAS FUNDS
                        </h3>

                        {/* Message */}
                        <p className="text-center text-gray-700 font-medium mb-4">
                            Your smart account needs native tokens ({NETWORKS[network].chain.nativeCurrency.symbol}) to pay for transaction gas fees.
                        </p>

                        {/* Address Box */}
                        <div className="bg-orange-50 border-3 border-orange-500 rounded-xl p-4 mb-4">
                            <p className="text-sm font-bold text-black mb-2">FUND THIS ADDRESS:</p>
                            <div className="bg-white border-2 border-black rounded-lg p-3 mb-3">
                                <p className="text-black font-mono text-sm break-all">{fundingAddress}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(fundingAddress)}
                                className="w-full px-4 py-2 bg-orange-400 hover:bg-orange-500 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border-2 border-black"
                            >
                                <Copy className="w-4 h-4" />
                                COPY ADDRESS
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 border-3 border-blue-500 rounded-xl p-4 mb-4">
                            <p className="text-sm font-bold text-black mb-2">INSTRUCTIONS:</p>
                            <ol className="text-sm text-gray-700 font-medium space-y-1 list-decimal list-inside">
                                <li>Send {NETWORKS[network].chain.nativeCurrency.symbol} to the address above</li>
                                <li>Wait for the transaction to confirm</li>
                                <li>Try your transfer again</li>
                            </ol>
                        </div>

                        {/* Network Info */}
                        <div className="text-center">
                            <p className="text-xs text-gray-600 font-medium">
                                Network: <span className="font-bold text-black">{NETWORKS[network].chain.name}</span>
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowFundingModal(false)}
                            className="w-full mt-4 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-black font-bold rounded-xl transition-colors border-3 border-black"
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
