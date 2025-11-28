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
    const [transferMode, setTransferMode] = useState<'send' | 'recover'>('send')
    const [recipient, setRecipient] = useState('')
    const [amount, setAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [txHash, setTxHash] = useState('')
    const [smartAccountAddress, setSmartAccountAddress] = useState('')
    const [ownerAddress, setOwnerAddress] = useState('')
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
            if (accountData?.ownerAddress) {
                setOwnerAddress(accountData.ownerAddress)
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

        // For recover mode, use owner address as recipient
        const finalRecipient = transferMode === 'recover' ? ownerAddress : recipient

        if (!finalRecipient || !finalRecipient.startsWith('0x')) {
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
                args: [finalRecipient as Address, transferAmount],
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
                const actionMsg = transferMode === 'recover'
                    ? `Recovery successful! ${amount} USDC sent to owner address`
                    : `Transfer successful! ${amount} USDC sent to ${finalRecipient}`
                setSuccess(`${actionMsg}${deployMsg}`)

                // Refresh balance
                await fetchBalance(smartAccountAddress as Address)

                // Reset form
                if (transferMode === 'send') {
                    setRecipient('')
                }
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
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 md:p-10 text-center shadow-soft">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-neutral-400" />
                    </div>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">Setup Required</h3>
                <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-400">
                    Please save your private key and derive your smart account address to enable token transfers.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 md:p-6 shadow-soft">
            <div className="flex items-center justify-between mb-5 md:mb-6">
                <div>
                    <span className="px-3 py-1 bg-info/10 text-info-dark dark:text-info text-xs font-medium rounded-full border border-info/20">
                        Transfer
                    </span>
                    <h2 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">Token Transfer</h2>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <button
                    onClick={() => {
                        setTransferMode('send')
                        setError('')
                        setSuccess('')
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-md"
                    style={{
                        backgroundColor: transferMode === 'send' ? '#8984d9' : '#f5f5f5',
                        color: transferMode === 'send' ? '#ffffff' : '#737373'
                    }}
                    onMouseEnter={(e) => {
                        if (transferMode !== 'send') {
                            e.currentTarget.style.backgroundColor = '#e5e5e5'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (transferMode !== 'send') {
                            e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }
                    }}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        Send USDC
                    </div>
                </button>
                <button
                    onClick={() => {
                        setTransferMode('recover')
                        setError('')
                        setSuccess('')
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-md"
                    style={{
                        backgroundColor: transferMode === 'recover' ? '#8984d9' : '#f5f5f5',
                        color: transferMode === 'recover' ? '#ffffff' : '#737373'
                    }}
                    onMouseEnter={(e) => {
                        if (transferMode !== 'recover') {
                            e.currentTarget.style.backgroundColor = '#e5e5e5'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (transferMode !== 'recover') {
                            e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }
                    }}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        <span className="hidden sm:inline">Recover to Owner</span>
                        <span className="sm:hidden">Recover</span>
                    </div>
                </button>
            </div>

            {/* Mode Description */}
            <div className={`p-3 rounded-lg border mb-5 ${transferMode === 'send'
                ? 'bg-info-light dark:bg-info-dark/20 border-info/20'
                : 'bg-brand-50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800'
                }`}>
                <p className="text-xs md:text-sm text-neutral-700 dark:text-neutral-300">
                    {transferMode === 'send'
                        ? 'Send USDC from your smart account to any address'
                        : 'Recover USDC from your smart account back to your owner wallet'
                    }
                </p>
            </div>

            <div className="space-y-4">
                {/* Balance Display */}
                <div className="p-4 bg-gradient-to-br from-success-light to-success-light/50 dark:from-success-dark/20 dark:to-success-dark/10 rounded-lg border border-success/20">
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Available Balance</p>
                    <p className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">${balance}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">USDC on {NETWORK_LABELS[network]}</p>
                </div>

                {/* Recipient Input */}
                {transferMode === 'send' ? (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Recipient Address
                        </label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="0x..."
                            className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Recovery Destination
                        </label>
                        <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Owner Address (Auto-filled)</p>
                            <p className="text-neutral-900 dark:text-neutral-50 font-mono text-sm break-all">{ownerAddress || 'Not available'}</p>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Funds will be recovered to your owner address</p>
                    </div>
                )}

                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Amount (USDC)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                            onClick={() => setAmount(balance)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-white rounded-md transition-colors"
                            style={{ backgroundColor: '#8984d9' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7469ce'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8984d9'}
                        >
                            Max
                        </button>
                    </div>
                </div>

                {/* Transfer Button */}
                <button
                    onClick={handleTransfer}
                    disabled={isLoading}
                    className="w-full px-6 py-3 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-md"
                    style={{ backgroundColor: isLoading ? '#d6d6d7' : '#8984d9' }}
                    onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#7469ce')}
                    onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#8984d9')}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
                            <span className="text-neutral-600">Processing...</span>
                        </>
                    ) : transferMode === 'send' ? (
                        <>
                            Send USDC
                            <ArrowRight className="w-5 h-5" />
                        </>
                    ) : (
                        <>
                            <ArrowRight className="w-5 h-5 rotate-180" />
                            <span className="hidden sm:inline">Recover to Owner</span>
                            <span className="sm:hidden">Recover</span>
                        </>
                    )}
                </button>

                {/* Transaction Hash */}
                {txHash && (
                    <div className="p-3 sm:p-4 bg-success-light dark:bg-success-dark/20 border border-success/30 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Transaction Hash</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => copyToClipboard(txHash)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md hover:border-success transition-colors text-xs font-medium text-neutral-700 dark:text-neutral-300"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Copy</span>
                                </button>
                                <a
                                    href={`${NETWORKS[network].chain.blockExplorers.default.url}/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-success dark:bg-success-dark border border-success/30 rounded-md hover:bg-success-dark transition-colors text-xs font-medium text-white"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="hidden sm:inline">View</span>
                                </a>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-2.5">
                            {/* Mobile: Truncated hash */}
                            <p className="sm:hidden text-xs text-neutral-900 dark:text-neutral-50 font-mono">
                                {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                            </p>
                            {/* Desktop: Full hash */}
                            <p className="hidden sm:block text-xs text-neutral-900 dark:text-neutral-50 font-mono break-all">
                                {txHash}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-error-light dark:bg-error-dark/20 border border-error/30 rounded-lg text-error-dark dark:text-error-light mt-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {success && !error && (
                <div className="flex items-center gap-3 p-4 bg-success-light dark:bg-success-dark/20 border border-success/30 rounded-lg text-success-dark dark:text-success-light mt-4">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{success}</p>
                </div>
            )}

            {/* Funding Modal */}
            {showFundingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 relative shadow-strong max-h-[90vh] overflow-y-auto animate-fade-in">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowFundingModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-warning/10 border border-warning/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-warning" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 text-center mb-2">
                            Insufficient Gas Funds
                        </h3>

                        {/* Message */}
                        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mb-5">
                            Your smart account needs native tokens ({NETWORKS[network].chain.nativeCurrency.symbol}) to pay for transaction gas fees.
                        </p>

                        {/* Address Box */}
                        <div className="bg-warning-light dark:bg-warning-dark/20 border border-warning/30 rounded-lg p-4 mb-4">
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">Fund this address:</p>
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-3">
                                <p className="text-neutral-900 dark:text-neutral-50 font-mono text-xs break-all">{fundingAddress}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(fundingAddress)}
                                className="w-full px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                                style={{ backgroundColor: '#8984d9' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7469ce'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8984d9'}
                            >
                                <Copy className="w-4 h-4" />
                                Copy Address
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="bg-info-light dark:bg-info-dark/20 border border-info/30 rounded-lg p-4 mb-4">
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">Instructions:</p>
                            <ol className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1.5 list-decimal list-inside">
                                <li>Send {NETWORKS[network].chain.nativeCurrency.symbol} to the address above</li>
                                <li>Wait for the transaction to confirm</li>
                                <li>Try your transfer again</li>
                            </ol>
                        </div>

                        {/* Network Info */}
                        <div className="text-center mb-4">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Network: <span className="font-medium text-neutral-900 dark:text-neutral-50">{NETWORKS[network].chain.name}</span>
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowFundingModal(false)}
                            className="w-full px-4 py-2.5 text-neutral-900 dark:text-neutral-50 text-sm font-semibold rounded-lg transition-colors"
                            style={{ backgroundColor: '#d6d6d7' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c5c5c6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d6d6d7'}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
