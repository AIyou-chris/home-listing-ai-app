import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicInvoice, formatCents, type Invoice } from '../services/loInvoiceService'

// Public invoice a loan officer sent to an agent. Anyone with the link can read it (the link is the
// secret). It is deliberately a plain document: no pay button, because payment happens directly
// between the loan officer and the agent, never through HomeListingAI.

const longDate = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const InvoicePage: React.FC = () => {
  const { token = '' } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [disclaimer, setDisclaimer] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading')

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Invoice'
    // The site already has a robots tag (index,follow). Change that one for this page and put it back after.
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const created = !robots
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    const previousRobots = robots.content
    robots.content = 'noindex, nofollow'
    return () => {
      document.title = previousTitle
      if (created) robots?.remove()
      else if (robots) robots.content = previousRobots
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchPublicInvoice(token)
      .then((data) => {
        if (cancelled) return
        setInvoice(data.invoice)
        setDisclaimer(data.disclaimer)
        setState('ready')
        document.title = `Invoice ${data.invoice.invoiceNumber}`
      })
      .catch((err: Error) => { if (!cancelled) setState(err.message === 'not_found' ? 'missing' : 'failed') })
    return () => { cancelled = true }
  }, [token])

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Loading invoice…</div>
  }

  if (state !== 'ready' || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-black text-slate-900">{state === 'missing' ? 'Invoice not found' : 'Could not load the invoice'}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {state === 'missing'
              ? 'This link is not valid. Check the email you received, or ask your loan officer to send it again.'
              : 'Please try again in a moment.'}
          </p>
        </div>
      </div>
    )
  }

  const isVoid = invoice.status === 'void'
  const badge =
    invoice.status === 'paid' ? { text: `Paid ${longDate(invoice.paidAt)}`, cls: 'bg-green-100 text-green-800' }
    : invoice.status === 'overdue' ? { text: 'Overdue', cls: 'bg-red-100 text-red-800' }
    : isVoid ? { text: 'Void', cls: 'bg-slate-200 text-slate-700' }
    : { text: 'Open', cls: 'bg-blue-100 text-blue-800' }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <style>{'@media print { .no-print { display: none !important; } }'}</style>
      <main className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:shadow-none sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Invoice</p>
            <h1 className="text-2xl font-black text-slate-900">{invoice.invoiceNumber}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>{badge.text}</span>
        </div>

        {isVoid && (
          <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            This invoice was cancelled by your loan officer. You do not need to pay it.
          </p>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">From</p>
            <p className="mt-1 text-base font-bold text-slate-900">{invoice.loName || 'Your loan officer'}</p>
            {invoice.loCompany && <p className="text-sm text-slate-600">{invoice.loCompany}</p>}
            {invoice.loNmls && <p className="text-sm text-slate-600">NMLS #{invoice.loNmls}</p>}
            {invoice.loEmail && <p className="text-sm text-slate-600">{invoice.loEmail}</p>}
            {invoice.loPhone && <p className="text-sm text-slate-600">{invoice.loPhone}</p>}
          </section>
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">To</p>
            <p className="mt-1 text-base font-bold text-slate-900">{invoice.agentName || invoice.agentEmail}</p>
            {invoice.agentName && <p className="text-sm text-slate-600">{invoice.agentEmail}</p>}
            <p className="mt-3 text-sm text-slate-600">Issued {longDate(invoice.sentAt)}</p>
            {invoice.dueDate && <p className="text-sm font-semibold text-slate-800">Due {longDate(invoice.dueDate)}</p>}
          </section>
        </div>

        {invoice.listingAddress && (
          <p className="mt-6 text-sm text-slate-700">
            <span className="font-bold">Listing:</span> {invoice.listingAddress}
          </p>
        )}

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 font-bold">Description</th>
              <th className="py-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((line, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-2.5 pr-3 text-slate-800">{line.description}</td>
                <td className="whitespace-nowrap py-2.5 text-right text-slate-800">{formatCents(line.amountCents)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-4 text-base font-black text-slate-900">Total</td>
              <td className="pt-4 text-right text-base font-black text-slate-900">{formatCents(invoice.totalCents)}</td>
            </tr>
          </tbody>
        </table>

        {invoice.paymentInstructions && !isVoid && invoice.status !== 'paid' && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">How to pay</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{invoice.paymentInstructions}</p>
          </section>
        )}

        {invoice.note && (
          <section className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Note</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{invoice.note}</p>
          </section>
        )}

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">{disclaimer}</p>

        <div className="no-print mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
            Print or save as PDF
          </button>
          {invoice.loEmail && (
            <a href={`mailto:${invoice.loEmail}?subject=${encodeURIComponent(`Invoice ${invoice.invoiceNumber}`)}`} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
              Email {invoice.loName?.split(' ')[0] || 'your loan officer'}
            </a>
          )}
        </div>
      </main>
    </div>
  )
}

export default InvoicePage
