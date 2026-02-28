import { useCallback, useEffect, useState } from 'react'
import {
  fetchListingPerformance,
  type ListingPerformanceMetrics
} from '../../services/dashboardCommandService'

export interface ListingPerformanceState {
  listing_id: string
  range: string
  metrics: ListingPerformanceMetrics
  breakdown?: {
    by_source_type: Array<{ source_type: string; total: number }>
    by_source_key: Array<{ source_key: string; total: number }>
  }
}

export const useListingPerformance = (
  listingId: string,
  range: '7d' | '30d' = '30d'
) => {
  const [data, setData] = useState<ListingPerformanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!listingId) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetchListingPerformance(listingId, { range })
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing performance.')
    } finally {
      setLoading(false)
    }
  }, [listingId, range])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    data,
    loading,
    error,
    reload
  }
}
