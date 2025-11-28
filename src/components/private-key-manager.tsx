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
    deploySmartAccount
} from '@/lib/smart-account'
import { Key, Trash2, Wallet, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Rocket, Copy, X, AlertTriangle } from 'lucide-react'
import { NETWORKS, type NetworkKey } from '@/lib/network'

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


    return (
        <div className="space-y-5 md:space-y-6">
            {/* Private Key Input Section */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 md:p-6 shadow-soft">
                <div className="flex items-center justify-between mb-4 md:mb-5">
                    <div>
                        <span className="px-3 py-1 bg-success/10 text-success-dark dark:text-success text-xs font-medium rounded-full border border-success/20">
                            Setup
                        </span>
                        <h2 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">Private Key Management</h2>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type={showPrivateKey ? 'text' : 'password'}
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            placeholder="Enter your private key (0x...)"
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 pr-12"
                        />
                        <button
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            {showPrivateKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSavePrivateKey}
                            className="flex-1 px-4 py-2.5 bg-[#8984d9] hover:bg-[#7469ce] text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                            style={{ backgroundColor: '#8984d9' }}
                        >
                            <Key className="w-4 h-4" />
                            Save Key
                        </button>

                        {hasStoredKey && (
                            <button
                                onClick={handleClearPrivateKey}
                                className="px-4 py-2.5 bg-[#d6d6d7] hover:bg-[#c5c5c6] text-neutral-900 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#d6d6d7' }}
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                    </div>

                    {hasStoredKey && (
                        <div className="flex items-center gap-2 text-success dark:text-success-light text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            <span>Key stored in browser</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Smart Account Derivation Section */}
            {hasStoredKey && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 md:p-6 shadow-soft">
                    <div className="flex items-center justify-between mb-4 md:mb-5">
                        <div>
                            <span className="px-3 py-1 bg-warning/10 text-warning-dark dark:text-warning text-xs font-medium rounded-full border border-warning/20">
                                Account
                            </span>
                            <h2 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">Smart Account</h2>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Factory Address
                            </label>
                            <input
                                type="text"
                                value={factoryAddress}
                                onChange={(e) => setFactoryAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Factory Data (Bytes)
                            </label>
                            <input
                                type="text"
                                value={factoryData}
                                onChange={(e) => setFactoryData(e.target.value)}
                                placeholder="0x (empty for default)"
                                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">Optional: Leave as 0x for default initialization</p>
                        </div>

                        <button
                            onClick={handleDeriveSmartAccount}
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                            style={{ backgroundColor: isLoading ? '#d6d6d7' : '#8984d9' }}
                            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#7469ce')}
                            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#8984d9')}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-neutral-600">Deriving...</span>
                                </>
                            ) : (
                                <>
                                    Derive Account
                                </>
                            )}
                        </button>

                        {smartAccountAddress && (
                            <div className="mt-4 space-y-3">
                                <div className="p-4 bg-info-light dark:bg-info-dark/20 rounded-lg border border-info/20">
                                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Smart Account Address</p>
                                    <p className="text-neutral-900 dark:text-neutral-50 font-mono text-sm break-all">{smartAccountAddress}</p>
                                </div>

                                {/* Deployment Status Indicator */}
                                <div className={`p-4 rounded-lg border ${isDeployed === true ? 'bg-success-light dark:bg-success-dark/20 border-success/30' : isDeployed === false ? 'bg-warning-light dark:bg-warning-dark/20 border-warning/30' : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Deployment Status</p>
                                            <div className="flex items-center gap-2">
                                                {isDeployed === true ? (
                                                    <>
                                                        <CheckCircle className="w-5 h-5 text-success" />
                                                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Deployed</span>
                                                    </>
                                                ) : isDeployed === false ? (
                                                    <>
                                                        <AlertCircle className="w-5 h-5 text-warning" />
                                                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Not Deployed</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                                                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Checking...</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {isDeployed === false && (
                                            <button
                                                onClick={handleDeployAccount}
                                                disabled={isDeploying}
                                                className="w-full sm:w-auto px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                                                style={{ backgroundColor: isDeploying ? '#d6d6d7' : '#8984d9' }}
                                                onMouseEnter={(e) => !isDeploying && (e.currentTarget.style.backgroundColor = '#7469ce')}
                                                onMouseLeave={(e) => !isDeploying && (e.currentTarget.style.backgroundColor = '#8984d9')}
                                            >
                                                {isDeploying ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                                                        <span className="text-neutral-600">Deploying...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Rocket className="w-4 h-4" />
                                                        Deploy
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {isDeployed === false && (
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                                            Your account needs to be deployed on-chain before you can transfer tokens
                                        </p>
                                    )}
                                </div>

                                {/* Transaction Hash */}
                                {deployTxHash && (
                                    <div className="p-4 bg-success-light dark:bg-success-dark/20 border border-success/30 rounded-lg">
                                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Deployment Transaction</p>
                                        <a
                                            href={`${NETWORKS[network].chain.blockExplorers.default.url}/tx/${deployTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-neutral-900 dark:text-neutral-50 font-mono break-all hover:text-success transition-colors underline"
                                        >
                                            {deployTxHash}
                                        </a>
                                    </div>
                                )}

                                <div className="p-4 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950/20 dark:to-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800">
                                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">USDC Balance</p>
                                    <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">${balance}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                                        Use the Token Transfer panel to send or recover USDC
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error/Success Messages */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-error-light dark:bg-error-dark/20 border border-error/30 rounded-lg text-error-dark dark:text-error-light">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 bg-success-light dark:bg-success-dark/20 border border-success/30 rounded-lg text-success-dark dark:text-success-light">
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
                            Your smart account needs native tokens ({NETWORKS[network].chain.nativeCurrency.symbol}) to pay for deployment gas fees.
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
                                <li>Click the Deploy button again</li>
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
