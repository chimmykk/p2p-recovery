'use client'

import { useState, useEffect } from 'react'
import { Address } from 'viem'
import { deriveSmartAccountAddress, isAccountDeployed, deploySmartAccountWithWallet } from '@/lib/smart-account'
import { saveSmartAccountData } from '@/lib/storage'
import { Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { type NetworkKey } from '@/lib/network'
import { useActiveWallet } from 'thirdweb/react'

interface SmartAccountDisplayProps {
  network: NetworkKey
  p2pUserWallet?: string // P2P.ME User Normal wallet address
  onSmartAccountChange?: (address: string) => void // Callback to expose smart account address
}

export function SmartAccountDisplay({ network, p2pUserWallet, onSmartAccountChange }: SmartAccountDisplayProps) {
  const [smartAccountAddress, setSmartAccountAddress] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string>('')
  const [deploySuccess, setDeploySuccess] = useState<string>('')
  const wallet = useActiveWallet()

  const factoryAddress = '0xdE320c2E2b4953883f61774c006f9057A55B97D1'
  const factoryData = '0x'

  // Derive smart account when P2P user wallet is available
  useEffect(() => {
    const deriveAccount = async () => {
      if (!p2pUserWallet || !p2pUserWallet.startsWith('0x')) {
        setSmartAccountAddress('')
        setIsDeployed(null)
        onSmartAccountChange?.('')
        // Clear storage when wallet is disconnected
        saveSmartAccountData({})
        window.dispatchEvent(new Event('smartAccountUpdated'))
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const smartAccount = await deriveSmartAccountAddress(
          p2pUserWallet as Address,
          factoryAddress as Address,
          factoryData as `0x${string}`,
          network
        )

        setSmartAccountAddress(smartAccount)

        // Notify parent component
        onSmartAccountChange?.(smartAccount)

        // Save to storage so TokenTransfer can access it
        saveSmartAccountData({
          smartAccountAddress: smartAccount,
          ownerAddress: p2pUserWallet
        })

        window.dispatchEvent(new Event('smartAccountUpdated'))

        // Check if account is deployed
        const deployed = await isAccountDeployed(smartAccount, network)
        setIsDeployed(deployed)
      } catch (err: any) {
        // Only log if it's not a handled error (to prevent Next.js error overlay)
        if (!(err as any).isHandled) {
          console.error('Error deriving smart account:', err)
        }
        setError(err.message || 'Failed to derive smart account address')
        setSmartAccountAddress('')
        setIsDeployed(null)
        onSmartAccountChange?.('')
      } finally {
        setIsLoading(false)
      }
    }

    deriveAccount()
  }, [p2pUserWallet, network, factoryAddress, factoryData])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDeploy = async () => {
    if (!wallet || !smartAccountAddress) {
      setDeployError('Wallet not connected or smart account address not available')
      return
    }

    setIsDeploying(true)
    setDeployError('')
    setDeploySuccess('')

    try {
      const result = await deploySmartAccountWithWallet(
        wallet,
        smartAccountAddress as Address,
        network
      )

      if (result.success) {
        setDeploySuccess(
          result.txHash 
            ? `Deployment successful! Transaction: ${result.txHash.slice(0, 10)}...${result.txHash.slice(-8)}`
            : 'Deployment successful!'
        )
        // Refresh deployment status
        const deployed = await isAccountDeployed(smartAccountAddress as Address, network)
        setIsDeployed(deployed)
        // Clear success message after 5 seconds
        setTimeout(() => setDeploySuccess(''), 5000)
      } else {
        setDeployError(result.error || 'Deployment failed')
      }
    } catch (err: any) {
      console.error('Error deploying smart account:', err)
      setDeployError(err.message || 'Failed to deploy smart account')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 md:p-6 shadow-soft">
      <div className="mb-4 md:mb-5">
        <div>
          <span className="px-3 py-1 bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-medium rounded-full border border-brand-500/20">
            Smart Account
          </span>
          <h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">
            P2P.ME Smart Account
          </h3>
        </div>
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        Your smart account address derived from the factory and your P2P.ME user wallet
      </p>

      {/* Factory Address */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Factory Address
        </label>
        <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          <code className="flex-1 text-xs font-mono text-neutral-900 dark:text-neutral-100 break-all">
            {factoryAddress}
          </code>
          <button
            onClick={() => copyToClipboard(factoryAddress)}
            className="flex-shrink-0 p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
            title="Copy factory address"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            )}
          </button>
        </div>
      </div>

      {/* Factory Data */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Factory Data (Bytes)
        </label>
        <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          <code className="flex-1 text-xs font-mono text-neutral-900 dark:text-neutral-100">
            {factoryData}
          </code>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 italic">
            Optional: Leave as 0x for default initialization
          </span>
        </div>
      </div>

      {/* P2P User Wallet (if available) */}
      {p2pUserWallet && (
        <div className="mb-6">
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            P2P.ME Owner Wallet
          </label>
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border rounded-lg" style={{ borderColor: '#8984D9' }}>
            <code className="flex-1 text-xs font-mono text-blue-900 dark:text-blue-100 break-all">
              {p2pUserWallet}
            </code>
            <button
              onClick={() => copyToClipboard(p2pUserWallet)}
              className="flex-shrink-0 p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
              title="Copy wallet address"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Smart Account Address */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Smart Account Address
        </label>
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Deriving smart account address...
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
          </div>
        ) : smartAccountAddress ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-lg">
              <code className="flex-1 text-xs font-mono text-brand-900 dark:text-brand-100 break-all">
                {smartAccountAddress}
              </code>
              <button
                onClick={() => copyToClipboard(smartAccountAddress)}
                className="flex-shrink-0 p-1.5 hover:bg-brand-100 dark:hover:bg-brand-900 rounded transition-colors"
                title="Copy smart account address"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-brand-500 dark:text-brand-400" />
                )}
              </button>
            </div>
            {/* Deployment Status */}
            {isDeployed !== null && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  {isDeployed ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        Account is deployed
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                        Account not yet deployed
                      </span>
                    </>
                  )}
                </div>
                {/* Deploy Button - Always visible when wallet is connected */}
                {wallet && (
                  <div className="space-y-2">
                    <button
                      onClick={handleDeploy}
                      disabled={isDeploying || isDeployed === true}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        backgroundColor: '#F5F5F5',
                        color: '#1F2937'
                      }}
                    >
                      {isDeploying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Deploying...</span>
                        </>
                      ) : (
                        <span>Deploy Smart Account</span>
                      )}
                    </button>
                    {deployError && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-red-700 dark:text-red-300">{deployError}</span>
                      </div>
                    )}
                    {deploySuccess && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-700 dark:text-green-300">{deploySuccess}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              Connect your wallet to derive your smart account address
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

