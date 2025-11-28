'use client'

import { useState, useEffect } from 'react'
import { PrivateKeyManager } from '@/components/private-key-manager'
import { TokenTransfer } from '@/components/token-transfer'
import { ChevronDown, Search } from 'lucide-react'
import { saveSelectedNetwork, getSelectedNetwork } from '@/lib/storage'
import { NETWORK_LABELS, NETWORK_CHAIN_IDS, type NetworkKey } from '@/lib/network'

export default function Home() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('monad')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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
            <div className="flex items-center gap-2" suppressHydrationWarning>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-black">P2P RECOVERY</h1>
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
            <div className="text-xs md:text-sm font-bold text-black mb-1">CURRENT NETWORK</div>
            <div className="text-xl md:text-2xl lg:text-3xl font-black text-black">
              {mounted ? NETWORK_LABELS[selectedNetwork] : 'Loading...'}
            </div>
          </div>

          <div className="bg-yellow-400 border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="text-xs md:text-sm font-bold text-black mb-1">CHAIN ID</div>
            <div className="text-xl md:text-2xl lg:text-3xl font-black text-black">
              {mounted ? NETWORK_CHAIN_IDS[selectedNetwork] : '--'}
            </div>
          </div>

          <div className="bg-blue-400 border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="text-xs md:text-sm font-bold text-black mb-1">ACCOUNT TYPE</div>
            <div className="text-xl md:text-2xl lg:text-3xl font-black text-black">ERC-4337</div>
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
            {/* Network Selector */}
            {mounted && (
              <div className="relative network-selector bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div>
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
                >
                  <div className="text-left">
                    <div className="text-sm font-bold text-black">
                      {NETWORK_LABELS[selectedNetwork]}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
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
            )}

            <TokenTransfer network={selectedNetwork} />
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12" suppressHydrationWarning>
          <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-400 border-2 md:border-3 border-black rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <span className="text-xl md:text-2xl font-black text-black">S</span>
            </div>
            <h3 className="text-base md:text-lg font-black text-black mb-2">SECURE STORAGE</h3>
            <p className="text-gray-700 text-xs md:text-sm font-medium">
              Your private key is stored locally in your browser, never on any server.
            </p>
          </div>

          <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-400 border-2 md:border-3 border-black rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <span className="text-xl md:text-2xl font-black text-black">A</span>
            </div>
            <h3 className="text-base md:text-lg font-black text-black mb-2">SMART ACCOUNTS</h3>
            <p className="text-gray-700 text-xs md:text-sm font-medium">
              Interact with smart accounts.
            </p>
          </div>

          <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-400 border-2 md:border-3 border-black rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <span className="text-xl md:text-2xl font-black text-black">M</span>
            </div>
            <h3 className="text-base md:text-lg font-black text-black mb-2">MULTI-CHAIN</h3>
            <p className="text-gray-700 text-xs md:text-sm font-medium">
              Support multi chain.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t-3 md:border-t-4 border-black mt-12 md:mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <p className="text-white font-bold text-sm md:text-base">P2P RECOVERY</p>
            <p className="text-gray-400 text-xs md:text-sm mt-2 font-medium">
              built by{' '}
              <a
                href="https://x.com/rilso_y"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors underline font-bold"
              >
                jojo
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
