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
    <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
      <div className="flex items-center justify-between mb-3 md:mb-4" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <span className="px-2.5 md:px-3 py-1 bg-purple-400 text-black text-xs font-bold rounded-full border-2 border-black">
            REQUEST
          </span>
          <h2 className="text-lg md:text-xl font-black text-black mt-2">REQUEST NEW NETWORK</h2>
        </div>
      </div>

      <p className="text-xs md:text-sm text-gray-700 font-medium mb-4 md:mb-6">
        Want us to support a new network? Submit a request below!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
        {/* Network Name Input */}
        <div suppressHydrationWarning>
          <label className="block text-xs md:text-sm font-bold text-black mb-2">
            NETWORK NAME
          </label>
          <input
            type="text"
            value={networkName}
            onChange={(e) => setNetworkName(e.target.value)}
            placeholder="e.g., Ethereum, Base, Arbitrum"
            className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gray-50 border-3 border-black rounded-lg md:rounded-xl text-sm md:text-base text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
            disabled={isLoading}
          />
        </div>

        {/* Chain ID Input */}
        <div suppressHydrationWarning>
          <label className="block text-xs md:text-sm font-bold text-black mb-2">
            CHAIN ID
          </label>
          <input
            type="text"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            placeholder="e.g., 1, 8453, 42161"
            className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gray-50 border-3 border-black rounded-lg md:rounded-xl text-sm md:text-base text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-600 mt-1 font-medium">
            Enter the numeric chain ID for the network
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-purple-400 hover:bg-purple-500 disabled:bg-gray-400 text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border-3 border-black"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              SUBMITTING...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              SUBMIT REQUEST
            </>
          )}
        </button>

        {/* Success Message */}
        {success && (
          <div className="flex flex-col gap-2 p-4 bg-green-100 border-3 border-green-500 rounded-xl text-green-700">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">
                {isNewRequest ? 'Network request submitted successfully!' : `You and ${requestCount! - 1} ${requestCount! - 1 === 1 ? 'other has' : 'others have'} requested to add this network`}
              </p>
            </div>
            {requestCount !== null && isNewRequest && (
              <div className="pl-8">
                <p className="text-xs font-medium">
                  Your request has been added to our list!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-100 border-3 border-red-500 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
