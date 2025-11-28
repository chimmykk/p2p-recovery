'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Loader2, AlertCircle, Users } from 'lucide-react'

interface NetworkRequest {
  networkName: string
  chainId: string
  count: number
  isAdded: boolean
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
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg sm:rounded-xl p-6 sm:p-8 shadow-soft" suppressHydrationWarning>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3" suppressHydrationWarning>
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          <p className="text-xs sm:text-sm md:text-base font-medium text-neutral-900 dark:text-neutral-50">Loading network requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg sm:rounded-xl p-6 sm:p-8 shadow-soft" suppressHydrationWarning>
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 text-error-dark dark:text-error-light" suppressHydrationWarning>
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs sm:text-sm font-medium leading-relaxed">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-soft" suppressHydrationWarning>
      <div className="flex items-center justify-between mb-4 sm:mb-5" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50">Requested Networks</h2>
        </div>
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500 flex-shrink-0" />
      </div>

      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-4 sm:mb-5 md:mb-6">
        See what networks the community wants next!
      </p>

      {requests.length === 0 ? (
        <div className="text-center py-8 sm:py-10 md:py-12" suppressHydrationWarning>
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" suppressHydrationWarning>
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-400" />
          </div>
          <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-50 font-medium">No network requests yet</p>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">Be the first to request a network!</p>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3" suppressHydrationWarning>
          {requests.map((request, index) => (
            <div
              key={`${request.networkName}-${request.chainId}`}
              className="flex items-center justify-between p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors touch-manipulation"
              suppressHydrationWarning
            >
              <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 flex-1 min-w-0" suppressHydrationWarning>
                {/* Rank Badge */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 border border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center flex-shrink-0 ${index === 0 ? 'bg-yellow-400 dark:bg-yellow-500' :
                    index === 1 ? 'bg-neutral-300 dark:bg-neutral-600' :
                      index === 2 ? 'bg-orange-400 dark:bg-orange-500' :
                        'bg-neutral-200 dark:bg-neutral-700'
                  }`} suppressHydrationWarning>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-50">#{index + 1}</span>
                </div>

                {/* Network Info */}
                <div className="flex-1 min-w-0" suppressHydrationWarning>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <h3 className="text-xs sm:text-sm md:text-base font-medium text-neutral-900 dark:text-neutral-50 truncate">
                      {request.networkName}
                    </h3>
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full flex-shrink-0 ${request.isAdded
                        ? 'bg-success-light dark:bg-success-dark/20 text-success-dark dark:text-success-light border border-success/30'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                      }`}>
                      {request.isAdded ? 'Added' : 'Requested'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                    Chain ID: {request.chainId}
                  </p>
                </div>
              </div>

              {/* Vote Count */}
              <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-3 flex-shrink-0" suppressHydrationWarning>
                <div className="text-right" suppressHydrationWarning>
                  <p className="text-base sm:text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50">{request.count}</p>
                  <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                    {request.count === 1 ? 'request' : 'requests'}
                  </p>
                </div>
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 hidden xs:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Info */}
      <div className="mt-4 sm:mt-5 md:mt-6 p-2.5 sm:p-3 bg-info-light dark:bg-info-dark/20 border border-info/20 rounded-lg" suppressHydrationWarning>
        <p className="text-[10px] sm:text-xs text-neutral-700 dark:text-neutral-300 text-center leading-relaxed">
          List updates automatically every hour
        </p>
      </div>
    </div>
  )
}
