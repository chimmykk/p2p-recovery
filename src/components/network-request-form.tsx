'use client'

import { useState } from 'react'
import { Plus, Loader2, CheckCircle, AlertCircle, Network } from 'lucide-react'

export function NetworkRequestForm() {
  const [networkName, setNetworkName] = useState('')
  const [chainId, setChainId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requestCount, setRequestCount] = useState<number | null>(null)
  const [isNewRequest, setIsNewRequest] = useState<boolean | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setRequestCount(null)
    setIsNewRequest(null)

    if (!networkName.trim()) {
      setError('Please enter a network name')
      return
    }

    if (!chainId.trim()) {
      setError('Please enter a chain ID')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/network-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          networkName: networkName.trim(),
          chainId: chainId.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }

      setSuccess(data.message)
      setRequestCount(data.count)
      setIsNewRequest(data.isNew)

      // Clear form
      setNetworkName('')
      setChainId('')

      // Notify the list to refresh
      window.dispatchEvent(new Event('networkRequestUpdated'))

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('')
        setRequestCount(null)
        setIsNewRequest(null)
      }, 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit network request')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-soft" suppressHydrationWarning>
      <div className="mb-4 sm:mb-5" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-medium rounded-full border border-brand-500/20">
            Request
          </span>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-2">Request New Network</h2>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-4 sm:mb-5 md:mb-6">
        Want us to support a new network? Submit a request below!
      </p>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4" suppressHydrationWarning>
        {/* Network Name Input */}
        <div suppressHydrationWarning>
          <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 sm:mb-2">
            Network Name
          </label>
          <input
            type="text"
            value={networkName}
            onChange={(e) => setNetworkName(e.target.value)}
            placeholder="e.g., Ethereum, Base, Arbitrum"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm sm:text-base text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 touch-manipulation"
            disabled={isLoading}
          />
        </div>

        {/* Chain ID Input */}
        <div suppressHydrationWarning>
          <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 sm:mb-2">
            Chain ID
          </label>
          <input
            type="text"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            placeholder="e.g., 1, 8453, 42161"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm sm:text-base text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 touch-manipulation"
            disabled={isLoading}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
            Enter the numeric chain ID for the network
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-98 touch-manipulation"
          style={{ backgroundColor: isLoading ? '#d6d6d7' : '#8984d9' }}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#7469ce')}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#8984d9')}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-neutral-600" />
              <span className="text-neutral-600">Submitting...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Submit Request
            </>
          )}
        </button>

        {/* Success Message */}
        {success && (
          <div className="flex flex-col gap-2 p-3 sm:p-4 bg-success-light dark:bg-success-dark/20 border border-success/30 rounded-lg text-success-dark dark:text-success-light">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                {isNewRequest ? 'Network request submitted successfully!' : `You and ${requestCount! - 1} ${requestCount! - 1 === 1 ? 'other has' : 'others have'} requested to add this network`}
              </p>
            </div>
            {requestCount !== null && isNewRequest && (
              <div className="pl-6 sm:pl-8">
                <p className="text-xs">
                  Your request has been added to our list!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-error-light dark:bg-error-dark/20 border border-error/30 rounded-lg text-error-dark dark:text-error-light">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-xs sm:text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
