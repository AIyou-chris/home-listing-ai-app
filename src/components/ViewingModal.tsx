import React, { useState } from 'react'
import Modal from './Modal'
import { scheduleAppointment } from '../services/schedulerService'
import { buildApiUrl } from '../lib/api'

interface ViewingModalProps {
  onClose: () => void
  onSuccess?: () => void
  propertyAddress?: string
  agentEmail?: string
  agentId?: string
  listingId?: string
}

type CalendarLinks = {
  google?: string
  ics?: string
  appleOutlook?: string
}

const VISITOR_STORAGE_KEY = 'hlai_public_listing_visitor_id'
const SESSION_STORAGE_PREFIX = 'hlai_public_listing_session_'
const ATTRIBUTION_STORAGE_PREFIX = 'hlai_public_listing_attribution_'

const ViewingModal: React.FC<ViewingModalProps> = ({
  onClose,
  onSuccess,
  propertyAddress,
  agentEmail,
  agentId,
  listingId
}) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: 'Afternoon', notes: '' })
  const [smsConsent, setSmsConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('Failed to schedule. Try again.')
  const [confirmedSlot, setConfirmedSlot] = useState<{ date: string; time: string } | null>(null)
  const [calendarLinks, setCalendarLinks] = useState<CalendarLinks | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.date || !form.time) return
    if (form.phone.trim() && !smsConsent) {
      setStatus('error')
      setErrorMessage('Check the consent box if you want reminder calls and text follow-up.')
      return
    }
    setSubmitting(true)
    setStatus('idle')
    setErrorMessage('Failed to schedule. Try again.')
    setConfirmedSlot(null)
    setCalendarLinks(null)

    // Demo / Blueprint Bypass
    if (agentEmail === 'agent@example.com' || agentEmail?.includes('blueprint') || !agentEmail) {
      setTimeout(() => {
        setStatus('success')
        setConfirmedSlot({ date: form.date, time: form.time })
        setSubmitting(false);
      }, 800);
      return;
    }

    try {
      if (listingId) {
        const visitorId = localStorage.getItem(VISITOR_STORAGE_KEY) || undefined
        const conversationId = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${listingId}`) || undefined
        const attributionRaw = localStorage.getItem(`${ATTRIBUTION_STORAGE_PREFIX}${listingId}`)
        let attribution: Record<string, unknown> = {}
        if (attributionRaw) {
          try {
            attribution = JSON.parse(attributionRaw) as Record<string, unknown>
          } catch (_error) {
            attribution = {}
          }
        }

        try {
          const captureResponse = await fetch(buildApiUrl('/api/leads/capture'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listing_id: listingId,
              visitor_id: visitorId,
              conversation_id: conversationId,
              full_name: form.name,
              email: form.email || undefined,
              phone: form.phone || undefined,
              consent_sms: form.phone.trim() ? smsConsent : undefined,
              source_type: attribution.source_type || 'link',
              source_key: attribution.source_key || 'link',
              source_meta: {
                utm_source: attribution.utm_source || null,
                utm_medium: attribution.utm_medium || null,
                utm_campaign: attribution.utm_campaign || null,
                referrer: attribution.referrer || document.referrer || null,
                referrer_domain: attribution.referrer_domain || null,
                landing_path: window.location.pathname + window.location.search
              },
              context: 'showing_requested'
            })
          })
          if (!captureResponse.ok) {
            const payload = await captureResponse.json().catch(() => ({}))
            if (String((payload as { error?: string }).error || '') === 'limit_reached') {
              const captureLimitMessage =
                String((payload as { reason_line?: string }).reason_line || '').trim() ||
                "You've reached your lead storage limit. Upgrade to keep collecting leads."
              setErrorMessage(captureLimitMessage)
              setStatus('error')
              setSubmitting(false)
              return
            }
          }
        } catch (_captureError) {
          // Scheduling should still proceed if capture fails.
        }
      }

      const result = await scheduleAppointment({
        name: form.name,
        email: form.email,
        phone: form.phone,
        date: form.date,
        time: form.time,
        message: `${form.notes}${propertyAddress ? `\nProperty: ${propertyAddress}` : ''}`.trim(),
        kind: 'Showing',
        agentEmail,
        agentId,
        remindAgent: true,
        remindClient: true,
        agentReminderMinutes: 60,
        clientReminderMinutes: 1440
      })
      const slot = result?.scheduledAt
      setConfirmedSlot({
        date: slot?.date || form.date,
        time: slot?.time || form.time
      })
      setCalendarLinks(result.calendarLinks || null)
      setStatus('success')
      onSuccess?.()
    } catch {
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  const openLink = (url?: string) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const header = (
    <div>
      <h3 className='text-xl font-bold text-slate-800'>Book a Showing</h3>
      <p className='text-sm text-slate-500 mt-0.5'>Pick a time to see the home in person</p>
    </div>
  )

  if (status === 'success') {
    return (
      <Modal title={header} onClose={onClose}>
        <div className='p-6'>
          <div className='rounded-xl border border-green-200 bg-green-50 p-4'>
            <h4 className='text-base font-bold text-green-900'>Showing booked</h4>
            <p className='mt-1 text-sm text-green-800'>
              {confirmedSlot
                ? `Your showing is set for ${confirmedSlot.date} at ${confirmedSlot.time}.`
                : 'Your showing is set.'}
            </p>
            <p className='mt-2 text-xs text-green-700'>
              A confirmation email with a calendar invite is on the way.
            </p>
          </div>

          <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <button
              type='button'
              onClick={() => openLink(calendarLinks?.google)}
              className='rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
              disabled={!calendarLinks?.google}
            >
              Add to Google Calendar
            </button>
            <button
              type='button'
              onClick={() => openLink(calendarLinks?.appleOutlook)}
              className='rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              disabled={!calendarLinks?.appleOutlook}
            >
              Add to Apple / Outlook
            </button>
            <button
              type='button'
              onClick={() => openLink(calendarLinks?.ics)}
              className='rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              disabled={!calendarLinks?.ics}
            >
              Download ICS
            </button>
            <button
              type='button'
              onClick={onClose}
              className='rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800'
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={header} onClose={onClose}>
      <form onSubmit={submit} className='p-6'>
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Email *</label>
              <input type='email' value={form.email} onChange={e => set('email', e.target.value)} className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500' />
            </div>
            <div>
              <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500' />
              <p className='mt-1 text-xs text-slate-500'>Optional. Use a phone number if you want reminder calls about your showing.</p>
              {form.phone.trim() && (
                <label className='mt-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700'>
                  <input
                    type='checkbox'
                    checked={smsConsent}
                    onChange={e => setSmsConsent(e.target.checked)}
                    className='mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
                  />
                  <span>I agree to receive follow-up texts and reminder messages about this showing. Message and data rates may apply.</span>
                </label>
              )}
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Preferred Date *</label>
              <input type='date' min={new Date().toISOString().split('T')[0]} value={form.date} onChange={e => set('date', e.target.value)} className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500' />
            </div>
            <div>
              <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Time *</label>
              <select value={form.time} onChange={e => set('time', e.target.value)} className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500'>
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Evening</option>
              </select>
            </div>
          </div>
          <div>
            <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500' />
          </div>
          {status === 'error' && <div className='p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800'>{errorMessage}</div>}
        </div>
        <div className='flex justify-end items-center mt-6 pt-4 border-t border-slate-200'>
          <button type='button' onClick={onClose} className='px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 mr-2' disabled={submitting}>Cancel</button>
          <button type='submit' disabled={submitting} className='flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50'>
            {submitting ? (<><div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div><span>Booking…</span></>) : (<><span className='material-symbols-outlined w-5 h-5'>event_available</span><span>Book Showing</span></>)}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ViewingModal
