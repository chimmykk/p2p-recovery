'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { TokenTransfer } from '@/components/token-transfer'
// import { NetworkRequestForm } from '@/components/network-request-form'
// import { NetworkRequestsList } from '@/components/network-requests-list'
import { WalletConnect } from '@/components/wallet-connect'
import { SmartAccountDisplay } from '@/components/smart-account-display'
import { ChevronDown, Search, Wallet } from 'lucide-react'
import { saveSelectedNetwork, getSelectedNetwork } from '@/lib/storage'
import { NETWORK_LABELS, NETWORK_CHAIN_IDS, getNetworksSortedByLabel, type NetworkKey } from '@/lib/network'

export default function Home() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('monad')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [p2pUserWallet, setP2pUserWallet] = useState<string>('')
  const [smartAccountAddress, setSmartAccountAddress] = useState<string>('')

  useEffect(() => {
    setSelectedNetwork(getSelectedNetwork())

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.network-selector')) {
        setShowNetworkDropdown(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleNetworkChange = (network: NetworkKey) => {
    setSelectedNetwork(network)
    saveSelectedNetwork(network)
    setShowNetworkDropdown(false)
    // Notify components about network change
    window.dispatchEvent(new Event('networkChanged'))
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-0.3">
              <Image
                src="/logo.png"
                alt="P2P.ME Logo"
                width={48}
                height={48}
                className="h-10 md:h-12 w-auto"
                priority
              />
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-black dark:text-white" style={{ fontFamily: 'var(--font-outfit)' }}>
                P2P.ME
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12 lg:py-16">
        {/* Page Header */}
        <div className="mb-8 sm:mb-10 md:mb-14">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold text-neutral-900 dark:text-neutral-50">
              Token Recovery
            </h1>
            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-medium rounded-full border border-brand-500/20">
              Secure
            </span>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-400 font-normal max-w-2xl">
            Safely recover stuck funds from P2P.ME Smart Account
          </p>
        </div>

        {/* How to Get Started Section */}
        <div className="mb-6 sm:mb-8">
          <a
            href="https://youtube.com/shorts/kPV5I8Pp-z0?feature=share"
            target="_blank"
            rel="noopener noreferrer"
            className="group block w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 hover:border-brand-500 dark:hover:border-brand-400 shadow-soft hover:shadow-brand transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Getting Started Guide</h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Watch the video tutorial to learn how to use P2P Recovery</p>
              </div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-neutral-400 group-hover:text-brand-500 dark:group-hover:text-brand-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>
        </div>

        {/* Compact Connect Wallet Button */}
        <div className="mb-8 sm:mb-10 md:mb-12 flex justify-start">
          <WalletConnect onP2PWalletChange={setP2pUserWallet} compact selectedNetwork={selectedNetwork} />
        </div>

        {/* Network Selector - Mobile Only (shows after stats cards) */}
        <div className="lg:hidden mb-10 md:mb-12">
          <div className="relative network-selector bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 md:p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div>
                <span className="px-3 py-1 bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-medium rounded-full border border-brand-500/20">
                  Network
                </span>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">Switch Network</h3>
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Select your blockchain network
            </p>

            <button
              onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors"

            >
              <div className="text-left">
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {NETWORK_LABELS[selectedNetwork]}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Chain ID: {NETWORK_CHAIN_IDS[selectedNetwork]}
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showNetworkDropdown && (
              <div className="mt-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-medium">
                {getNetworksSortedByLabel().map((networkKey, index, array) => (
                  <button
                    key={networkKey}
                    onClick={() => handleNetworkChange(networkKey)}
                    className={`w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${index < array.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-700' : ''
                      } ${selectedNetwork === networkKey ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}
                  >
                    <div className="font-medium text-neutral-900 dark:text-neutral-50">{NETWORK_LABELS[networkKey]}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Chain ID: {NETWORK_CHAIN_IDS[networkKey]}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Grid - Smart Account & Token Transfer */}
        <div className="mb-8 md:mb-10">
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
              Recover Your Tokens
            </h2>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              View your smart account and transfer tokens from your P2P.ME Smart Account
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            {/* Smart Account Display */}
            <div>
              <SmartAccountDisplay
                network={selectedNetwork}
                p2pUserWallet={p2pUserWallet}
                onSmartAccountChange={setSmartAccountAddress}
              />
            </div>

            {/* Token Transfer */}
            <div className="space-y-5 md:space-y-6">
              {/* Network Selector - Desktop Only */}
              <div className="hidden lg:block relative network-selector bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 md:p-6 shadow-soft">
                <div className="flex items-center justify-between mb-4 md:mb-5">
                  <div>
                    <span className="px-3 py-1 bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-medium rounded-full border border-brand-500/20">
                      Network
                    </span>
                    <h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">Switch Network</h3>
                  </div>
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Select your blockchain network
                </p>

                <button
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {NETWORK_LABELS[selectedNetwork]}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Chain ID: {NETWORK_CHAIN_IDS[selectedNetwork]}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showNetworkDropdown && (
                  <div className="mt-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-medium">
                    {getNetworksSortedByLabel().map((networkKey, index, array) => (
                      <button
                        key={networkKey}
                        onClick={() => handleNetworkChange(networkKey)}
                        className={`w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${index < array.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-700' : ''
                          } ${selectedNetwork === networkKey ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}
                      >
                        <div className="font-medium text-neutral-900 dark:text-neutral-50">{NETWORK_LABELS[networkKey]}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">Chain ID: {NETWORK_CHAIN_IDS[networkKey]}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {smartAccountAddress ? (
                <TokenTransfer network={selectedNetwork} />
              ) : (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 md:p-12 shadow-soft">
                  <div className="text-center">
                    <h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
                      Connect Wallet to Transfer Tokens
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Please connect your wallet and wait for your Smart Account address to be derived before you can transfer tokens.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Network Requests Section */}
        {/* <div className="mt-16 md:mt-24">
          <div className="mb-8 md:mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
              Community Network Requests
            </h2>
            <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Request new blockchain networks or view community suggestions
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            <NetworkRequestForm />
            <NetworkRequestsList />
          </div>
        </div> */}
        { /* comment out network section */ }
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 dark:bg-black border-t border-neutral-800 dark:border-neutral-900 mt-8 md:mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-5">
          <div className="text-center">
            <p className="text-white font-semibold text-sm md:text-base">P2P Recovery</p>
            <p className="text-neutral-400 text-xs md:text-sm mt-1">
              Built by{' '}
              <a
                href="https://github.com/chimmykk/p2p-recovery"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 transition-colors underline font-medium"
              >
                P2P.me Community
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
