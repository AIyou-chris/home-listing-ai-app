import { useCallback, useEffect, useState } from 'react'
import { fetchDashboardRoi, type DashboardRoiSummary } from '../../services/dashboardCommandService'

interface UseRoiMetricsOptions {
  enabled?: boolean
}

export const useRoiMetrics = (range: '7d' | '30d' = '7d', options: UseRoiMetricsOptions = {}) => {
  const { enabled = true } = options
  const [data, setData] = useState<DashboardRoiSummary | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetchDashboardRoi(range)
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ROI metrics.')
    } finally {
      setLoading(false)
    }
  }, [range, enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void reload()
  }, [reload, enabled])

  return {
    data,
    loading,
    error,
    reload
  }
}
