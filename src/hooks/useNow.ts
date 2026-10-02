import { useEffect, useState } from 'react'

// A clock that re-renders its component every `intervalMs` (default 30s). Cheap: no network.
export const useNow = (intervalMs = 30000): number => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
