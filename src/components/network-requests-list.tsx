'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Loader2, AlertCircle, Users } from 'lucide-react'

interface NetworkRequest {
  networkName: string
  chainId: string
  count: number
}

export function NetworkRequestsList() {
  const [requests, setRequests] = useState<NetworkRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/network-request')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch network requests')
      }

      // Sort by count (descending)
      const sortedData = data.data.sort((a: NetworkRequest, b: NetworkRequest) => b.count - a.count)
      setRequests(sortedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load network requests')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()

    // Listen for updates from the form
    const handleUpdate = () => {
      fetchRequests()
    }

    window.addEventListener('networkRequestUpdated', handleUpdate)

    // Refresh data every 1 hour
    const interval = setInterval(fetchRequests, 3600000)

    return () => {
      window.removeEventListener('networkRequestUpdated', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-6 md:p-8" suppressHydrationWarning>
        <div className="flex items-center justify-center gap-3" suppressHydrationWarning>
          <Loader2 className="w-5 h-5 animate-spin text-black" />
          <p className="text-sm md:text-base font-bold text-black">Loading network requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-6 md:p-8" suppressHydrationWarning>
        <div className="flex items-center gap-3 text-red-700" suppressHydrationWarning>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-3 md:border-4 border-black rounded-xl md:rounded-2xl p-4 md:p-6" suppressHydrationWarning>
      <div className="flex items-center justify-between mb-4 md:mb-6" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <h2 className="text-lg md:text-xl font-black text-black">REQUESTED NETWORKS</h2>
        </div>
        <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-black" />
      </div>

      <p className="text-xs md:text-sm text-gray-700 font-medium mb-4 md:mb-6">
        See what networks the community wants next!
      </p>

      {requests.length === 0 ? (
        <div className="text-center py-8 md:py-12" suppressHydrationWarning>
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-200 border-3 border-black rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4" suppressHydrationWarning>
            <Users className="w-6 h-6 md:w-8 md:h-8 text-black" />
          </div>
          <p className="text-sm md:text-base text-gray-700 font-bold">No network requests yet</p>
          <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">Be the first to request a network!</p>
        </div>
      ) : (
        <div className="space-y-3" suppressHydrationWarning>
          {requests.map((request, index) => (
            <div
              key={`${request.networkName}-${request.chainId}`}
              className="flex items-center justify-between p-3 md:p-4 bg-gray-50 border-3 border-black rounded-lg md:rounded-xl hover:bg-gray-100 transition-colors"
              suppressHydrationWarning
            >
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0" suppressHydrationWarning>
                {/* Rank Badge */}
                <div className={`w-8 h-8 md:w-10 md:h-10 border-2 md:border-3 border-black rounded-lg flex items-center justify-center flex-shrink-0 ${
                  index === 0 ? 'bg-yellow-400' :
                  index === 1 ? 'bg-gray-300' :
                  index === 2 ? 'bg-orange-300' :
                  'bg-blue-200'
                }`} suppressHydrationWarning>
                  <span className="text-sm md:text-base font-black text-black">#{index + 1}</span>
                </div>

                {/* Network Info */}
                <div className="flex-1 min-w-0" suppressHydrationWarning>
                  <h3 className="text-sm md:text-base font-black text-black truncate">
                    {request.networkName}
                  </h3>
                  <p className="text-xs text-gray-600 font-medium">
                    Chain ID: {request.chainId}
                  </p>
                </div>
              </div>

              {/* Vote Count */}
              <div className="flex items-center gap-2 ml-3 flex-shrink-0" suppressHydrationWarning>
                <div className="text-right" suppressHydrationWarning>
                  <p className="text-lg md:text-xl font-black text-black">{request.count}</p>
                  <p className="text-xs text-gray-600 font-medium whitespace-nowrap">
                    {request.count === 1 ? 'request' : 'requests'}
                  </p>
                </div>
                <Users className="w-4 h-4 md:w-5 md:h-5 text-black" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Info */}
      <div className="mt-4 md:mt-6 p-3 bg-blue-50 border-2 border-blue-400 rounded-lg" suppressHydrationWarning>
        <p className="text-xs text-gray-700 font-medium text-center">
          List updates automatically every hour
        </p>
      </div>
    </div>
  )
}
