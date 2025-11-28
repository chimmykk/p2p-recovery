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
        <div className="space-y-4 md:space-y-6">
            {/* Private Key Input Section */}
            <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div>
                        <span className="px-2.5 md:px-3 py-1 bg-green-400 text-black text-xs font-bold rounded-full border-2 border-black">
                            SETUP
                        </span>
                        <h2 className="text-lg md:text-xl font-black text-black mt-2">PRIVATE KEY MANAGEMENT</h2>
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

            {/* Smart Account Derivation Section */}
            {hasStoredKey && (
                <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div>
                            <span className="px-2.5 md:px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full border-2 border-black">
                                ACCOUNT
                            </span>
                            <h2 className="text-lg md:text-xl font-black text-black mt-2">SMART ACCOUNT</h2>
                        </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                        <div>
                            <label className="block text-xs md:text-sm font-bold text-black mb-2">
                                FACTORY ADDRESS
                            </label>
                            <input
                                type="text"
                                value={factoryAddress}
                                onChange={(e) => setFactoryAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gray-50 border-3 border-black rounded-lg md:rounded-xl text-sm md:text-base text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-bold text-black mb-2">
                                FACTORY DATA (BYTES)
                            </label>
                            <input
                                type="text"
                                value={factoryData}
                                onChange={(e) => setFactoryData(e.target.value)}
                                placeholder="0x (empty for default)"
                                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gray-50 border-3 border-black rounded-lg md:rounded-xl text-sm md:text-base text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
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
                            <div className="mt-3 md:mt-4 space-y-3">
                                <div className="p-3 md:p-4 bg-blue-100 rounded-lg md:rounded-xl border-3 border-black">
                                    <p className="text-xs md:text-sm text-black font-bold mb-1">SMART ACCOUNT ADDRESS</p>
                                    <p className="text-black font-mono text-xs md:text-sm break-all">{smartAccountAddress}</p>
                                </div>

                                {/* Deployment Status Indicator */}
                                <div className={`p-3 md:p-4 rounded-lg md:rounded-xl border-3 ${isDeployed === true ? 'bg-green-100 border-green-500' : isDeployed === false ? 'bg-orange-100 border-orange-500' : 'bg-gray-100 border-gray-500'}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="text-xs md:text-sm text-black font-bold mb-1">DEPLOYMENT STATUS</p>
                                            <div className="flex items-center gap-2">
                                                {isDeployed === true ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                                                        <span className="text-sm md:text-base text-black font-bold">DEPLOYED</span>
                                                    </>
                                                ) : isDeployed === false ? (
                                                    <>
                                                        <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                                                        <span className="text-sm md:text-base text-black font-bold">NOT DEPLOYED</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-gray-600 animate-spin" />
                                                        <span className="text-sm md:text-base text-black font-bold">CHECKING...</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {isDeployed === false && (
                                            <button
                                                onClick={handleDeployAccount}
                                                disabled={isDeploying}
                                                className="w-full sm:w-auto px-3 md:px-4 py-2 bg-orange-400 hover:bg-orange-500 disabled:bg-gray-400 text-black text-sm md:text-base font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border-2 border-black"
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
                                    <div className="p-3 md:p-4 bg-green-100 border-3 border-green-500 rounded-lg md:rounded-xl">
                                        <p className="text-xs md:text-sm text-black font-bold mb-1">DEPLOYMENT TX HASH</p>
                                        <a
                                            href={`${NETWORKS[network].chain.blockExplorers.default.url}/tx/${deployTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs md:text-sm text-black font-mono break-all hover:text-green-700 transition-colors underline"
                                        >
                                            {deployTxHash}
                                        </a>
                                    </div>
                                )}

                                <div className="p-3 md:p-4 bg-green-100 rounded-lg md:rounded-xl border-3 border-black">
                                    <p className="text-xs md:text-sm text-black font-bold mb-1">USDC BALANCE</p>
                                    <p className="text-xl md:text-2xl font-black text-black">${balance}</p>
                                    <p className="text-xs text-gray-600 mt-2 font-medium">
                                        Use the TOKEN TRANSFER panel to send or recover USDC
                                    </p>
                                </div>
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
                    <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl max-w-md w-full p-4 md:p-6 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowFundingModal(false)}
                            className="absolute top-3 md:top-4 right-3 md:right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-black" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-3 md:mb-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-400 border-3 border-black rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-black" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl md:text-2xl font-black text-black text-center mb-2">
                            INSUFFICIENT GAS FUNDS
                        </h3>

                        {/* Message */}
                        <p className="text-center text-sm md:text-base text-gray-700 font-medium mb-3 md:mb-4">
                            Your smart account needs native tokens ({NETWORKS[network].chain.nativeCurrency.symbol}) to pay for deployment gas fees.
                        </p>

                        {/* Address Box */}
                        <div className="bg-orange-50 border-3 border-orange-500 rounded-lg md:rounded-xl p-3 md:p-4 mb-3 md:mb-4">
                            <p className="text-xs md:text-sm font-bold text-black mb-2">FUND THIS ADDRESS:</p>
                            <div className="bg-white border-2 border-black rounded-lg p-2.5 md:p-3 mb-3">
                                <p className="text-black font-mono text-xs md:text-sm break-all">{fundingAddress}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(fundingAddress)}
                                className="w-full px-3 md:px-4 py-2 bg-orange-400 hover:bg-orange-500 text-black text-sm md:text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border-2 border-black"
                            >
                                <Copy className="w-4 h-4" />
                                COPY ADDRESS
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 border-3 border-blue-500 rounded-lg md:rounded-xl p-3 md:p-4 mb-3 md:mb-4">
                            <p className="text-xs md:text-sm font-bold text-black mb-2">INSTRUCTIONS:</p>
                            <ol className="text-xs md:text-sm text-gray-700 font-medium space-y-1 list-decimal list-inside">
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
                            className="w-full mt-3 md:mt-4 px-3 md:px-4 py-2.5 md:py-3 bg-gray-200 hover:bg-gray-300 text-black text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-colors border-3 border-black"
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
