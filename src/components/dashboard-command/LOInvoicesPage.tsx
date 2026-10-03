import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageGuide from './PageGuide'
import { buildApiUrl } from '../../lib/api'
import { authHeaders } from '../../services/dashboard/utils'
import { showToast } from '../../utils/toastService'
import {
  createInvoice,
  downloadInvoicesCsv,
  fetchInvoices,
  formatCents,
  remindInvoice,
  setInvoicePaid,
  voidInvoice,
  type Invoice,
  type InvoiceStatus,
  type InvoiceSummary
} from '../../services/loInvoiceService'

interface PartnerOption {
  agentId: string
  name: string
  email: string | null
  listings: Array<{ listingId: string; address: string }>
}

type Filter = 'all' | 'open' | 'paid' | 'void'

const PAY_NOTE_KEY = 'hlai_invoice_pay_instructions'
const LINE_IDEAS = ['Share of flyer printing', 'Share of social ads', 'Share of open house signs', 'Share of mailers']

const STATUS_STYLE: Record<InvoiceStatus, { label: string; cls: string }> = {
  sent: { label: 'Sent', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700 border-red-200' },
  paid: { label: 'Paid', cls: 'bg-green-50 text-green-700 border-green-200' },
  void: { label: 'Void', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
}

const readStored = (key: string) => {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}
const writeStored = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch { /* private mode: ignore */ }
}

const shortDate = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const emptyLine = () => ({ description: '', amount: '' })

const LOInvoicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<InvoiceSummary>({ outstandingCents: 0, overdueCents: 0, paidCents: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [sentInvoice, setSentInvoice] = useState<{ invoice: Invoice; emailSent: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [partnerKey, setPartnerKey] = useState('other')
  const [agentEmail, setAgentEmail] = useState('')
  const [agentName, setAgentName] = useState('')
  const [listingId, setListingId] = useState('')
  const [lines, setLines] = useState([emptyLine()])
  const [dueDate, setDueDate] = useState('')
  const [payment, setPayment] = useState(() => readStored(PAY_NOTE_KEY))
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchInvoices()
      setInvoices(data.invoices || [])
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invoices.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/partners'), { headers: await authHeaders(null) })
        if (!res.ok) return
        const data = (await res.json()) as { partners?: PartnerOption[] }
        if (!cancelled) setPartners((data.partners || []).filter((p) => p.email))
      } catch { /* the picker is optional: the email box still works */ }
    })()
    return () => { cancelled = true }
  }, [])

  const resetForm = useCallback(() => {
    setPartnerKey('other'); setAgentEmail(''); setAgentName(''); setListingId('')
    setLines([emptyLine()]); setDueDate(''); setNote(''); setFormError(null)
    setPayment(readStored(PAY_NOTE_KEY))
  }, [])

  // The Partners page sends us here with ?new=1&email=&name= so the form opens already filled in.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    resetForm()
    setAgentEmail(searchParams.get('email') || '')
    setAgentName(searchParams.get('name') || '')
    setFormOpen(true)
    setSentInvoice(null)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, resetForm])

  useEffect(() => {
    if (!formOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFormOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formOpen])

  const pickPartner = (key: string) => {
    setPartnerKey(key)
    setListingId('')
    if (key === 'other') return
    const partner = partners.find((p) => p.agentId === key)
    if (partner) { setAgentEmail(partner.email || ''); setAgentName(partner.name) }
  }

  const currentPartner = partners.find((p) => p.agentId === partnerKey)
  const totalCents = useMemo(
    () => lines.reduce((sum, l) => {
      const n = Number.parseFloat(String(l.amount).replace(/[$,\s]/g, ''))
      return sum + (Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0)
    }, 0),
    [lines]
  )

  const visible = invoices.filter((inv) => {
    if (filter === 'open') return inv.status === 'sent' || inv.status === 'overdue'
    if (filter === 'paid') return inv.status === 'paid'
    if (filter === 'void') return inv.status === 'void'
    return true
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const result = await createInvoice({
        agentEmail: agentEmail.trim(),
        agentName: agentName.trim() || undefined,
        listingId: listingId || null,
        lines: lines.filter((l) => l.description.trim() || l.amount.trim()),
        dueDate: dueDate || undefined,
        paymentInstructions: payment.trim() || undefined,
        note: note.trim() || undefined
      })
      writeStored(PAY_NOTE_KEY, payment.trim())
      setSentInvoice(result)
      setInvoices((prev) => [result.invoice, ...prev])
      void load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send the invoice.')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      showToast.success('Invoice link copied.')
    } catch {
      showToast.error('Could not copy. Long-press the link to copy it.')
    }
  }

  const act = async (inv: Invoice, run: () => Promise<Invoice>, done: string) => {
    if (!inv.id) return
    setBusyId(inv.id)
    try {
      const updated = await run()
      setInvoices((prev) => prev.map((p) => (p.id === inv.id ? updated : p)))
      showToast.success(done)
      void load()
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusyId(null)
    }
  }

  const exportCsv = async () => {
    try { await downloadInvoicesCsv() } catch (err) { showToast.error(err instanceof Error ? err.message : 'Could not export.') }
  }

  const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100'
  const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500'

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-28 pt-6 sm:pt-8">
      <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bill an agent for their share of marketing. They pay you directly. We never touch the money.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setSentInvoice(null); setFormOpen(true) }}
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
        >
          + New invoice
        </button>
      </div>

      <PageGuide pageKey="lo-invoices" />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Waiting on payment', value: summary.outstandingCents, cls: 'text-slate-900' },
          { label: 'Overdue', value: summary.overdueCents, cls: summary.overdueCents > 0 ? 'text-red-600' : 'text-slate-900' },
          { label: 'Paid', value: summary.paidCents, cls: 'text-green-600' }
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{c.label}</p>
            <p className={`mt-1 text-lg font-black ${c.cls}`}>{formatCents(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter invoices">
          {(['all', 'open', 'paid', 'void'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${filter === f ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
            >
              {f}
            </button>
          ))}
        </div>
        {invoices.length > 0 && (
          <button type="button" onClick={() => void exportCsv()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            Download CSV
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading invoices…</p>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-bold underline">Try again</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-bold text-slate-800">{invoices.length === 0 ? 'No invoices yet' : 'Nothing here'}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {invoices.length === 0
              ? 'When you and an agent split a marketing cost, send them an invoice for their share. It takes about a minute.'
              : 'No invoices match this filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((inv) => {
            const style = STATUS_STYLE[inv.status]
            const open = inv.status === 'sent' || inv.status === 'overdue'
            const busy = busyId === inv.id
            return (
              <li key={inv.id || inv.invoiceNumber} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{inv.agentName || inv.agentEmail}</p>
                    <p className="truncate text-xs text-slate-500">
                      {inv.invoiceNumber}{inv.listingAddress ? ` · ${inv.listingAddress}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">{formatCents(inv.totalCents)}</p>
                    <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${style.cls}`}>{style.label}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Sent {shortDate(inv.sentAt)}
                  {inv.dueDate ? ` · due ${shortDate(inv.dueDate)}` : ''}
                  {inv.paidAt ? ` · paid ${shortDate(inv.paidAt)}` : ''}
                  {inv.firstViewedAt ? ' · opened ✓' : open ? ' · not opened yet' : ''}
                  {!inv.emailSent && inv.status !== 'void' ? ' · email not delivered, copy the link' : ''}
                  {inv.reminderCount ? ` · ${inv.reminderCount} reminder${inv.reminderCount > 1 ? 's' : ''}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void copyLink(inv.link)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">Copy link</button>
                  {open && (
                    <button type="button" disabled={busy} onClick={() => void act(inv, () => remindInvoice(inv.id as string), 'Reminder sent.')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">Remind</button>
                  )}
                  {open && (
                    <button type="button" disabled={busy} onClick={() => void act(inv, () => setInvoicePaid(inv.id as string, true), 'Marked paid.')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Mark paid</button>
                  )}
                  {inv.status === 'paid' && (
                    <button type="button" disabled={busy} onClick={() => void act(inv, () => setInvoicePaid(inv.id as string, false), 'Marked unpaid.')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">Mark unpaid</button>
                  )}
                  {open && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => { if (window.confirm(`Void invoice ${inv.invoiceNumber}? The agent will no longer be able to open it.`)) void act(inv, () => voidInvoice(inv.id as string), 'Invoice voided.') }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50"
                    >
                      Void
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center" role="dialog" aria-modal="true" aria-label="New invoice">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl">
            {sentInvoice ? (
              <div className="space-y-4 text-center">
                <p className="text-3xl">✅</p>
                <h2 className="text-lg font-black text-slate-900">Invoice {sentInvoice.invoice.invoiceNumber} sent</h2>
                <p className="text-sm text-slate-600">
                  {sentInvoice.emailSent
                    ? `We emailed it to ${sentInvoice.invoice.agentEmail}. Replies go to you.`
                    : 'The email could not be delivered. Copy the link and send it yourself.'}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button type="button" onClick={() => void copyLink(sentInvoice.invoice.link)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Copy link</button>
                  <button type="button" onClick={() => { setFormOpen(false); setSentInvoice(null) }} className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900">New invoice</h2>
                  <button type="button" onClick={() => setFormOpen(false)} aria-label="Close" className="rounded-full px-3 py-1 text-xl text-slate-500">×</button>
                </div>

                {partners.length > 0 && (
                  <div>
                    <label className={labelCls} htmlFor="inv-partner">Agent</label>
                    <select id="inv-partner" className={inputCls} value={partnerKey} onChange={(e) => pickPartner(e.target.value)}>
                      <option value="other">Someone else (type their email)</option>
                      {partners.map((p) => <option key={p.agentId} value={p.agentId}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="inv-email">Agent email</label>
                    <input id="inv-email" type="email" required className={inputCls} value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="agent@example.com" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="inv-name">Agent name</label>
                    <input id="inv-name" className={inputCls} value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Optional" maxLength={120} />
                  </div>
                </div>

                {currentPartner && currentPartner.listings.length > 0 && (
                  <div>
                    <label className={labelCls} htmlFor="inv-listing">Listing (optional)</label>
                    <select id="inv-listing" className={inputCls} value={listingId} onChange={(e) => setListingId(e.target.value)}>
                      <option value="">Not tied to a listing</option>
                      {currentPartner.listings.map((l) => <option key={l.listingId} value={l.listingId}>{l.address}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <p className={labelCls}>What it is for</p>
                  <div className="space-y-2">
                    {lines.map((line, i) => (
                      <div key={i} className="flex gap-2">
                        <input aria-label={`Line ${i + 1} description`} className={inputCls} value={line.description} maxLength={160} placeholder="Share of flyer printing"
                          onChange={(e) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, description: e.target.value } : l)))} />
                        <input aria-label={`Line ${i + 1} amount`} inputMode="decimal" className={`${inputCls} !w-28 shrink-0`} value={line.amount} placeholder="$0.00"
                          onChange={(e) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, amount: e.target.value } : l)))} />
                        {lines.length > 1 && (
                          <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} className="shrink-0 rounded-lg px-2 text-lg text-slate-400">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {LINE_IDEAS.map((idea) => (
                      <button key={idea} type="button" className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
                        onClick={() => setLines((prev) => {
                          const emptyAt = prev.findIndex((l) => !l.description.trim() && !l.amount.trim())
                          if (emptyAt >= 0) return prev.map((l, j) => (j === emptyAt ? { ...l, description: idea } : l))
                          return prev.length >= 20 ? prev : [...prev, { description: idea, amount: '' }]
                        })}>
                        + {idea}
                      </button>
                    ))}
                    <button type="button" className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600" onClick={() => setLines((prev) => (prev.length >= 20 ? prev : [...prev, emptyLine()]))}>+ Another line</button>
                  </div>
                  <p className="mt-2 text-right text-sm font-black text-slate-900">Total {formatCents(totalCents)}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="inv-due">Due date (optional)</label>
                    <input id="inv-due" type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="inv-pay">How should they pay you?</label>
                  <textarea id="inv-pay" rows={2} maxLength={1000} className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="Zelle to you@example.com, or check payable to…" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="inv-note">Note (optional)</label>
                  <textarea id="inv-note" rows={2} maxLength={1000} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <p className="text-xs text-slate-500">
                  HomeListingAI does not process or hold payments and is not a party to this invoice. Check with your compliance team that the amounts you charge are right for your state.
                </p>
                {formError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
                <button type="submit" disabled={saving || totalCents === 0} className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50">
                  {saving ? 'Sending…' : `Send invoice${totalCents ? ` · ${formatCents(totalCents)}` : ''}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LOInvoicesPage
