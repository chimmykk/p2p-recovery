'use client'

import { useState, useEffect } from 'react'
import { Address } from 'viem'
import {
    savePrivateKey,
    getPrivateKey,
    clearPrivateKey,
    isValidPrivateKey,
    formatPrivateKey,
    saveSmartAccountData,
    getSmartAccountData
} from '@/lib/storage'
import {
    getAccountFromPrivateKey,
    deriveSmartAccountAddress,
    getTokenBalance,
    isAccountDeployed,
    deploySmartAccount,
    ERC20_ABI,
    SMART_ACCOUNT_ABI,
    ENTRY_POINT_ABI,
    getUserOpHash,
    formatUserOpForBundler,
    bundlerRpc,
    getInitCode
} from '@/lib/smart-account'
import { Key, Trash2, Wallet, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Rocket, Copy, X, AlertTriangle, ArrowDownLeft } from 'lucide-react'
import { NETWORKS, type NetworkKey, NETWORK_LABELS } from '@/lib/network'
import { encodeFunctionData, createPublicClient, http, Address as ViemAddress } from 'viem'

const DUMMY_SIGNATURE = '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'

interface PrivateKeyManagerProps {
    network: NetworkKey;
}

export function PrivateKeyManager({ network }: PrivateKeyManagerProps) {
    const [privateKey, setPrivateKey] = useState('')
    const [showPrivateKey, setShowPrivateKey] = useState(false)
    const [hasStoredKey, setHasStoredKey] = useState(false)
    const [ownerAddress, setOwnerAddress] = useState<string>('')
    const [smartAccountAddress, setSmartAccountAddress] = useState<string>('')
    const [factoryAddress, setFactoryAddress] = useState('0xdE320c2E2b4953883f61774c006f9057A55B97D1')
    const [factoryData, setFactoryData] = useState('0x')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string>('')
    const [success, setSuccess] = useState<string>('')
    const [balance, setBalance] = useState<string>('0')
    const [isDeployed, setIsDeployed] = useState<boolean | null>(null)
    const [isDeploying, setIsDeploying] = useState(false)
    const [deployTxHash, setDeployTxHash] = useState<string>('')
    const [showFundingModal, setShowFundingModal] = useState(false)
    const [fundingAddress, setFundingAddress] = useState<string>('')
    const [withdrawAmount, setWithdrawAmount] = useState<string>('')
    const [isWithdrawing, setIsWithdrawing] = useState(false)
    const [withdrawTxHash, setWithdrawTxHash] = useState<string>('')

    useEffect(() => {
        // Check if there's a stored private key
        const stored = getPrivateKey()
        if (stored) {
            setHasStoredKey(true)
            setPrivateKey(stored)
            loadAccountInfo(stored)
        }

        // Load saved account data
        const accountData = getSmartAccountData()
        if (accountData) {
            if (accountData.ownerAddress) setOwnerAddress(accountData.ownerAddress)
            if (accountData.smartAccountAddress) setSmartAccountAddress(accountData.smartAccountAddress)
        }
    }, [])

    // Refresh balance and check deployment when network changes
    useEffect(() => {
        if (smartAccountAddress) {
            fetchBalance(smartAccountAddress as Address)
            checkDeployment(smartAccountAddress as Address)
        }
    }, [network, smartAccountAddress])

    const loadAccountInfo = async (key: string) => {
        try {
            const account = getAccountFromPrivateKey(key)
            setOwnerAddress(account.address)

            const accountData = getSmartAccountData()
            if (accountData?.smartAccountAddress) {
                setSmartAccountAddress(accountData.smartAccountAddress)
                await fetchBalance(accountData.smartAccountAddress as Address)
            }
        } catch (err) {
            console.error('Error loading account info:', err)
        }
    }

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

    const checkDeployment = async (address: Address) => {
        try {
            const deployed = await isAccountDeployed(address, network)
            setIsDeployed(deployed)
        } catch (err) {
            console.error('Error checking deployment:', err)
            setIsDeployed(null)
        }
    }

    const handleSavePrivateKey = () => {
        setError('')
        setSuccess('')

        if (!privateKey.trim()) {
            setError('Please enter a private key')
            return
        }

        if (!isValidPrivateKey(privateKey)) {
            setError('Invalid private key format. Must be 64 hex characters (with or without 0x prefix)')
            return
        }

        try {
            const formattedKey = formatPrivateKey(privateKey)
            savePrivateKey(formattedKey)
            setHasStoredKey(true)
            setSuccess('Private key saved successfully!')

            // Get owner address
            const account = getAccountFromPrivateKey(formattedKey)
            setOwnerAddress(account.address)

            saveSmartAccountData({
                privateKey: formattedKey,
                ownerAddress: account.address
            })

            // Notify other components
            window.dispatchEvent(new Event('smartAccountUpdated'))
        } catch (err) {
            setError('Failed to save private key')
        }
    }

    const handleClearPrivateKey = () => {
        if (confirm('Are you sure you want to clear the private key? This action cannot be undone.')) {
            clearPrivateKey()
            setPrivateKey('')
            setHasStoredKey(false)
            setOwnerAddress('')
            setSmartAccountAddress('')
            setBalance('0')
            setSuccess('Private key cleared successfully!')

            // Notify other components
            window.dispatchEvent(new Event('smartAccountUpdated'))
        }
    }

    const handleDeriveSmartAccount = async () => {
        setError('')
        setSuccess('')
        setIsLoading(true)

        if (!hasStoredKey) {
            setError('Please save a private key first')
            setIsLoading(false)
            return
        }

        if (!factoryAddress || !factoryAddress.startsWith('0x')) {
            setError('Invalid factory address')
            setIsLoading(false)
            return
        }

        try {
            const account = getAccountFromPrivateKey(privateKey)
            const smartAccount = await deriveSmartAccountAddress(
                account.address as Address,
                factoryAddress as Address,
                factoryData as `0x${string}`,
                network
            )


            setSmartAccountAddress(smartAccount)
            saveSmartAccountData({
                smartAccountAddress: smartAccount
            })

            // Notify other components that smart account was updated
            window.dispatchEvent(new Event('smartAccountUpdated'))

            // Fetch balance and check deployment
            await fetchBalance(smartAccount)
            await checkDeployment(smartAccount)

            setSuccess('Smart account address derived successfully!')
        } catch (err: any) {
            setError(err.message || 'Failed to derive smart account address')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeployAccount = async () => {
        setError('')
        setSuccess('')
        setDeployTxHash('')
        setIsDeploying(true)

        if (!hasStoredKey || !smartAccountAddress) {
            setError('Please derive your smart account address first')
            setIsDeploying(false)
            return
        }

        try {
            const result = await deploySmartAccount(privateKey, smartAccountAddress as Address, network)

            if (result.success) {
                setSuccess('Smart account deployed successfully!')
                setDeployTxHash(result.txHash || '')
                setIsDeployed(true)

                // Notify other components
                window.dispatchEvent(new Event('smartAccountUpdated'))

                // Refresh balance
                await fetchBalance(smartAccountAddress as Address)
            } else {
                // Check if it's an AA21 error (insufficient gas)
                if (result.error && (result.error.includes('AA21') || result.error.includes("didn't pay prefund"))) {
                    setFundingAddress(smartAccountAddress)
                    setShowFundingModal(true)
                } else {
                    setError(result.error || 'Failed to deploy smart account')
                }
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to deploy smart account'
            // Check if it's an AA21 error (insufficient gas)
            if (errorMessage.includes('AA21') || errorMessage.includes("didn't pay prefund")) {
                setFundingAddress(smartAccountAddress)
                setShowFundingModal(true)
            } else {
                setError(errorMessage)
            }
        } finally {
            setIsDeploying(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setSuccess('Address copied to clipboard!')
        setTimeout(() => setSuccess(''), 2000)
    }

    const handleWithdraw = async () => {
        setError('')
        setSuccess('')
        setWithdrawTxHash('')

        // Validation
        if (!hasStoredKey || !smartAccountAddress || !ownerAddress) {
            setError('Please derive your smart account address first')
            return
        }

        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
            setError('Invalid withdrawal amount')
            return
        }

        const networkConfig = NETWORKS[network];
        const multiplier = Math.pow(10, networkConfig.usdcDecimals)
        const transferAmount = BigInt(Math.round(parseFloat(withdrawAmount) * multiplier))
        const currentBalance = BigInt(Math.round(parseFloat(balance) * multiplier))

        if (transferAmount > currentBalance) {
            setError(`Insufficient balance. You have ${balance} USDC`)
            return
        }

        setIsWithdrawing(true)

        try {
            const signer = getAccountFromPrivateKey(privateKey)

            // Create public client
            const publicClient = createPublicClient({
                chain: networkConfig.chain,
                transport: http(networkConfig.chain.rpcUrls.default.http[0]),
            })

            // Check if account is deployed
            const deployed = await isAccountDeployed(smartAccountAddress as ViemAddress, network)

            // Generate initCode if account is not deployed
            let initCode: `0x${string}` = '0x'
            if (!deployed) {
                initCode = getInitCode(networkConfig.factoryAddress, signer.address)
            }

            // Get nonce
            const nonce = await publicClient.readContract({
                address: networkConfig.entryPoint,
                abi: ENTRY_POINT_ABI,
                functionName: 'getNonce',
                args: [smartAccountAddress as ViemAddress, 0n],
            })

            // Encode transfer call to owner address
            const transferCallData = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [ownerAddress as ViemAddress, transferAmount],
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
                maxFeePerGas = 1500000000n;
                maxPriorityFeePerGas = 1500000000n;
            }

            // Build UserOperation
            let userOp = {
                sender: smartAccountAddress,
                nonce: nonce,
                initCode: initCode,
                callData: executeCallData,
                callGasLimit: 300000n,
                verificationGasLimit: deployed ? 300000n : 1000000n,
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

            setSuccess(`Withdrawal submitted! UserOp Hash: ${userOpHashResult}`)

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
                setWithdrawTxHash(receipt.receipt?.transactionHash || '')
                const deployMsg = !deployed ? ' (Account deployed and withdrawal completed!)' : ''
                setSuccess(`Withdrawal successful! ${withdrawAmount} USDC sent to owner${deployMsg}`)

                // Refresh balance
                await fetchBalance(smartAccountAddress as ViemAddress)

                // Reset form
                setWithdrawAmount('')

                // Notify components to refresh deployment status
                window.dispatchEvent(new Event('smartAccountUpdated'))
            } else {
                setSuccess(`Withdrawal pending. Check explorer for UserOp: ${userOpHashResult}`)
            }

        } catch (err: any) {
            const errorMessage = err.message || 'Failed to withdraw tokens'
            // Check if it's an AA21 error (insufficient gas)
            if (errorMessage.includes('AA21') || errorMessage.includes("didn't pay prefund")) {
                setFundingAddress(smartAccountAddress)
                setShowFundingModal(true)
            } else {
                setError(errorMessage)
            }
            console.error('Withdrawal error:', err)
        } finally {
            setIsWithdrawing(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Private Key Input Section */}
            <div className="bg-white border-4 border-black rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <span className="px-3 py-1 bg-green-400 text-black text-xs font-bold rounded-full border-2 border-black">
                            SETUP
                        </span>
                        <h2 className="text-xl font-black text-black mt-2">PRIVATE KEY MANAGEMENT</h2>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type={showPrivateKey ? 'text' : 'password'}
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            placeholder="Enter your private key (0x...)"
                            className="w-full px-4 py-3 bg-gray-50 border-3 border-black rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 pr-12 font-medium"
                        />
                        <button
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-gray-600 transition-colors"
                        >
                            {showPrivateKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSavePrivateKey}
                            className="flex-1 px-4 py-3 bg-green-400 hover:bg-green-500 text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border-3 border-black"
                        >
                            <Key className="w-4 h-4" />
                            SAVE KEY
                        </button>

                        {hasStoredKey && (
                            <button
                                onClick={handleClearPrivateKey}
                                className="px-4 py-3 bg-red-400 hover:bg-red-500 text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border-3 border-black"
                            >
                                <Trash2 className="w-4 h-4" />
                                CLEAR
                            </button>
                        )}
                    </div>

                    {hasStoredKey && (
                        <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                            <CheckCircle className="w-4 h-4" />
                            <span>KEY STORED IN BROWSER</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Owner Address Display */}
            {ownerAddress && (
                <div className="bg-white border-4 border-black rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-400 border-3 border-black rounded-lg flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-black" />
                        </div>
                        <h3 className="text-lg font-black text-black">OWNER ADDRESS</h3>
                    </div>
                    <p className="text-black font-mono text-sm break-all bg-gray-100 p-3 rounded-lg border-2 border-black">{ownerAddress}</p>
                </div>
            )}

            {/* Smart Account Derivation Section */}
            {hasStoredKey && (
                <div className="bg-white border-4 border-black rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <span className="px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full border-2 border-black">
                                ACCOUNT
                            </span>
                            <h2 className="text-xl font-black text-black mt-2">SMART ACCOUNT</h2>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                FACTORY ADDRESS
                            </label>
                            <input
                                type="text"
                                value={factoryAddress}
                                onChange={(e) => setFactoryAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-gray-50 border-3 border-black rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                FACTORY DATA (BYTES)
                            </label>
                            <input
                                type="text"
                                value={factoryData}
                                onChange={(e) => setFactoryData(e.target.value)}
                                placeholder="0x (empty for default)"
                                className="w-full px-4 py-3 bg-gray-50 border-3 border-black rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
                            />
                            <p className="text-xs text-gray-600 mt-1 font-medium">Optional: Leave as 0x for default initialization</p>
                        </div>

                        <button
                            onClick={handleDeriveSmartAccount}
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border-3 border-black"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    DERIVING...
                                </>
                            ) : (
                                <>
                                    DERIVE ACCOUNT
                                </>
                            )}
                        </button>

                        {smartAccountAddress && (
                            <div className="mt-4 space-y-3">
                                <div className="p-4 bg-blue-100 rounded-xl border-3 border-black">
                                    <p className="text-sm text-black font-bold mb-1">SMART ACCOUNT ADDRESS</p>
                                    <p className="text-black font-mono text-sm break-all">{smartAccountAddress}</p>
                                </div>

                                {/* Deployment Status Indicator */}
                                <div className={`p-4 rounded-xl border-3 ${isDeployed === true ? 'bg-green-100 border-green-500' : isDeployed === false ? 'bg-orange-100 border-orange-500' : 'bg-gray-100 border-gray-500'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-black font-bold mb-1">DEPLOYMENT STATUS</p>
                                            <div className="flex items-center gap-2">
                                                {isDeployed === true ? (
                                                    <>
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        <span className="text-black font-bold">DEPLOYED</span>
                                                    </>
                                                ) : isDeployed === false ? (
                                                    <>
                                                        <AlertCircle className="w-5 h-5 text-orange-600" />
                                                        <span className="text-black font-bold">NOT DEPLOYED</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                                                        <span className="text-black font-bold">CHECKING...</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {isDeployed === false && (
                                            <button
                                                onClick={handleDeployAccount}
                                                disabled={isDeploying}
                                                className="px-4 py-2 bg-orange-400 hover:bg-orange-500 disabled:bg-gray-400 text-black font-bold rounded-lg transition-all duration-200 flex items-center gap-2 border-2 border-black"
                                            >
                                                {isDeploying ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        DEPLOYING...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Rocket className="w-4 h-4" />
                                                        DEPLOY
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {isDeployed === false && (
                                        <p className="text-xs text-gray-700 mt-2 font-medium">
                                            ⚠️ Your account needs to be deployed on-chain before you can transfer tokens.
                                        </p>
                                    )}
                                </div>

                                {/* Transaction Hash */}
                                {deployTxHash && (
                                    <div className="p-4 bg-green-100 border-3 border-green-500 rounded-xl">
                                        <p className="text-sm text-black font-bold mb-1">DEPLOYMENT TX HASH</p>
                                        <a
                                            href={`${NETWORKS[network].chain.blockExplorers.default.url}/tx/${deployTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-black font-mono break-all hover:text-green-700 transition-colors underline"
                                        >
                                            {deployTxHash}
                                        </a>
                                    </div>
                                )}

                                <div className="p-4 bg-green-100 rounded-xl border-3 border-black">
                                    <p className="text-sm text-black font-bold mb-1">USDC BALANCE</p>
                                    <p className="text-2xl font-black text-black">${balance}</p>
                                </div>

                                {/* Withdraw to Owner Section */}
                                {isDeployed && parseFloat(balance) > 0 && (
                                    <div className="p-4 bg-purple-50 border-3 border-purple-500 rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ArrowDownLeft className="w-5 h-5 text-purple-600" />
                                            <p className="text-sm text-black font-bold">WITHDRAW TO OWNER</p>
                                        </div>
                                        <p className="text-xs text-gray-700 font-medium mb-3">
                                            Send USDC from smart account to owner address
                                        </p>

                                        {/* Amount Input */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-bold text-black mb-1">
                                                AMOUNT (USDC)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={withdrawAmount}
                                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium text-sm"
                                                />
                                                <button
                                                    onClick={() => setWithdrawAmount(balance)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold bg-purple-400 hover:bg-purple-500 text-black rounded border border-black transition-colors"
                                                >
                                                    MAX
                                                </button>
                                            </div>
                                        </div>

                                        {/* Withdraw Button */}
                                        <button
                                            onClick={handleWithdraw}
                                            disabled={isWithdrawing}
                                            className="w-full px-4 py-2 bg-purple-400 hover:bg-purple-500 disabled:bg-gray-400 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border-2 border-black text-sm"
                                        >
                                            {isWithdrawing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    WITHDRAWING...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowDownLeft className="w-4 h-4" />
                                                    WITHDRAW TO OWNER
                                                </>
                                            )}
                                        </button>

                                        {/* Withdraw Transaction Hash */}
                                        {withdrawTxHash && (
                                            <div className="mt-3 p-3 bg-green-100 border-2 border-green-500 rounded-lg">
                                                <p className="text-xs text-black font-bold mb-1">TX HASH</p>
                                                <a
                                                    href={`${NETWORKS[network].chain.blockExplorers.default.url}/tx/${withdrawTxHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-black font-mono break-all hover:text-green-700 transition-colors underline"
                                                >
                                                    {withdrawTxHash}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error/Success Messages */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-100 border-3 border-red-500 rounded-xl text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 bg-green-100 border-3 border-green-500 rounded-xl text-green-700">
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
                            Your smart account needs native tokens ({NETWORKS[network].chain.nativeCurrency.symbol}) to pay for deployment gas fees.
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
                                <li>Click the DEPLOY button again</li>
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
