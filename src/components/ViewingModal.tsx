import React, { useState } from 'react'
import Modal from './Modal'
import { scheduleAppointment } from '../services/schedulerService'

interface ViewingModalProps {
  onClose: () => void
  onSuccess?: () => void
  propertyAddress?: string
  agentEmail?: string
}

const ViewingModal: React.FC<ViewingModalProps> = ({ onClose, onSuccess, propertyAddress, agentEmail }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: 'Afternoon', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.date || !form.time) return
    setSubmitting(true)
    setStatus('idle')
    try {
      await scheduleAppointment({
        name: form.name,
        email: form.email,
        phone: form.phone,
        date: form.date,
        time: form.time,
        message: `${form.notes}${propertyAddress ? `\nProperty: ${propertyAddress}` : ''}`.trim(),
        kind: 'Showing',
        agentEmail
      })
      setStatus('success')
      setTimeout(() => { onSuccess?.(); onClose() }, 1500)
    } catch {
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  const header = (
    <div>
      <h3 className='text-xl font-bold text-slate-800'>Book a Showing</h3>
      <p className='text-sm text-slate-500 mt-0.5'>Pick a time to see the home in person</p>
    </div>
  )

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
          {status === 'success' && <div className='p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800'>Showing scheduled. Confirmation sent.</div>}
          {status === 'error' && <div className='p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800'>Failed to schedule. Try again.</div>}
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


