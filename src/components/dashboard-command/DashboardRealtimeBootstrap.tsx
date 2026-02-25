import { useEffect } from 'react'
import { resumeDashboardRealtime, stopDashboardRealtime } from '../../services/dashboardRealtimeClient'

const DashboardRealtimeBootstrap = () => {
  useEffect(() => {
    resumeDashboardRealtime()
    return () => {
      stopDashboardRealtime()
    }
  }, [])

  return null
}

export default DashboardRealtimeBootstrap
