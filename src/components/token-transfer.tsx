'use client'

import { useState, useEffect } from 'react'
import { Address, encodeFunctionData, createPublicClient, http } from 'viem'
import {
    getSmartAccountData
} from '@/lib/storage'
import {
    ERC20_ABI,
    SMART_ACCOUNT_ABI,
    ENTRY_POINT_ABI,
    getUserOpHash,
    formatUserOpForBundler,
    bundlerRpc,
    getTokenBalance,
    isAccountDeployed,
    getInitCode,
    signUserOpHashWithThirdwebWallet
} from '@/lib/smart-account'
import { ArrowRight, Loader2, CheckCircle, AlertCircle, Copy, X, AlertTriangle, ChevronDown } from 'lucide-react'
import { NETWORKS, NETWORK_LABELS, type NetworkKey } from '@/lib/network'
import { useActiveAccount, useActiveWallet } from 'thirdweb/react'

const DUMMY_SIGNATURE = '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'

interface TokenInfo {
    symbol: string
    name: string
    address: string
    balance: string
    balanceRaw: string
    decimals: number
    imgUrl?: string
    price?: number
    balanceUSD?: number
}

interface TokenTransferProps {
    network: NetworkKey;
}

export function TokenTransfer({ network }: TokenTransferProps) {
    const account = useActiveAccount()
    const wallet = useActiveWallet()
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
    const [showFundingModal, setShowFundingModal] = useState(false)
    const [fundingAddress, setFundingAddress] = useState<string>('')
    const [tokens, setTokens] = useState<TokenInfo[]>([])
    const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
    const [isLoadingTokens, setIsLoadingTokens] = useState(false)
    const [showTokenSelector, setShowTokenSelector] = useState(false)
    const [fetchMethod, setFetchMethod] = useState<'free' | 'paid'>('free')

    useEffect(() => {
        const loadData = () => {
            if (account?.address) {
                setOwnerAddress(account.address)
            }

            const accountData = getSmartAccountData()
            if (accountData?.smartAccountAddress) {
                setSmartAccountAddress(accountData.smartAccountAddress)
                // Balance will be fetched by the network/smartAccountAddress useEffect
            }
            if (account?.address && !accountData?.ownerAddress) {
                setOwnerAddress(account.address)
            } else if (accountData?.ownerAddress) {
                setOwnerAddress(accountData.ownerAddress)
            }
        }

        // Load initial data
        loadData()

        // Listen for storage changes (when SmartAccountDisplay saves data)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'p2p_recovery_smart_account') {
                loadData()
            }
        }

        // Listen for custom event from same window (storage event doesn't fire in same tab)
        const handleCustomUpdate = () => {
            loadData()
        }

        // Listen for network changes
        const handleNetworkChange = () => {
            // Reset balance and wait 
            setBalance('0')
            // Small delay to allow SmartAccountDisplay to update first
            setTimeout(() => {
                loadData()
            }, 100)
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('smartAccountUpdated', handleCustomUpdate)
        window.addEventListener('networkChanged', handleNetworkChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('smartAccountUpdated', handleCustomUpdate)
            window.removeEventListener('networkChanged', handleNetworkChange)
        }
    }, [account?.address, network])

    // Refresh balance when network changes or smart account address changes
    useEffect(() => {
        if (smartAccountAddress) {
            // Reset balance first
            setBalance('0')
            // Then fetch new balance for the new network
            const address = smartAccountAddress as Address
            const networkConfig = NETWORKS[network]
            getTokenBalance(networkConfig.usdcAddress, address, network)
                .then((bal) => {
                    const divisor = Math.pow(10, networkConfig.usdcDecimals)
                    setBalance((Number(bal) / divisor).toFixed(2))
                })
                .catch((err) => {
                    console.error('Error fetching balance:', err)
                    setBalance('0')
                })
        } else {
            // Clear balance if no smart account address
            setBalance('0')
        }
    }, [network, smartAccountAddress])

    // Reset token state when network changes
    useEffect(() => {
        // Clear all token-related state when network changes
        setTokens([])
        setSelectedToken(null)
        setBalance('0')
        setShowTokenSelector(false)
        setError('')
        setSuccess('')
    }, [network])

    // Auto-fetch tokens when smart account address or network changes
    useEffect(() => {
        if (smartAccountAddress && !isLoadingTokens) {
            // Small delay to avoid multiple rapid calls
            const timer = setTimeout(() => {
                fetchTokens(fetchMethod)
            }, 500)
            
            return () => clearTimeout(timer)
        }
    }, [smartAccountAddress, network, fetchMethod])

    const fetchBalance = async (address: Address) => {
        if (!address) {
            setBalance('0')
            return
        }
        try {
            const networkConfig = NETWORKS[network];
            const bal = await getTokenBalance(networkConfig.usdcAddress, address, network)
            const divisor = Math.pow(10, networkConfig.usdcDecimals)
            setBalance((Number(bal) / divisor).toFixed(2))
        } catch (err) {
            console.error('Error fetching balance:', err)
            setBalance('0')
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setSuccess('Address copied to clipboard!')
        setTimeout(() => setSuccess(''), 2000)
    }

    const fetchTokens = async (method: 'free' | 'paid' = 'free') => {
        if (!smartAccountAddress) {
            setError('Please derive your smart account address first')
            return
        }

        // Clear old token data before fetching new ones
        setTokens([])
        setSelectedToken(null)
        setIsLoadingTokens(true)
        setError('')
        
        try {
            const endpoint = method === 'free' ? '/api/tokenfetch/nativeandusdc' : '/api/tokenfetch/otherstoken'
            const networkConfig = NETWORKS[network]
            
            const body = { 
                address: smartAccountAddress, 
                chainId: networkConfig.chain.id 
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                throw new Error('Failed to fetch tokens')
            }

            const data = await response.json()
            const fetchedTokens = data.tokens || []
            
            setTokens(fetchedTokens)
            
            // Auto-select USDC if available
            const usdcToken = fetchedTokens.find((t: TokenInfo) => 
                t.address.toLowerCase() === networkConfig.usdcAddress.toLowerCase()
            )
            if (usdcToken) {
                setSelectedToken(usdcToken)
                setBalance(usdcToken.balance)
            } else if (fetchedTokens.length > 0) {
                setSelectedToken(fetchedTokens[0])
                setBalance(fetchedTokens[0].balance)
            }

            // Optionally show success message only if tokens found
            if (fetchedTokens.length > 0) {
                console.log(`Found ${fetchedTokens.length} token(s) using ${method === 'free' ? 'Native & USDC' : 'Zapper API'}`)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch tokens')
            console.error('Error fetching tokens:', err)
        } finally {
            setIsLoadingTokens(false)
        }
    }

    const handleTransfer = async () => {
        setError('')
        setSuccess('')
        setTxHash('')

        // Validation
        if (!wallet || !account) {
            setError('Please connect your wallet first')
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
        
        // Use selected token or fallback to USDC
        const tokenToTransfer = selectedToken || {
            address: networkConfig.usdcAddress,
            decimals: networkConfig.usdcDecimals,
            symbol: 'USDC'
        }
        
        const multiplier = Math.pow(10, tokenToTransfer.decimals)
        const transferAmount = BigInt(Math.round(parseFloat(amount) * multiplier))
        const currentBalance = BigInt(Math.round(parseFloat(balance) * multiplier))

        if (transferAmount > currentBalance) {
            setError(`Insufficient balance. You have ${balance} ${tokenToTransfer.symbol}`)
            return
        }

        setIsLoading(true)

        try {
            if (!wallet || !account) {
                throw new Error('Wallet not connected')
            }

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
                initCode = getInitCode(networkConfig.factoryAddress, account.address as Address)
                console.log('Account not deployed, including initCode for deployment')
            }

            // Get nonce
            const nonce = await publicClient.readContract({
                address: networkConfig.entryPoint,
                abi: ENTRY_POINT_ABI,
                functionName: 'getNonce',
                args: [smartAccountAddress as Address, 0n],
            })

            // Check if this is a native token transfer (address is 0x0000...)
            const isNativeToken = tokenToTransfer.address === "0x0000000000000000000000000000000000000000"
            
            let executeCallData: `0x${string}`
            
            if (isNativeToken) {
                // For native token, send value directly without calldata
                executeCallData = encodeFunctionData({
                    abi: SMART_ACCOUNT_ABI,
                    functionName: 'execute',
                    args: [finalRecipient as Address, transferAmount, '0x' as `0x${string}`],
                })
            } else {
                // For ERC20 tokens, encode transfer call
                const transferCallData = encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: 'transfer',
                    args: [finalRecipient as Address, transferAmount],
                })

                // Wrap in smart account execute
                executeCallData = encodeFunctionData({
                    abi: SMART_ACCOUNT_ABI,
                    functionName: 'execute',
                    args: [tokenToTransfer.address as Address, 0n, transferCallData],
                })
            }

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

            // Sign UserOperation using Thirdweb wallet (owner account, not smart account)
            // The owner account is the one that controls the smart account
            userOp.signature = '0x' as `0x${string}`
            const userOpHash = getUserOpHash(userOp, networkConfig.entryPoint, networkConfig.chain.id)

            // Get owner account address (the connected wallet address that controls the smart account)
            let ownerAddress = account.address as Address
            if (wallet.getAdminAccount) {
                try {
                    const adminAccount = await wallet.getAdminAccount()
                    if (adminAccount?.address) {
                        ownerAddress = adminAccount.address as Address
                    }
                } catch (e) {
                    console.warn('Could not get admin account, using connected account:', e)
                }
            }

            const signature = await signUserOpHashWithThirdwebWallet(
                wallet,
                userOpHash
            )
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
                    ? `Recovery successful! ${amount} ${tokenToTransfer.symbol} sent to owner address`
                    : `Transfer successful! ${amount} ${tokenToTransfer.symbol} sent to ${finalRecipient}`
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

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 md:p-6 shadow-soft">
            <div className="flex items-center justify-between mb-5 md:mb-6">
                <div>
                    <span className="px-3 py-1 bg-info/10 text-info-dark dark:text-info text-xs font-medium rounded-full border border-info/20">
                        Transfer
                    </span>
                    <h2 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">Token Transfer</h2>
                </div>
                {isLoadingTokens && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Loading tokens...</span>
                    </div>
                )}
            </div>

            {/* Fetch Method Selector */}
            <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">Token Fetch Method:</p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setFetchMethod('free')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                            fetchMethod === 'free'
                                ? 'bg-[#8984d9] text-white shadow-sm'
                                : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                        }`}
                    >
                        Native &amp; USDC
                    </button>
                    <button
                        type="button"
                        onClick={() => setFetchMethod('paid')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                            fetchMethod === 'paid'
                                ? 'bg-[#8984d9] text-white shadow-sm'
                                : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                        }`}
                    >
                        Other Tokens
                    </button>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    {fetchMethod === 'free' 
                        ? 'Fetches native token and USDC balances'
                        : 'Complete portfolio scan via Zapper (more comprehensive)'
                    }
                </p>
            </div>

            <div className="space-y-4">
                {/* Token Selector */}
                {tokens.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Select Token
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setShowTokenSelector(!showTokenSelector)}
                                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-left flex items-center justify-between hover:border-brand-500 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {selectedToken?.imgUrl && (
                                        <img src={selectedToken.imgUrl} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                            {selectedToken?.symbol || 'Select Token'}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {selectedToken?.name || 'No token selected'}
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showTokenSelector ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Token Dropdown */}
                            {showTokenSelector && (
                                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {tokens.map((token) => (
                                        <button
                                            key={token.address}
                                            onClick={() => {
                                                setSelectedToken(token)
                                                setBalance(token.balance)
                                                setShowTokenSelector(false)
                                            }}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-700 last:border-b-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                {token.imgUrl && (
                                                    <img src={token.imgUrl} alt={token.symbol} className="w-6 h-6 rounded-full" />
                                                )}
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{token.symbol}</p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{token.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                                    {parseFloat(token.balance).toFixed(2)}
                                                </p>
                                                {token.balanceUSD && (
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        ${token.balanceUSD.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Balance Display */}
                <div className="p-4 bg-gradient-to-br from-success-light to-success-light/50 dark:from-success-dark/20 dark:to-success-dark/10 rounded-lg border border-success/20">
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Available Balance</p>
                    <p className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                        {parseFloat(balance).toFixed(2)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {selectedToken?.symbol || 'USDC'} on {NETWORK_LABELS[network]}
                    </p>
                    {selectedToken?.balanceUSD && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            ≈ ${selectedToken.balanceUSD.toFixed(2)} USD
                        </p>
                    )}
                </div>

                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Amount ({selectedToken?.symbol || 'USDC'})
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
                            onClick={() => setAmount(parseFloat(balance).toFixed(2))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-white rounded-md transition-colors"
                            style={{ backgroundColor: '#8984d9' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7469ce'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8984d9'}
                        >
                            Max
                        </button>
                    </div>
                </div>

                {/* Recipient Input */}
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
                        disabled={transferMode === 'recover'}
                    />
                    
                    {/* Recover to Owner Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (transferMode === 'recover') {
                                setTransferMode('send')
                                setRecipient('')
                            } else {
                                setTransferMode('recover')
                                setRecipient(ownerAddress)
                            }
                            setError('')
                            setSuccess('')
                        }}
                        className={`mt-3 w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            transferMode === 'recover'
                                ? 'bg-[#8984d9] text-white shadow-md'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                    >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        {transferMode === 'recover' ? 'Recovering to Owner' : 'Recover to Owner'}
                    </button>
                    
                    {transferMode === 'recover' && (
                        <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Owner Address:</p>
                            <p className="text-neutral-900 dark:text-neutral-50 font-mono text-xs break-all">{ownerAddress || 'Not available'}</p>
                        </div>
                    )}
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
                    ) : (
                        <>
                            {transferMode === 'recover' ? (
                                <>
                                    <ArrowRight className="w-5 h-5 rotate-180" />
                                    Recover to Owner
                                </>
                            ) : (
                                <>
                                    Send {selectedToken?.symbol || 'Token'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
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
                <div className="flex items-start gap-3 p-4 bg-error-light dark:bg-error-dark/20 border border-error/30 rounded-lg text-error-dark dark:text-error-light mt-4 overflow-hidden">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium break-all overflow-wrap-anywhere flex-1">{error}</p>
                </div>
            )}

            {success && !error && (
                <div className="flex items-start gap-3 p-4 bg-success-light dark:bg-success-dark/20 border border-success/30 rounded-lg text-success-dark dark:text-success-light mt-4 overflow-hidden">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium break-all overflow-wrap-anywhere flex-1">{success}</p>
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
