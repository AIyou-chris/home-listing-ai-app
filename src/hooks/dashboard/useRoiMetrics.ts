import { useCallback, useEffect, useState } from 'react'
import { fetchDashboardRoi, type DashboardRoiSummary } from '../../services/dashboardCommandService'

export const useRoiMetrics = (range: '7d' | '30d' = '7d') => {
  const [data, setData] = useState<DashboardRoiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
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
  }, [range])

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
