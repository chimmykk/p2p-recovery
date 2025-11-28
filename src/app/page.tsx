'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { PrivateKeyManager } from '@/components/private-key-manager'
import { TokenTransfer } from '@/components/token-transfer'
import { NetworkRequestForm } from '@/components/network-request-form'
import { NetworkRequestsList } from '@/components/network-requests-list'
import { ChevronDown, Search } from 'lucide-react'
import { saveSelectedNetwork, getSelectedNetwork } from '@/lib/storage'
import { NETWORK_LABELS, NETWORK_CHAIN_IDS, type NetworkKey } from '@/lib/network'

export default function Home() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('monad')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100" suppressHydrationWarning>
      {/* Navigation Bar */}
      <nav className="bg-white border-b-3 md:border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4" suppressHydrationWarning>
          <div className="flex items-center justify-between" suppressHydrationWarning>
            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-3" suppressHydrationWarning>
              <Image
                src="/logo.png"
                alt="P2P.ME Logo"
                width={120}
                height={32}
                className="h-6 md:h-8 w-auto"
                priority
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12" suppressHydrationWarning>
        {/* Page Header */}
        <div className="mb-6 md:mb-8" suppressHydrationWarning>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-black">
              <span className="text-blue-600">TOKEN RECOVERY</span> MANAGEMENT
            </h2>
            <span className="px-3 md:px-4 py-1 md:py-1.5 bg-green-400 text-black text-xs font-bold rounded-full border-2 border-black">
              SECURE
            </span>
          </div>
          <p className="text-sm md:text-base lg:text-lg text-gray-700 font-medium">
            Recover stuck funds from Smart Accounts
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8" suppressHydrationWarning>
          <div className="bg-green-400 border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="text-xs md:text-sm font-bold text-black mb-1" suppressHydrationWarning>CURRENT NETWORK</div>
            <div className="text-xl md:text-2xl lg:text-3xl font-black text-black" suppressHydrationWarning>
              {NETWORK_LABELS[selectedNetwork]}
            </div>
          </div>

          <div className="bg-yellow-400 border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="text-xs md:text-sm font-bold text-black mb-1" suppressHydrationWarning>CHAIN ID</div>
            <div className="text-xl md:text-2xl lg:text-3xl font-black text-black" suppressHydrationWarning>
              {NETWORK_CHAIN_IDS[selectedNetwork]}
            </div>
          </div>

          <div className="bg-blue-400 border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="text-xs md:text-sm font-bold text-black mb-1" suppressHydrationWarning>ACCOUNT TYPE</div>
            <div className="text-xl md:text-2xl lg:text-3xl font-black text-black" suppressHydrationWarning>ERC-4337</div>
          </div>
        </div>

        {/* How to Get Started Section */}
        <div className="mb-6 md:mb-8" suppressHydrationWarning>
          <a
            href="https://vimeo.com/1141414986?fl=pl&fe=sh"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6 hover:bg-gray-50 transition-colors"
            suppressHydrationWarning
          >
            <div className="flex items-center justify-between" suppressHydrationWarning>
              <div className="flex items-center gap-3" suppressHydrationWarning>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-400 border-2 md:border-3 border-black rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl md:text-2xl">▶️</span>
                </div>
                <div className="text-left">
                  <h3 className="text-base md:text-lg font-black text-black">HOW TO GET PRIVATE KEY AND START</h3>
                  <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">Click to watch the video guide</p>
                </div>
              </div>
              <svg className="w-5 h-5 md:w-6 md:h-6 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>
        </div>

        {/* Network Selector - Mobile Only (shows after stats cards) */}
        <div className="lg:hidden mb-6 md:mb-8" suppressHydrationWarning>
          <div className="relative network-selector bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-3 md:mb-4" suppressHydrationWarning>
              <div suppressHydrationWarning>
                <span className="px-2.5 md:px-3 py-1 bg-purple-400 text-black text-xs font-bold rounded-full border-2 border-black">
                  NETWORK
                </span>
                <h3 className="text-lg md:text-xl font-black text-black mt-2">SWITCH NETWORK</h3>
              </div>
            </div>

            <p className="text-xs md:text-sm text-gray-700 font-medium mb-3 md:mb-4">
              Select your blockchain network
            </p>

            <button
              onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-blue-100 border-3 border-black rounded-xl hover:bg-blue-200 transition-colors"
              suppressHydrationWarning
            >
              <div className="text-left" suppressHydrationWarning>
                <div className="text-sm font-bold text-black" suppressHydrationWarning>
                  {NETWORK_LABELS[selectedNetwork]}
                </div>
                <div className="text-xs text-gray-600 font-medium" suppressHydrationWarning>
                  Chain ID: {NETWORK_CHAIN_IDS[selectedNetwork]}
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-black transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showNetworkDropdown && (
              <div className="mt-3 bg-white border-3 border-black rounded-xl overflow-hidden" suppressHydrationWarning>
                <button
                  onClick={() => handleNetworkChange('monad')}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'monad' ? 'bg-green-100' : ''}`}
                >
                  <div className="font-bold text-black">{NETWORK_LABELS.monad}</div>
                  <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.monad}</div>
                </button>
                <button
                  onClick={() => handleNetworkChange('bnb')}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'bnb' ? 'bg-green-100' : ''}`}
                >
                  <div className="font-bold text-black">{NETWORK_LABELS.bnb}</div>
                  <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.bnb}</div>
                </button>
                <button
                  onClick={() => handleNetworkChange('avax')}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'avax' ? 'bg-green-100' : ''}`}
                >
                  <div className="font-bold text-black">{NETWORK_LABELS.avax}</div>
                  <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.avax}</div>
                </button>
                <button
                  onClick={() => handleNetworkChange('polygon')}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'polygon' ? 'bg-green-100' : ''}`}
                >
                  <div className="font-bold text-black">{NETWORK_LABELS.polygon}</div>
                  <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.polygon}</div>
                </button>
                <button
                  onClick={() => handleNetworkChange('optimism')}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors ${selectedNetwork === 'optimism' ? 'bg-green-100' : ''}`}
                >
                  <div className="font-bold text-black">{NETWORK_LABELS.optimism}</div>
                  <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.optimism}</div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8" suppressHydrationWarning>
          {/* Private Key Management */}
          <div suppressHydrationWarning>
            <PrivateKeyManager network={selectedNetwork} />
          </div>

          {/* Token Transfer */}
          <div className="space-y-4 md:space-y-6" suppressHydrationWarning>
            {/* Network Selector - Desktop Only */}
            <div className="hidden lg:block relative network-selector bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
              <div className="flex items-center justify-between mb-3 md:mb-4" suppressHydrationWarning>
                <div suppressHydrationWarning>
                  <span className="px-2.5 md:px-3 py-1 bg-purple-400 text-black text-xs font-bold rounded-full border-2 border-black">
                    NETWORK
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-black mt-2">SWITCH NETWORK</h3>
                </div>
              </div>

              <p className="text-xs md:text-sm text-gray-700 font-medium mb-3 md:mb-4">
                Select your blockchain network
              </p>

              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-blue-100 border-3 border-black rounded-xl hover:bg-blue-200 transition-colors"
                suppressHydrationWarning
              >
                <div className="text-left" suppressHydrationWarning>
                  <div className="text-sm font-bold text-black" suppressHydrationWarning>
                    {NETWORK_LABELS[selectedNetwork]}
                  </div>
                  <div className="text-xs text-gray-600 font-medium" suppressHydrationWarning>
                    Chain ID: {NETWORK_CHAIN_IDS[selectedNetwork]}
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-black transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {showNetworkDropdown && (
                <div className="mt-3 bg-white border-3 border-black rounded-xl overflow-hidden" suppressHydrationWarning>
                  <button
                    onClick={() => handleNetworkChange('monad')}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'monad' ? 'bg-green-100' : ''}`}
                  >
                    <div className="font-bold text-black">{NETWORK_LABELS.monad}</div>
                    <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.monad}</div>
                  </button>
                  <button
                    onClick={() => handleNetworkChange('bnb')}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'bnb' ? 'bg-green-100' : ''}`}
                  >
                    <div className="font-bold text-black">{NETWORK_LABELS.bnb}</div>
                    <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.bnb}</div>
                  </button>
                  <button
                    onClick={() => handleNetworkChange('avax')}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'avax' ? 'bg-green-100' : ''}`}
                  >
                    <div className="font-bold text-black">{NETWORK_LABELS.avax}</div>
                    <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.avax}</div>
                  </button>
                  <button
                    onClick={() => handleNetworkChange('polygon')}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b-2 border-black ${selectedNetwork === 'polygon' ? 'bg-green-100' : ''}`}
                  >
                    <div className="font-bold text-black">{NETWORK_LABELS.polygon}</div>
                    <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.polygon}</div>
                  </button>
                  <button
                    onClick={() => handleNetworkChange('optimism')}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors ${selectedNetwork === 'optimism' ? 'bg-green-100' : ''}`}
                  >
                    <div className="font-bold text-black">{NETWORK_LABELS.optimism}</div>
                    <div className="text-xs text-gray-600 font-medium">Chain ID: {NETWORK_CHAIN_IDS.optimism}</div>
                  </button>
                </div>
              )}
            </div>

            <TokenTransfer network={selectedNetwork} />
          </div>
        </div>

        {/* Network Requests Section */}
        <div className="mt-8 md:mt-12" suppressHydrationWarning>
          <div className="mb-6 text-center" suppressHydrationWarning>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-black mb-2">
              <span className="text-purple-600">COMMUNITY</span> NETWORK REQUESTS
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8" suppressHydrationWarning>
            <NetworkRequestForm />
            <NetworkRequestsList />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t-3 md:border-t-4 border-black mt-12 md:mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <p className="text-white font-bold text-sm md:text-base">P2P RECOVERY</p>
            <p className="text-gray-400 text-xs md:text-sm mt-2 font-medium">
              Built by{' '}
              <a
                href="https://github.com/chimmykk/p2p-recovery"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors underline font-bold"
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
