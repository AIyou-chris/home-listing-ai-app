import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { resumeDashboardRealtime, stopDashboardRealtime } from '../../services/dashboardRealtimeClient'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'

const FRESH_MS = 2 * 60 * 1000

// Starts the realtime feed, and shouts when a brand-new lead lands while the app is open:
// a banner with a one-tap Call, and a buzz on phones for Hot leads. Only leads under 2 minutes old
// count as news, so loading the page never replays old ones.
const DashboardRealtimeBootstrap = () => {
  useEffect(() => {
    resumeDashboardRealtime()
    const seen = new Set<string>()
    const unsubscribe = useDashboardRealtimeStore.subscribe((state) => {
      const leads = Object.values(state.leadsById || {})
      for (const lead of leads) {
        if (seen.has(lead.id)) continue
        seen.add(lead.id)
        const fresh = Date.now() - new Date(lead.created_at || 0).getTime() < FRESH_MS
        if (!fresh || String(lead.status || '').toLowerCase() !== 'new' || document.visibilityState !== 'visible') continue
        const hot = lead.intent_level === 'Hot'
        if (hot) { try { navigator.vibrate?.([200, 100, 200]) } catch { /* not supported */ } }
        toast.custom((t) => (
          <div className={`pointer-events-auto flex w-[min(92vw,380px)] items-center gap-3 rounded-2xl border bg-white p-3 shadow-xl ${hot ? 'border-rose-300' : 'border-slate-200'} ${t.visible ? 'animate-fadeIn' : 'opacity-0'}`}>
            <span className="text-2xl">{hot ? '🔥' : '🏡'}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{hot ? 'Hot lead: ' : 'New lead: '}{lead.name || 'Someone'}</p>
              <p className="truncate text-xs text-slate-500">{lead.listing?.address || 'Just came in'}</p>
            </div>
            {lead.phone && <a href={`tel:${lead.phone}`} onClick={() => toast.dismiss(t.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Call</a>}
            <button type="button" onClick={() => toast.dismiss(t.id)} aria-label="Dismiss" className="text-slate-400">✕</button>
          </div>
        ), { duration: hot ? 15000 : 8000, position: 'top-center' })
      }
    })
    return () => {
      unsubscribe()
      stopDashboardRealtime()
    }
  }, [])

  return null
}

export default DashboardRealtimeBootstrap
