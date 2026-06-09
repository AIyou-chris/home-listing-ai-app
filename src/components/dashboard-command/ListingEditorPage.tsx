import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDemoMode } from '../../demo/useDemoMode'
import { useBlueprintMode } from '../../demo/useBlueprintMode'
import { buildApiUrl } from '../../lib/api'
import {
  createListingBuilderSource,
  deleteListingBuilderSource,
  fetchListingBuilderPayload,
  generateListingDescription,
  type ListingBrainSourceStatus,
  type ListingBrainSourceType,
  type ListingBuilderSource,
  patchListingBuilder,
  retrainListingBrain,
  uploadListingBrainDoc
} from '../../services/listingBuilderService'
import { publishListingShareKit } from '../../services/dashboardCommandService'
import { getLocalListingDraft, saveLocalListingDraft } from '../../services/listingDraftStorage'
import { uploadListingPhoto } from '../../services/listingMediaService'
import FairHousingScannerModal from '../modals/FairHousingScannerModal'

type EditorSection = 'essentials' | 'photos' | 'people' | 'brain'

type AgentProfile = {
  id?: string
  first_name: string
  last_name: string
  email: string
  phone: string
  headshot_url: string
  company: string
  nmls_number: string
  title: string
}

type LoProfile = {
  id: string
  name: string
  email: string | null
  phone: string | null
  headshot_url: string | null
  company: string | null
  nmls_number: string | null
  branding_enabled?: boolean
} | null

type ListingDraftState = {
  address: string
  price: number
  beds: number
  baths: number
  sqft: number
  description: string
}

const SECTIONS: Array<{ key: EditorSection; label: string }> = [
  { key: 'essentials', label: 'Essentials' },
  { key: 'photos', label: 'Photos' },
  { key: 'people', label: 'People' },
  { key: 'brain', label: 'Listing Brain' }
]

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatUpdatedTime = (iso: string | null) => {
  if (!iso) return 'Unknown'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const createEmptyDraft = (): ListingDraftState => ({
  address: '', price: 0, beds: 0, baths: 0, sqft: 0, description: ''
})

const normalizeStatusLabel = (status: string) => {
  const n = String(status || '').toLowerCase()
  return n === 'draft' || n === 'pending' ? 'Draft' : 'Published'
}

const sourceTypeLabel = (type: ListingBrainSourceType) => {
  if (type === 'doc') return 'Doc'
  if (type === 'url') return 'URL'
  return 'Text'
}

const sourceTypeIcon = (type: ListingBrainSourceType) => {
  if (type === 'doc') return '📄'
  if (type === 'url') return '🌐'
  return '📝'
}

// Format digits-only string with commas (e.g. "450000" → "450,000")
const formatWithCommas = (raw: string): string => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

// Allow digits only
const digitsOnly = (raw: string) => raw.replace(/\D/g, '')

// Allow digits + single decimal point, max 1 decimal digit (e.g. "2.5")
const sanitizeDecimal = (raw: string): string => {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return cleaned.slice(0, dot + 2)
}

const DEFAULT_LISTING_ADDRESS = '123 Main St'

// ── Shared style tokens ────────────────────────────────────────────────────────

const card = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const fieldCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100'
const sectionLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400'
const outlineBtn =
  'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

// Convert a File to a base64 data URL (survives page refresh, safe for localStorage)
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// ── Payment Scenarios ──────────────────────────────────────────────────────────

// ── Payment helpers ────────────────────────────────────────────────────────────

const calcMonthlyPayment = (price: number, downPct: number, annualRate: number, years = 30) => {
  if (!price || price <= 0 || annualRate <= 0) return 0
  const loanAmt = price * (1 - downPct / 100)
  const r = annualRate / 100 / 12
  const n = years * 12
  return loanAmt * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

const fmtDollar = (n: number) =>
  n >= 1000 ? `$${Math.round(n).toLocaleString('en-US')}` : `$${Math.round(n)}`

const fmtPct = (n: number | undefined | null) =>
  n != null ? `${Number(n).toFixed(3)}%` : '—'

// Default auto-calculated scenarios (used when no CSV loaded)
const AUTO_SCENARIOS = [
  { label: 'FHA', downPct: 3.5, pmi: true, badge: 'bg-sky-100 text-sky-700', desc: '3.5% down · FHA insured' },
  { label: 'Conventional', downPct: 5, pmi: true, badge: 'bg-amber-100 text-amber-700', desc: '5% down · Conv. w/ PMI' },
  { label: 'Conv. 10%', downPct: 10, pmi: true, badge: 'bg-violet-100 text-violet-700', desc: '10% down · Lower PMI' },
  { label: 'No PMI', downPct: 20, pmi: false, badge: 'bg-emerald-100 text-emerald-700', desc: '20% down · No PMI' },
]

const CARD_BADGES = ['bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700']

// ── CSV parser ─────────────────────────────────────────────────────────────────

export interface CsvScenario {
  program: string
  downPct?: number       // e.g. 3.5 (meaning 3.5%)
  downAmt?: number       // absolute dollar amount (optional)
  rate?: number          // interest rate e.g. 6.875
  apr?: number           // APR e.g. 7.124
  monthlyPI?: number     // P&I from sheet (overrides calc)
  notes?: string
}

// Parse a minimal CSV into CsvScenario rows.
// Supported headers (case-insensitive, flexible): program/name, down%/down pct/down payment %,
// down amount/down amt, rate/interest rate, apr, monthly/monthly payment/payment, notes
const parseCsv = (raw: string): CsvScenario[] => {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Tokenize one CSV line (handles quoted fields)
  const tokenize = (line: string): string[] => {
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    cols.push(cur.trim())
    return cols
  }

  const headers = tokenize(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9 %]/g, '').trim())

  const colIdx = (candidates: string[]): number => {
    for (const c of candidates) {
      const i = headers.findIndex(h => h === c || h.includes(c))
      if (i !== -1) return i
    }
    return -1
  }

  const iProgram  = colIdx(['program', 'name', 'loan type', 'type'])
  const iDown     = colIdx(['down %', 'down pct', 'down payment %', 'down percentage', 'down'])
  const iDownAmt  = colIdx(['down amount', 'down amt', 'down $'])
  const iRate     = colIdx(['rate', 'interest rate', 'note rate'])
  const iApr      = colIdx(['apr', 'annual percentage rate'])
  const iMonthly  = colIdx(['monthly payment', 'monthly pi', 'monthly p&i', 'monthly', 'payment', 'p&i'])
  const iNotes    = colIdx(['notes', 'note', 'comments', 'description'])

  return lines.slice(1).map(line => {
    const cols = tokenize(line)
    const get = (i: number) => (i !== -1 && cols[i] ? cols[i].replace(/[$,%]/g, '').trim() : undefined)
    const getNum = (i: number) => { const v = get(i); return v ? parseFloat(v) || undefined : undefined }

    return {
      program:  get(iProgram)  || `Option ${lines.indexOf(line)}`,
      downPct:  getNum(iDown),
      downAmt:  getNum(iDownAmt),
      rate:     getNum(iRate),
      apr:      getNum(iApr),
      monthlyPI:getNum(iMonthly),
      notes:    get(iNotes),
    } satisfies CsvScenario
  }).filter(r => r.program)
}

// ── PaymentScenariosSection ────────────────────────────────────────────────────

// Convert parsed CSV rows into a clean text block the AI can read verbatim
const csvToKbText = (rows: CsvScenario[], uploadedAt: string): string => {
  const header = `=== LO RATE SHEET (Updated: ${uploadedAt}) ===\n`
  const body = rows.map(r => {
    const parts = [
      `Program: ${r.program}`,
      r.downPct != null ? `Down: ${r.downPct}%` : r.downAmt ? `Down: $${r.downAmt.toLocaleString()}` : null,
      r.rate != null ? `Rate: ${r.rate.toFixed(3)}%` : null,
      r.apr != null ? `APR: ${r.apr.toFixed(3)}%` : null,
      r.monthlyPI != null ? `Monthly P&I: $${Math.round(r.monthlyPI).toLocaleString()}` : null,
      r.notes ? `Notes: ${r.notes}` : null,
    ].filter(Boolean).join(' | ')
    return `• ${parts}`
  }).join('\n')
  return `${header}${body}`
}

// ── PaymentScenariosSection — clean 4-card reference calculator ────────────────

const PaymentScenariosSection: React.FC<{ price: number; rate: string; onRateChange: (r: string) => void }> = ({ price, rate, onRateChange }) => {
  const annualRate = parseFloat(rate) || 7.0
  const monthlyTax = price > 0 ? (price * 0.012) / 12 : 0
  const monthlyIns = price > 0 ? (price * 0.005) / 12 : 0

  if (!price || price <= 0) return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center text-sm text-slate-400">
      💰 Add a listing price in Essentials to see payment estimates.
    </div>
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header + rate input */}
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">💰</span>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Payment Reference</p>
          </div>
          <p className="text-xs text-slate-500">Quick estimate based on {fmtDollar(price)} purchase price. Your rate sheet above is what the bot quotes to buyers.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Rate</span>
          <input
            type="number" min="2" max="15" step="0.125"
            value={rate} onChange={e => onRateChange(e.target.value)}
            className="w-12 text-sm font-bold text-slate-900 focus:outline-none text-center"
          />
          <span className="text-[11px] font-semibold text-slate-400">%</span>
        </div>
      </div>

      {/* 4-card grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
        {AUTO_SCENARIOS.map(sc => {
          const downAmt = price * (sc.downPct / 100)
          const loanAmt = price - downAmt
          const pi = calcMonthlyPayment(price, sc.downPct, annualRate)
          const pmiAmt = sc.pmi ? (loanAmt * 0.0085) / 12 : 0
          const totalMonthly = pi + monthlyTax + monthlyIns + pmiAmt

          return (
            <div key={sc.label} className="p-4 space-y-2.5">
              <div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${sc.badge}`}>{sc.label}</span>
                <p className="text-[10px] text-slate-400 mt-1">{sc.desc}</p>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 leading-none">{fmtDollar(totalMonthly)}<span className="text-[10px] font-semibold text-slate-400">/mo</span></p>
              </div>
              <div className="space-y-0.5 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                <div className="flex justify-between"><span>Down</span><span className="font-semibold text-slate-700">{fmtDollar(downAmt)}</span></div>
                <div className="flex justify-between"><span>P&amp;I</span><span className="font-semibold text-slate-700">{fmtDollar(pi)}/mo</span></div>
                {sc.pmi && <div className="flex justify-between"><span>PMI est.</span><span className="font-semibold text-slate-700">{fmtDollar(pmiAmt)}/mo</span></div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* RESPA footer */}
      <div className="border-t border-slate-100 bg-amber-50 px-4 py-2.5">
        <p className="text-[10px] text-amber-800 leading-relaxed">
          <strong>Estimates only — not a loan commitment.</strong> Figures assume a 30-yr fixed loan. Tax est. 1.2%/yr · insurance 0.5%/yr · PMI 0.85%/yr (LTV &gt;80%). Actual rate, APR, and payment will vary. Equal Housing Lender.
        </p>
      </div>
    </div>
  )
}

// ── LoBrainSection — rate sheet CSV + financing notes ─────────────────────────

interface LoBrainSectionProps {
  draft: { address: string; price: number }
  demoMode: boolean
  isLocalOnly: boolean
  loBrainDocId: string | null
  setLoBrainDocId: (id: string | null) => void
  loBrainContent: string
  setLoBrainContent: (v: string) => void
  savingLoBrain: boolean
  setSavingLoBrain: (v: boolean) => void
  loBrainSaved: boolean
  setLoBrainSaved: (v: boolean) => void
  csvScenarios: CsvScenario[]
  setCsvScenarios: (v: CsvScenario[]) => void
  csvFileName: string
  setCsvFileName: (v: string) => void
  csvUploadedAt: string | null
  setCsvUploadedAt: (v: string | null) => void
  onSave: () => Promise<void>
}

const LoBrainSection: React.FC<LoBrainSectionProps> = ({
  draft, demoMode: _dm, isLocalOnly: _lo,
  loBrainContent, setLoBrainContent,
  savingLoBrain, loBrainSaved,
  csvScenarios, setCsvScenarios,
  csvFileName, setCsvFileName,
  csvUploadedAt, setCsvUploadedAt,
  onSave
}) => {
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const hasCsv = csvScenarios.length > 0
  const price = draft.price

  const monthlyTax = price > 0 ? (price * 0.012) / 12 : 0
  const monthlyIns = price > 0 ? (price * 0.005) / 12 : 0

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCsvError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string
        const rows = parseCsv(raw)
        if (rows.length === 0) { setCsvError('No valid rows found — check your column headers (see format guide below).'); return }
        if (rows.length > 20) { setCsvError('Max 20 programs. Trim your rate sheet to 20 rows.'); return }
        setCsvScenarios(rows)
        setCsvFileName(file.name)
        setCsvUploadedAt(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      } catch { setCsvError('Could not parse CSV. Save as plain .csv and try again.') }
    }
    reader.readAsText(file)
  }

  const clearCsv = () => { setCsvScenarios([]); setCsvFileName(''); setCsvUploadedAt(null); setCsvError(null) }

  return (
    <div className="rounded-xl border border-violet-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="border-b border-violet-100 bg-violet-50 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🧠</span>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">LO Financing Brain</p>
          <span className="text-[10px] text-slate-400">· What the bot knows about financing for this listing</span>
        </div>
        <p className="text-sm text-slate-500">
          Upload your current rate sheet CSV — the bot pulls from it when buyers ask about FHA, VA, Conventional, rates, down payments, or programs. Update it whenever rates change.
        </p>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Rate Sheet Upload ── */}
        <div className={`rounded-xl border-2 ${hasCsv ? 'border-emerald-200 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50'} overflow-hidden`}>

          {hasCsv ? (
            /* ── Loaded state: header + preview table ── */
            <div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <span className="material-symbols-outlined text-sm">check</span>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">{csvFileName}</p>
                    <p className="text-[11px] text-emerald-600">{csvScenarios.length} programs loaded · Updated {csvUploadedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    Replace
                  </button>
                  <button
                    onClick={clearCsv}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-emerald-100 bg-emerald-50/50 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      <th className="px-4 py-2.5 text-left">Program</th>
                      <th className="px-3 py-2.5 text-right">Down</th>
                      <th className="px-3 py-2.5 text-right">Rate</th>
                      <th className="px-3 py-2.5 text-right">APR</th>
                      <th className="px-3 py-2.5 text-right">P&amp;I /mo</th>
                      {price > 0 && <th className="px-3 py-2.5 text-right">Est. Total /mo</th>}
                      <th className="px-4 py-2.5 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {csvScenarios.map((sc, i) => {
                      const effectiveRate = sc.rate ?? 7.0
                      const effectiveDown = sc.downPct ?? (sc.downAmt && price ? (sc.downAmt / price) * 100 : 20)
                      const pi = sc.monthlyPI ?? (price > 0 ? calcMonthlyPayment(price, effectiveDown, effectiveRate) : 0)
                      const loanAmt = price > 0 ? price * (1 - effectiveDown / 100) : 0
                      const pmiAmt = effectiveDown < 20 && loanAmt > 0 ? (loanAmt * 0.0085) / 12 : 0
                      const total = price > 0 ? pi + monthlyTax + monthlyIns + pmiAmt : 0

                      return (
                        <tr key={i} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${CARD_BADGES[i % CARD_BADGES.length]}`}>
                              {sc.program}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                            {sc.downPct != null ? `${sc.downPct}%` : sc.downAmt ? fmtDollar(sc.downAmt) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-600">
                            {sc.rate != null ? `${sc.rate.toFixed(3)}%` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                            {fmtPct(sc.apr)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                            {pi > 0 ? fmtDollar(pi) : sc.monthlyPI ? fmtDollar(sc.monthlyPI) : '—'}
                          </td>
                          {price > 0 && (
                            <td className="px-3 py-2.5 text-right">
                              <span className="font-black text-slate-900">{total > 0 ? fmtDollar(total) : '—'}</span>
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-slate-500 max-w-[160px] truncate">{sc.notes || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {price > 0 && (
                  <div className="border-t border-emerald-100 bg-emerald-50/30 px-4 py-1.5 text-[9px] text-slate-400">
                    Est. Total = P&amp;I + tax (1.2%/yr) + insurance (0.5%/yr) + PMI where applicable. APR from your CSV.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Empty state: upload prompt ── */
            <div className="px-5 py-6">
              <div className="flex flex-col items-center text-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <span className="material-symbols-outlined text-2xl text-slate-400">table_chart</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Upload your rate sheet</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
                    The bot quotes directly from this when buyers ask about FHA, VA, rates, or down payments. Update it as rates change.
                  </p>
                </div>
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  Upload Rate Sheet (.csv)
                </button>
              </div>

              {/* Format guide */}
              <details className="border border-slate-200 rounded-lg overflow-hidden">
                <summary className="cursor-pointer px-4 py-2.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition list-none flex items-center justify-between">
                  <span>📋 CSV format guide — click to expand</span>
                  <span className="material-symbols-outlined text-sm text-slate-400">expand_more</span>
                </summary>
                <div className="px-4 py-3 space-y-2.5 bg-white">
                  <p className="text-[11px] text-slate-500">Column headers are flexible — the importer recognizes common variations. Minimum required: <strong>Program</strong> + at least one of Rate, APR, or Monthly Payment.</p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-[10px] text-slate-300 leading-relaxed">
                    <div className="text-slate-500 mb-1"># Accepted column names (pick any):</div>
                    <div className="text-emerald-400">Program, Down%, Rate, APR, Monthly Payment, Notes</div>
                    <div className="mt-3 text-slate-500"># Example rows:</div>
                    <div>Program,Down%,Rate,APR,Monthly Payment,Notes</div>
                    <div>FHA 30yr Fixed,3.5,6.875,7.124,1642,Min 580 FICO · MIP required</div>
                    <div>Conventional 30yr,5,7.000,7.215,1698,620+ FICO · PMI until 20% equity</div>
                    <div>VA 30yr Fixed,0,6.625,6.891,1591,Veterans &amp; active duty · no PMI</div>
                    <div>USDA Rural,0,6.750,7.012,1609,Rural areas · income limits apply</div>
                    <div>Conv. 20% Down,20,6.750,6.901,1365,No PMI · best rate</div>
                    <div>2/1 Buydown,5,5.875*,7.215,1529,*Yr1 rate — seller-paid option</div>
                    <div className="mt-2 text-slate-500"># Tip: export directly from your LOS or Optimal Blue</div>
                  </div>
                  <p className="text-[10px] text-slate-400">Up to 20 programs per upload. Re-upload any time rates change — each upload is date-stamped so buyers see fresh data.</p>
                </div>
              </details>
            </div>
          )}

          {csvError && (
            <div className="border-t border-rose-100 bg-rose-50 px-4 py-2.5">
              <p className="text-xs text-rose-600 font-medium">{csvError}</p>
            </div>
          )}
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
        </div>

        {/* ── Free-form financing notes ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Additional Financing Notes</p>
            <p className="text-[10px] text-slate-400">Optional — supplements the rate sheet above</p>
          </div>
          <textarea
            value={loBrainContent}
            onChange={e => setLoBrainContent(e.target.value)}
            placeholder={`• Close in 21 days — fast underwriting\n• 2/1 buydown available — seller can contribute\n• First-time buyer programs: TSAHC, TDHCA (TX)\n• Jumbo up to $3M available\n• Bank statement loans for self-employed buyers`}
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {/* ── Save button ── */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Rate sheet + notes are saved to the bot's memory for this listing. Re-upload the CSV whenever rates change to keep the bot current.
          </p>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={savingLoBrain || (!hasCsv && !loBrainContent.trim())}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">{loBrainSaved ? 'check_circle' : 'save'}</span>
            {savingLoBrain ? 'Saving…' : loBrainSaved ? 'Saved to Bot!' : 'Save to Bot'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

const ListingEditorPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const demoMode = useDemoMode()
  const blueprintMode = useBlueprintMode()
  const { listingId = '' } = useParams<{ listingId: string }>()

  const [activeSection, setActiveSection] = useState<EditorSection>('essentials')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLocalOnly, setIsLocalOnly] = useState(false)
  const [listingStatus, setListingStatus] = useState('draft')
  const [draft, setDraft] = useState<ListingDraftState>(createEmptyDraft())
  const [photos, setPhotos] = useState<string[]>([])
  const [sources, setSources] = useState<ListingBuilderSource[]>([])
  const [photoUrlInput, setPhotoUrlInput] = useState('')
  const [sourceBusy, setSourceBusy] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docUploadError, setDocUploadError] = useState<string | null>(null)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [fairHousingOpen, setFairHousingOpen] = useState(false)

  // Brain modal — replaces window.prompt()
  const [brainModal, setBrainModal] = useState<{ type: 'text' | 'url'; value: string } | null>(null)

  // ── Viewer role ───────────────────────────────────────────────────────────────
  // 'owner' = listing agent (full edit), 'lo' = assigned LO (read + LO Brain edit)
  const [viewerRole, setViewerRole] = useState<'owner' | 'lo'>('owner')
  // Whether the signed-in user is a loan officer (account_type 'lo'). Used to route the
  // "Back" button to the LO listings page even for listings the LO owns (viewerRole 'owner').
  const isLoUser = typeof window !== 'undefined' && localStorage.getItem('hla_account_type') === 'lo'
  const backToListings = (viewerRole === 'lo' || isLoUser) ? '/lo-listings' : '/listings'
  // For LO view: the listing agent's profile (to show in People tab)
  const [listingAgentProfile, setListingAgentProfile] = useState<{
    first_name?: string; last_name?: string; email?: string; phone?: string;
    headshot_url?: string; company?: string; nmls_number?: string; title?: string;
  } | null>(null)

  // ── LO Brain + Payment Scenarios ─────────────────────────────────────────────
  const [loRate, setLoRate] = useState('7.0')
  const [loBrainDocId, setLoBrainDocId] = useState<string | null>(null)
  const [loBrainContent, setLoBrainContent] = useState('')
  const [savingLoBrain, setSavingLoBrain] = useState(false)
  const [loBrainSaved, setLoBrainSaved] = useState(false)
  // CSV rate sheet
  const [csvScenarios, setCsvScenarios] = useState<CsvScenario[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [csvUploadedAt, setCsvUploadedAt] = useState<string | null>(null)
  // Payment disclosures
  const [disclosuresDocId, setDisclosuresDocId] = useState<string | null>(null)
  const [disclosuresContent, setDisclosuresContent] = useState('')
  const [savingDisclosures, setSavingDisclosures] = useState(false)
  const [disclosuresSaved, setDisclosuresSaved] = useState(false)

  // ── People tab state ──────────────────────────────────────────────────────
  const emptyProfile = (): AgentProfile => ({ first_name: '', last_name: '', email: '', phone: '', headshot_url: '', company: '', nmls_number: '', title: '' })
  const [agentProfile, setAgentProfile] = useState<AgentProfile>(emptyProfile())
  const [agentProfileLoaded, setAgentProfileLoaded] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [attachedLo, setAttachedLo] = useState<LoProfile>(null)
  const [_loLoaded, setLoLoaded] = useState(false)
  const [loSearch, setLoSearch] = useState('')
  const [loSearchResults, setLoSearchResults] = useState<NonNullable<LoProfile>[]>([])
  const [loSearching, setLoSearching] = useState(false)
  const [attachingLo, setAttachingLo] = useState(false)
  const [detachingLo, setDetachingLo] = useState(false)
  const [headshotUploading, setHeadshotUploading] = useState(false)
  const headshotFileRef = useRef<HTMLInputElement | null>(null)

  // Free-form display strings — formatted while typing, stripped on Save
  const [priceDisplay, setPriceDisplay] = useState('')
  const [bedsDisplay, setBedsDisplay] = useState('')
  const [bathsDisplay, setBathsDisplay] = useState('')
  const [sqftDisplay, setSqftDisplay] = useState('')

  const photoFileRef = useRef<HTMLInputElement | null>(null)
  const docFileRef = useRef<HTMLInputElement | null>(null)

  const dashboardRoot = useMemo(
    () => (location.pathname.startsWith('/dashboard') ? '/dashboard' : '/demo-dashboard'),
    [location.pathname]
  )
  const appendDemoQuery = useMemo(
    () => (demoMode && dashboardRoot === '/dashboard' ? '?demo=1' : ''),
    [dashboardRoot, demoMode]
  )
  const buildListingPath = (suffix: string) => `${dashboardRoot}${suffix}${appendDemoQuery}`

  const listingLabel = draft.address.trim() || 'Untitled Listing'
  const statusLabel = normalizeStatusLabel(listingStatus)

  const canPublish = useMemo(
    () =>
      draft.address.trim().length > 0 &&
      Number(priceDisplay.replace(/,/g, '')) > 0 &&
      Number(bedsDisplay) > 0 &&
      Number(bathsDisplay) > 0 &&
      Number(sqftDisplay) > 0,
    [draft.address, priceDisplay, bedsDisplay, bathsDisplay, sqftDisplay]
  )

  const lastTrainedAt = useMemo(() => {
    const times = sources
      .map((s) => s.trained_at)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .map((v) => new Date(v).getTime())
      .filter((v) => Number.isFinite(v))
    return times.length === 0 ? null : new Date(Math.max(...times)).toISOString()
  }, [sources])

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    const applyDisplayValues = (price: number, beds: number, baths: number, sqft: number) => {
      setPriceDisplay(price > 0 ? price.toLocaleString('en-US') : '')
      setBedsDisplay(beds > 0 ? String(beds) : '')
      setBathsDisplay(baths > 0 ? String(baths) : '')
      setSqftDisplay(sqft > 0 ? String(sqft) : '')
    }

    const loadFromLocal = (message: string | null) => {
      const local = getLocalListingDraft(listingId)
      const fb = local || {
        id: listingId, title: 'Draft Listing', address: DEFAULT_LISTING_ADDRESS,
        price: 0, bedrooms: 0, bathrooms: 0, squareFeet: 0,
        description: '', amenities: [], photos: [], createdAt: new Date().toISOString()
      }
      if (cancelled) return
      setIsLocalOnly(true)
      setListingStatus('draft')
      setDraft({ address: fb.address, price: fb.price, beds: fb.bedrooms, baths: fb.bathrooms, sqft: fb.squareFeet, description: fb.description })
      applyDisplayValues(fb.price, fb.bedrooms, fb.bathrooms, fb.squareFeet)
      setPhotos((fb.photos || []).slice(0, 6))
      setSources([])
      setError(null)
      setNotice(message)
      setLoading(false)
    }

    const load = async () => {
      if (!listingId) { setError('Missing listing id.'); setLoading(false); return }
      setLoading(true)
      setError(null)

      // Local draft IDs (prefix 'draft-') always live in sessionStorage — no API call needed
      if (listingId.startsWith('draft-') || blueprintMode) {
        loadFromLocal(null)
        return
      }

      // Real listing IDs: hit the API (in demo mode, fetchListingBuilderPayload returns in-memory demo data)
      try {
        const payload = await fetchListingBuilderPayload(listingId)
        if (cancelled) return
        const price = Number(payload.listing.price) || 0
        const beds = Number(payload.listing.beds) || 0
        const baths = Number(payload.listing.baths) || 0
        const sqft = Number(payload.listing.sqft) || 0
        setIsLocalOnly(false)
        setNotice(null)
        setListingStatus(payload.listing.status || 'draft')
        setDraft({ address: payload.listing.address || '', price, beds, baths, sqft, description: payload.listing.description || '' })
        applyDisplayValues(price, beds, baths, sqft)
        setPhotos((payload.listing.photos || []).slice(0, 6))
        setSources(payload.brain_sources || [])
        const p = payload as { viewer_role?: 'owner' | 'lo'; listing_agent_profile?: typeof listingAgentProfile }
        setViewerRole(p.viewer_role || 'owner')
        if (p.listing_agent_profile) setListingAgentProfile(p.listing_agent_profile)
      } catch (err) {
        // Only fall back to a cached local draft — never silently show blank "123 Main St"
        // (This prevents the broken-API-then-save-stale-data feedback loop)
        const local = getLocalListingDraft(listingId)
        if (local) { loadFromLocal('Connection issue — showing cached draft.'); return }
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load listing editor.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [blueprintMode, listingId])

  const openFairHousing = () => setFairHousingOpen(true)

  const updateDraft = (key: keyof ListingDraftState, value: string | number) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  // ── Photo actions ─────────────────────────────────────────────────────────

  const doUploadFile = async (file: File) => {
    if (photos.length >= 6) { toast.error('Maximum 6 photos allowed.'); return }
    setUploadingPhoto(true)
    try {
      // Use base64 data URL for local/demo so photos survive page refresh
      const url = demoMode || isLocalOnly ? await readAsDataUrl(file) : await uploadListingPhoto(file)
      if (!url) throw new Error('Upload did not return a URL.')
      setPhotos((prev) => [...prev, url].slice(0, 6))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleUploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void doUploadFile(file)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) void doUploadFile(file)
  }

  const addPhotoUrl = () => {
    const url = photoUrlInput.trim()
    if (!url) return
    if (photos.length >= 6) { toast.error('Maximum 6 photos allowed.'); return }
    setPhotos((prev) => [...prev, url].slice(0, 6))
    setPhotoUrlInput('')
  }

  const makePhotoPrimary = (index: number) => {
    const next = [...photos]
    const [picked] = next.splice(index, 1)
    setPhotos([picked, ...next].slice(0, 6))
  }

  // ── Source actions ────────────────────────────────────────────────────────

  const addLocalSource = (input: { type: ListingBrainSourceType; title: string; status?: ListingBrainSourceStatus; content?: string | null; url?: string | null }) => {
    const ts = new Date().toISOString()
    const status = input.status || 'needs_retrain'
    setSources((prev) => [{
      id: `local-${Date.now()}`,
      type: input.type, title: input.title, status,
      trained_at: status === 'trained' ? ts : null,
      updated_at: ts, content: input.content ?? null, url: input.url ?? null
    }, ...prev])
  }

  const appendDocFallbackSource = (file: File) => {
    const ts = new Date().toISOString()
    setSources((prev) => [{
      id: `local_${Date.now()}`,
      type: 'doc',
      title: file.name || 'Uploaded document',
      status: 'needs_retrain',
      trained_at: null,
      updated_at: ts,
      url: null,
      content: null
    }, ...prev])
  }

  const createSource = async (input: { type: ListingBrainSourceType; title: string; content?: string | null; url?: string | null }) => {
    const title = input.title.trim()
    if (!title) return
    if (demoMode || isLocalOnly) { addLocalSource({ ...input, title, status: 'needs_retrain' }); return }
    setSourceBusy(true)
    try {
      const source = await createListingBuilderSource(listingId, { ...input, title, status: 'needs_retrain' })
      setSources((prev) => [source, ...prev])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add source.')
    } finally {
      setSourceBusy(false)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (demoMode || isLocalOnly) { setSources((prev) => prev.filter((s) => s.id !== sourceId)); return }
    setSourceBusy(true)
    try {
      await deleteListingBuilderSource(listingId, sourceId)
      setSources((prev) => prev.filter((s) => s.id !== sourceId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete source.')
    } finally {
      setSourceBusy(false)
    }
  }

  const handleRetrain = async () => {
    if (sources.length === 0) return
    const nowIso = new Date().toISOString()
    if (demoMode || isLocalOnly) {
      setSources((prev) => prev.map((s) => ({ ...s, status: 'trained' as ListingBrainSourceStatus, trained_at: nowIso, updated_at: nowIso })))
      toast.success('Listing Brain retrained.')
      return
    }
    setSourceBusy(true)
    try {
      const result = await retrainListingBrain(listingId)
      setSources(result.sources)
      if (result.ai_summary) {
        updateDraft('description', result.ai_summary)
        setActiveSection('essentials')
        toast.success('AI wrote a listing description from your sources. Review it in Essentials.')
      } else {
        toast.success('Listing Brain retrained.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retrain failed.')
    } finally {
      setSourceBusy(false)
    }
  }

  // ── AI description generator ───────────────────────────────────────────────

  const handleGenerateDescription = async () => {
    const numPrice = Number(priceDisplay.replace(/,/g, '')) || 0
    const numBeds = Number(bedsDisplay) || 0
    const numBaths = Number(bathsDisplay) || 0
    const numSqft = Number(sqftDisplay) || 0

    if (demoMode || isLocalOnly) {
      // Demo: generate a placeholder so the feature is still demonstrable
      setGeneratingDesc(true)
      await new Promise((r) => setTimeout(r, 900))
      updateDraft('description', `Welcome to ${draft.address || 'this stunning home'} — a beautifully presented property offered at ${numPrice > 0 ? `$${numPrice.toLocaleString('en-US')}` : 'a competitive price'}. With ${numBeds} spacious bedrooms and ${numBaths} well-appointed bathrooms across ${numSqft > 0 ? `${numSqft.toLocaleString('en-US')} sq ft` : 'generous living space'}, this home is perfect for families and entertainers alike.\n\nThe thoughtful floor plan flows effortlessly from formal living areas into an open-concept kitchen and dining space, all bathed in natural light. Quality finishes and recent upgrades throughout make this a true move-in-ready opportunity.\n\nLocated in a sought-after neighbourhood close to top schools, parks, and everyday conveniences — this is the one you've been waiting for. Schedule your private showing today.`)
      setGeneratingDesc(false)
      return
    }

    setGeneratingDesc(true)
    try {
      const description = await generateListingDescription(listingId, {
        address: draft.address,
        price: numPrice,
        beds: numBeds,
        baths: numBaths,
        sqft: numSqft
      })
      updateDraft('description', description)
      toast.success('AI description ready — review and edit as needed.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate description.')
    } finally {
      setGeneratingDesc(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const numPrice = Number(priceDisplay.replace(/,/g, '')) || 0
    const numBeds = Number(bedsDisplay) || 0
    const numBaths = Number(bathsDisplay) || 0
    const numSqft = Number(sqftDisplay) || 0

    setSaving(true)
    try {
      if (isLocalOnly && listingId.startsWith('draft-')) {
        saveLocalListingDraft({
          id: listingId,
          title: draft.address.trim() || 'Draft Listing',
          address: draft.address || DEFAULT_LISTING_ADDRESS,
          price: numPrice, bedrooms: numBeds, bathrooms: numBaths, squareFeet: numSqft,
          description: draft.description, amenities: [], photos,
          createdAt: new Date().toISOString()
        })
        toast.success('Draft saved locally.')
        return
      }
      await patchListingBuilder(listingId, {
        address: draft.address, price: numPrice, beds: numBeds,
        baths: numBaths, sqft: numSqft, description: draft.description, photos
      })
      const refreshed = await fetchListingBuilderPayload(listingId)
      setListingStatus(refreshed.listing.status || 'draft')
      setSources(refreshed.brain_sources || [])
      setIsDirty(false)
      setNotice(null)
      toast.success('Listing saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save listing.')
    } finally {
      setSaving(false)
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const numPrice = Number(priceDisplay.replace(/,/g, '')) || 0
    const numBeds = Number(bedsDisplay) || 0
    const numBaths = Number(bathsDisplay) || 0
    const numSqft = Number(sqftDisplay) || 0

    // Already published — just navigate to Share Kit
    if (statusLabel === 'Published') {
      navigate(buildListingPath(`/listings/${listingId}`))
      return
    }

    // Demo / local — just mark as published locally
    if (demoMode || isLocalOnly) {
      setListingStatus('published')
      toast.success('Listing published! Opening Share Kit…')
      navigate(buildListingPath(`/listings/${listingId}`))
      return
    }

    setPublishing(true)
    try {
      // Save current form state first so published data is fresh
      await patchListingBuilder(listingId, {
        address: draft.address, price: numPrice, beds: numBeds,
        baths: numBaths, sqft: numSqft, description: draft.description, photos
      })

      // Then publish
      const result = await publishListingShareKit(listingId, true)
      setListingStatus(result.is_published ? 'published' : 'draft')
      toast.success('Listing published! Opening Share Kit…')
      navigate(buildListingPath(`/listings/${listingId}`))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish listing.')
    } finally {
      setPublishing(false)
    }
  }

  // ── People tab — load agent profile + attached LO ─────────────────────────

  useEffect(() => {
    if (demoMode || isLocalOnly || agentProfileLoaded) return
    const load = async () => {
      try {
        const { waitForAuthenticatedUserId } = await import('../../services/authSession')
        const uid = await waitForAuthenticatedUserId()
        const [profileRes, loRes] = await Promise.all([
          fetch(`/api/agent/profile`, { headers: { 'x-user-id': uid } }),
          listingId ? fetch(`/api/listings/${listingId}/lo-assignment`, { headers: { 'x-user-id': uid } }) : Promise.resolve(null)
        ])
        if (profileRes.ok) {
          const j = await profileRes.json()
          if (j.profile) {
            setAgentProfile({
              first_name: j.profile.first_name || '',
              last_name: j.profile.last_name || '',
              email: j.profile.email || '',
              phone: j.profile.phone || '',
              headshot_url: j.profile.headshot_url || '',
              company: j.profile.company || '',
              nmls_number: j.profile.nmls_number || '',
              title: j.profile.title || ''
            })
          }
        }
        setAgentProfileLoaded(true)
        if (loRes && loRes.ok) {
          const lj = await loRes.json()
          setAttachedLo(lj.lo || null)
        }
        setLoLoaded(true)
      } catch { /* silently fail — profile just stays empty */ }
    }
    void load()
  }, [demoMode, isLocalOnly, agentProfileLoaded, listingId])

  const handleSaveProfile = async () => {
    if (demoMode || isLocalOnly) { toast.success('Profile saved!'); return }
    setSavingProfile(true)
    try {
      const { waitForAuthenticatedUserId } = await import('../../services/authSession')
      const uid = await waitForAuthenticatedUserId()
      const res = await fetch('/api/agent/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify(agentProfile)
      })
      if (!res.ok) throw new Error('save failed')
      toast.success('Profile saved!')
    } catch { toast.error('Could not save profile.') } finally { setSavingProfile(false) }
  }

  const handleLoSearch = async (q: string) => {
    setLoSearch(q)
    if (q.length < 2) { setLoSearchResults([]); return }
    setLoSearching(true)
    try {
      const { waitForAuthenticatedUserId } = await import('../../services/authSession')
      const uid = await waitForAuthenticatedUserId()
      const res = await fetch(`/api/lo/search?q=${encodeURIComponent(q)}`, { headers: { 'x-user-id': uid } })
      const j = await res.json()
      setLoSearchResults(j.results || [])
    } catch { setLoSearchResults([]) } finally { setLoSearching(false) }
  }

  const handleAttachLo = async (lo: NonNullable<LoProfile>) => {
    if (!listingId || isLocalOnly) { setAttachedLo(lo); setLoSearch(''); setLoSearchResults([]); return }
    setAttachingLo(true)
    try {
      const { waitForAuthenticatedUserId } = await import('../../services/authSession')
      const uid = await waitForAuthenticatedUserId()
      const res = await fetch(`/api/listings/${listingId}/lo-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({ lo_id: lo.id })
      })
      const j = await res.json()
      if (j.success) { setAttachedLo(j.lo); setLoSearch(''); setLoSearchResults([]); toast.success(`${lo.name} attached!`) }
      else throw new Error(j.error)
    } catch { toast.error('Could not attach LO.') } finally { setAttachingLo(false) }
  }

  const handleDetachLo = async () => {
    if (!attachedLo) return
    if (isLocalOnly) { setAttachedLo(null); return }
    setDetachingLo(true)
    try {
      const { waitForAuthenticatedUserId } = await import('../../services/authSession')
      const uid = await waitForAuthenticatedUserId()
      await fetch(`/api/listings/${listingId}/lo-assignment`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({ lo_id: attachedLo.id })
      })
      setAttachedLo(null)
      toast.success('LO removed from this listing.')
    } catch { toast.error('Could not remove LO.') } finally { setDetachingLo(false) }
  }

  // ── LO Brain: load existing docs for this listing ────────────────────────
  const loadLoBrainDoc = async (address: string) => {
    if (!address.trim() || demoMode || isLocalOnly) return
    try {
      const { waitForAuthenticatedUserId } = await import('../../services/authSession')
      const uid = await waitForAuthenticatedUserId()
      const streetPart = address.split(',')[0].trim()
      const res = await fetch(buildApiUrl(`/api/lo/chatbot/listing-docs?address=${encodeURIComponent(streetPart)}`), { headers: { 'x-user-id': uid } })
      if (!res.ok) return
      const j = await res.json()
      const docs: Array<{ id: string; label?: string; content?: string }> = j.docs || []
      // Load financing notes doc
      const brainDoc = docs.find(d => !d.label?.startsWith('payment-disclosures'))
      if (brainDoc) { setLoBrainDocId(brainDoc.id); setLoBrainContent(brainDoc.content || '') }
      // Load disclosures doc
      const discDoc = docs.find(d => d.label?.startsWith('payment-disclosures'))
      if (discDoc) { setDisclosuresDocId(discDoc.id); setDisclosuresContent(discDoc.content || '') }
    } catch { /* silently fail — LO brain is optional */ }
  }

  const handleSaveLoBrain = async () => {
    const address = draft.address.trim()
    if (!address) { toast.error('Save the listing address first.'); return }
    const hasCsvContent = csvScenarios.length > 0 && csvUploadedAt
    const hasNotes = loBrainContent.trim().length > 0
    if (!hasCsvContent && !hasNotes) return
    setSavingLoBrain(true)
    try {
      if (demoMode || isLocalOnly) {
        await new Promise(r => setTimeout(r, 500))
        setLoBrainSaved(true)
        setTimeout(() => setLoBrainSaved(false), 2000)
        return
      }
      // Combine CSV rate sheet + free-form notes into one KB doc
      const parts: string[] = []
      if (hasCsvContent) parts.push(csvToKbText(csvScenarios, csvUploadedAt!))
      if (hasNotes) parts.push(`=== LO NOTES ===\n${loBrainContent.trim()}`)
      const combined = parts.join('\n\n')

      const { waitForAuthenticatedUserId } = await import('../../services/authSession')
      const uid = await waitForAuthenticatedUserId()
      const method = loBrainDocId ? 'PATCH' : 'POST'
      const url = loBrainDocId
        ? buildApiUrl(`/api/lo/chatbot/listing-docs/${loBrainDocId}`)
        : buildApiUrl('/api/lo/chatbot/listing-docs')
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({ address, label: `Financing notes – ${address.split(',')[0]}`, content: combined })
      })
      if (!res.ok) throw new Error('save_failed')
      const j = await res.json()
      if (j.doc?.id) setLoBrainDocId(j.doc.id)
      setLoBrainSaved(true)
      setTimeout(() => setLoBrainSaved(false), 2000)
    } catch { toast.error('Could not save LO Brain.') } finally { setSavingLoBrain(false) }
  }

  const handleSaveDisclosures = async () => {
    const address = draft.address.trim()
    if (!address) { toast.error('Save the listing address first.'); return }
    if (!disclosuresContent.trim()) return
    setSavingDisclosures(true)
    try {
      if (demoMode || isLocalOnly) {
        await new Promise(r => setTimeout(r, 400))
        setDisclosuresSaved(true)
        setTimeout(() => setDisclosuresSaved(false), 2000)
        return
      }
      const { waitForAuthenticatedUserId } = await import('../../services/authSession')
      const uid = await waitForAuthenticatedUserId()
      const method = disclosuresDocId ? 'PATCH' : 'POST'
      const url = disclosuresDocId
        ? buildApiUrl(`/api/lo/chatbot/listing-docs/${disclosuresDocId}`)
        : buildApiUrl('/api/lo/chatbot/listing-docs')
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({ address, label: `payment-disclosures – ${address.split(',')[0]}`, content: disclosuresContent.trim() })
      })
      if (!res.ok) throw new Error('save_failed')
      const j = await res.json()
      if (j.doc?.id) setDisclosuresDocId(j.doc.id)
      setDisclosuresSaved(true)
      setTimeout(() => setDisclosuresSaved(false), 2000)
    } catch { toast.error('Could not save disclosures.') } finally { setSavingDisclosures(false) }
  }

  const handleHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setHeadshotUploading(true)
    try {
      const url = await readAsDataUrl(file)
      setAgentProfile(p => ({ ...p, headshot_url: url }))
    } catch { toast.error('Could not load photo.') } finally { setHeadshotUploading(false) }
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className={`${card} p-6 text-sm text-slate-400`}>Loading listing…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      </div>
    )
  }

  // Preview line for Essentials strip
  const previewParts: string[] = []
  if (draft.address.trim()) previewParts.push(draft.address.trim())
  if (priceDisplay) previewParts.push(`$${priceDisplay}`)
  if (bedsDisplay) previewParts.push(`${bedsDisplay} bd`)
  if (bathsDisplay) previewParts.push(`${bathsDisplay} ba`)
  if (sqftDisplay) previewParts.push(`${sqftDisplay} sf`)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-6">

      {/* ── Page header ── */}
      <header className={`${card} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => navigate(buildListingPath(backToListings))}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {(viewerRole === 'lo' || isLoUser) ? 'Back to My Listings' : 'Back to Listings'}
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="truncate text-lg font-bold text-slate-900">{listingLabel}</h1>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                statusLabel === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {statusLabel}
              </span>
              {viewerRole === 'lo' && (
                <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-violet-700">
                  🧠 LO View
                </span>
              )}
            </div>
            {notice && <p className="text-xs text-amber-600">{notice}</p>}
          </div>
          {viewerRole === 'owner' && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="relative rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDirty && !saving && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
                )}
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                disabled={!canPublish || saving || publishing}
                onClick={() => void handlePublish()}
                className={outlineBtn}
              >
                {publishing ? 'Publishing…' : statusLabel === 'Published' ? 'View Share Kit' : 'Publish'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Editor card ── */}
      <div className={card}>

        {/* Step nav — always visible, all screen sizes */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            {SECTIONS.map((s, i) => {
              const isActive = activeSection === s.key
              const isDone = SECTIONS.findIndex(x => x.key === activeSection) > i
              return (
                <React.Fragment key={s.key}>
                  <button
                    type="button"
                    onClick={() => { setActiveSection(s.key); if (s.key === 'brain') void loadLoBrainDoc(draft.address) }}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : isDone ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < SECTIONS.length - 1 && (
                    <div className={`h-px flex-1 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* ── Section content ── */}
        <div className="p-4 md:p-6">

          {/* ════ ESSENTIALS ════ */}
          {activeSection === 'essentials' && (
            <div className="space-y-4">

              {/* LO read-only notice */}
              {viewerRole === 'lo' && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <span className="mt-0.5 text-base">ℹ️</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Listing details — view only</p>
                    <p className="text-xs text-blue-600 mt-0.5">The listing agent manages address, price, description, and photos. Head to the <strong>Listing Brain</strong> tab to update your financing info.</p>
                  </div>
                </div>
              )}

              {/* Basics card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Basics</p>

                {/* Address */}
                <div className="mb-4">
                  <label className={sectionLabel}>Property Address</label>
                  <input
                    value={draft.address}
                    readOnly={viewerRole === 'lo'}
                    onChange={(e) => updateDraft('address', e.target.value)}
                    placeholder="123 Main St, City, State 00000"
                    className={`${fieldCls} ${viewerRole === 'lo' ? 'cursor-default bg-slate-100 text-slate-600' : ''}`}
                  />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                  <div>
                    <label className={sectionLabel}>Price</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceDisplay}
                        readOnly={viewerRole === 'lo'}
                        onChange={(e) => { setPriceDisplay(formatWithCommas(e.target.value)); setIsDirty(true); }}
                        placeholder="0"
                        className={`${fieldCls} pl-6 ${viewerRole === 'lo' ? 'cursor-default bg-slate-100 text-slate-600' : ''}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={sectionLabel}>Beds</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bedsDisplay}
                      readOnly={viewerRole === 'lo'}
                      onChange={(e) => { setBedsDisplay(digitsOnly(e.target.value)); setIsDirty(true); }}
                      placeholder="0"
                      className={`${fieldCls} ${viewerRole === 'lo' ? 'cursor-default bg-slate-100 text-slate-600' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={sectionLabel}>Baths</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bathsDisplay}
                      readOnly={viewerRole === 'lo'}
                      onChange={(e) => { setBathsDisplay(sanitizeDecimal(e.target.value)); setIsDirty(true); }}
                      placeholder="0"
                      className={`${fieldCls} ${viewerRole === 'lo' ? 'cursor-default bg-slate-100 text-slate-600' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={sectionLabel}>Sq Ft</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={sqftDisplay}
                      readOnly={viewerRole === 'lo'}
                      onChange={(e) => { setSqftDisplay(digitsOnly(e.target.value)); setIsDirty(true); }}
                      placeholder="0"
                      className={`${fieldCls} ${viewerRole === 'lo' ? 'cursor-default bg-slate-100 text-slate-600' : ''}`}
                    />
                  </div>

                </div>
              </div>

              {/* About card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <label className={sectionLabel}>About This Home</label>
                  {viewerRole === 'owner' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openFairHousing}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Fair Housing Scan
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleGenerateDescription()}
                        disabled={generatingDesc || saving}
                        className="flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {generatingDesc ? (
                          <>
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Writing…
                          </>
                        ) : (
                          <>✨ Write with AI</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <p className="mb-2 text-xs text-slate-500">Describe what makes this home special…</p>
                <textarea
                  rows={8}
                  value={draft.description}
                  readOnly={viewerRole === 'lo'}
                  onChange={(e) => updateDraft('description', e.target.value)}
                  placeholder="Describe what makes this home special — neighbourhood, upgrades, lifestyle…"
                  className={`${fieldCls} min-h-[200px] resize-none rounded-2xl border-slate-200 bg-white p-4 leading-relaxed ${viewerRole === 'lo' ? 'cursor-default bg-slate-100 text-slate-600' : ''}`}
                />
              </div>

              {/* Preview strip */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Preview</span>
                <span className="truncate text-sm text-slate-600">
                  {previewParts.length > 0
                    ? previewParts.join(' · ')
                    : <span className="text-slate-400">Fill in the basics above to see a preview.</span>}
                </span>
              </div>

            </div>
          )}

          {/* ════ PHOTOS ════ */}
          {activeSection === 'photos' && (
            <div className="space-y-4">

              {/* LO read-only notice */}
              {viewerRole === 'lo' && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <span className="mt-0.5 text-base">ℹ️</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Photos — view only</p>
                    <p className="text-xs text-blue-600 mt-0.5">Photos are managed by the listing agent.</p>
                  </div>
                </div>
              )}

              {/* Upload zone — agent only */}
              {viewerRole === 'owner' && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => photos.length < 6 && photoFileRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition ${
                      dragOver
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    } ${photos.length >= 6 ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      {uploadingPhoto ? (
                        <svg className="h-5 w-5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {uploadingPhoto ? 'Uploading…' : 'Drop photos here or click to upload'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {photos.length}/6 photos added · First photo is your primary
                      </p>
                    </div>
                  </div>

                  {/* URL input */}
                  <div className="flex gap-2">
                    <input
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPhotoUrl()}
                      placeholder="Paste a photo URL to add it instantly…"
                      className={`${fieldCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={addPhotoUrl}
                      disabled={photos.length >= 6 || !photoUrlInput.trim()}
                      className={outlineBtn}
                    >
                      Add
                    </button>
                  </div>
                </>
              )}

              {/* Photo grid */}
              {photos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo, idx) => (
                    <div key={`${photo}-${idx}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="relative">
                        <img src={photo} alt={`${listingLabel}${idx === 0 ? ' — Primary Photo' : ` — Photo ${idx + 1}`}`} className="h-40 w-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow">
                            Primary
                          </span>
                        )}
                      </div>
                      {viewerRole === 'owner' && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => makePhotoPrimary(idx)}
                            disabled={idx === 0}
                            className="text-xs font-semibold text-slate-500 transition hover:text-slate-800 disabled:cursor-default disabled:opacity-40"
                          >
                            {idx === 0 ? 'Primary' : 'Set as Primary'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-xs font-semibold text-rose-500 transition hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                viewerRole === 'lo' && (
                  <p className="text-center text-sm text-slate-400 py-6">No photos uploaded yet.</p>
                )
              )}

              <input ref={photoFileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />

            </div>
          )}

          {/* ════ PEOPLE ════ */}
          {activeSection === 'people' && (
            <div className="space-y-6">

              {/* ══ LO VIEW: show their settings-page profile + the listing agent ══ */}
              {viewerRole === 'lo' && (
                <>
                  {/* Your Profile — pulled from account settings */}
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
                    <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className={`${sectionLabel} text-violet-500`}>Your Profile</p>
                        <p className="text-xs text-violet-600 mt-0.5">Pulled from your account settings — buyers see this on the listing page.</p>
                      </div>
                      <a
                        href="/dashboard/lo-chatbot"
                        className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        Update in Settings →
                      </a>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-violet-200 bg-slate-100">
                        {agentProfile.headshot_url ? (
                          <img src={agentProfile.headshot_url} alt="Your headshot" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-slate-300">person</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          {[agentProfile.first_name, agentProfile.last_name].filter(Boolean).join(' ') || 'Your Name'}
                        </p>
                        {agentProfile.company && <p className="text-xs text-slate-500">{agentProfile.company}</p>}
                        {agentProfile.nmls_number && <p className="text-[11px] text-slate-400">NMLS #{agentProfile.nmls_number}</p>}
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                          {agentProfile.phone && <span>📞 {agentProfile.phone}</span>}
                          {agentProfile.email && <span>✉️ {agentProfile.email}</span>}
                        </div>
                      </div>
                    </div>
                    {(!agentProfile.headshot_url || !agentProfile.nmls_number || !agentProfile.company) && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        ⚠️ Profile incomplete — add your {[!agentProfile.headshot_url && 'headshot', !agentProfile.nmls_number && 'NMLS #', !agentProfile.company && 'company'].filter(Boolean).join(', ')} so buyers see your full info.{' '}
                        <a href="/dashboard/lo-chatbot" className="font-semibold underline">Update now →</a>
                      </div>
                    )}
                  </div>

                  {/* Listing Agent — read-only info from listing owner */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                    <p className={sectionLabel}>Listing Agent</p>
                    {listingAgentProfile ? (
                      <div className="flex items-center gap-4 mt-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                          {listingAgentProfile.headshot_url ? (
                            <img src={listingAgentProfile.headshot_url} alt="Agent" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="material-symbols-outlined text-xl text-slate-300">person</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {[listingAgentProfile.first_name, listingAgentProfile.last_name].filter(Boolean).join(' ') || 'Listing Agent'}
                          </p>
                          {listingAgentProfile.company && <p className="text-xs text-slate-500">{listingAgentProfile.company}</p>}
                          <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-slate-400">
                            {listingAgentProfile.phone && <span>{listingAgentProfile.phone}</span>}
                            {listingAgentProfile.email && <span>{listingAgentProfile.email}</span>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Agent profile not available.</p>
                    )}
                  </div>
                </>
              )}

              {/* ══ AGENT VIEW: editable agent profile + LO attach ══ */}
              {viewerRole === 'owner' && (
              <>
              {/* ── Agent profile card ── */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className={sectionLabel}>Listing Agent</p>
                  <button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    disabled={savingProfile}
                    className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving…' : 'Save Profile'}
                  </button>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Headshot */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      onClick={() => headshotFileRef.current?.click()}
                      className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 transition hover:border-primary-400"
                    >
                      {agentProfile.headshot_url ? (
                        <img src={agentProfile.headshot_url} alt="Agent headshot" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">
                          <span className="material-symbols-outlined text-4xl">person</span>
                        </div>
                      )}
                      {headshotUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                          <svg className="h-5 w-5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">Click to change</span>
                    <input ref={headshotFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeadshotUpload} />
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={sectionLabel}>First Name</label>
                        <input value={agentProfile.first_name} onChange={e => setAgentProfile(p => ({ ...p, first_name: e.target.value }))} placeholder="Jane" className={fieldCls} />
                      </div>
                      <div>
                        <label className={sectionLabel}>Last Name</label>
                        <input value={agentProfile.last_name} onChange={e => setAgentProfile(p => ({ ...p, last_name: e.target.value }))} placeholder="Smith" className={fieldCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={sectionLabel}>Company / Brokerage</label>
                        <input value={agentProfile.company} onChange={e => setAgentProfile(p => ({ ...p, company: e.target.value }))} placeholder="Keller Williams" className={fieldCls} />
                      </div>
                      <div>
                        <label className={sectionLabel}>Title</label>
                        <input value={agentProfile.title} onChange={e => setAgentProfile(p => ({ ...p, title: e.target.value }))} placeholder="REALTOR®" className={fieldCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className={sectionLabel}>License #</label>
                        <input value={agentProfile.nmls_number} onChange={e => setAgentProfile(p => ({ ...p, nmls_number: e.target.value }))} placeholder="DRE / License #" className={fieldCls} />
                      </div>
                      <div>
                        <label className={sectionLabel}>Phone</label>
                        <input value={agentProfile.phone} onChange={e => setAgentProfile(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 000-0000" className={fieldCls} />
                      </div>
                      <div>
                        <label className={sectionLabel}>Email</label>
                        <input value={agentProfile.email} onChange={e => setAgentProfile(p => ({ ...p, email: e.target.value }))} placeholder="jane@brokerage.com" className={fieldCls} />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-[10px] text-slate-400">This profile shows on the public listing page and share kit. Save it once and it applies to all your listings.</p>
              </div>

              {/* ── LO attach section ── */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <p className={`${sectionLabel} mb-3`}>Loan Officer</p>
                <p className="mb-4 text-xs text-slate-500">Attach a loan officer to this listing. They get co-branded on the listing page and their AI financing bot activates for buyers.</p>

                {attachedLo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        {attachedLo.headshot_url ? (
                          <img src={attachedLo.headshot_url} alt={attachedLo.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-slate-300">person</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{attachedLo.name}</p>
                        {attachedLo.company && <p className="truncate text-xs text-slate-500">{attachedLo.company}</p>}
                        {attachedLo.nmls_number && <p className="text-[10px] text-slate-400">NMLS #{attachedLo.nmls_number}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDetachLo()}
                        disabled={detachingLo}
                        className="shrink-0 text-xs font-semibold text-rose-500 transition hover:text-rose-700 disabled:opacity-40"
                      >
                        {detachingLo ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                    {/* Incomplete profile warning */}
                    {(!attachedLo.headshot_url || !attachedLo.company || !attachedLo.nmls_number) && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <span className="material-symbols-outlined text-base text-amber-500 mt-0.5">warning</span>
                        <p className="text-xs text-amber-700">
                          <span className="font-semibold">Profile incomplete.</span> Ask {attachedLo.name.split(' ')[0]} to add their
                          {[!attachedLo.headshot_url && 'headshot', !attachedLo.company && 'company', !attachedLo.nmls_number && 'NMLS #'].filter(Boolean).join(', ')} so buyers see their full info on this listing.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        value={loSearch}
                        onChange={e => void handleLoSearch(e.target.value)}
                        placeholder="Search LOs by name, email, or company…"
                        className={`${fieldCls} pr-10`}
                      />
                      {loSearching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {loSearchResults.length > 0 && (
                      <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {loSearchResults.map(lo => (
                          <li key={lo.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-none">
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                              {lo.headshot_url ? (
                                <img src={lo.headshot_url} alt={lo.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="material-symbols-outlined text-xl text-slate-300">person</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">{lo.name}</p>
                              <p className="truncate text-xs text-slate-500">{[lo.company, lo.email].filter(Boolean).join(' · ')}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleAttachLo(lo)}
                              disabled={attachingLo}
                              className="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                            >
                              {attachingLo ? '…' : 'Attach'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {loSearch.length >= 2 && !loSearching && loSearchResults.length === 0 && (
                      <p className="text-xs text-slate-400">No LO accounts found matching &ldquo;{loSearch}&rdquo;. They may need to sign up first.</p>
                    )}
                  </div>
                )}
              </div>
              </>
              )}

            </div>
          )}

          {/* ════ LISTING BRAIN ════ */}
          {activeSection === 'brain' && (
            <div className="space-y-4">

              {/* LO notice — explains what LO can edit in this tab */}
              {viewerRole === 'lo' && (
                <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                  <span className="mt-0.5 text-base">🧠</span>
                  <div>
                    <p className="text-sm font-semibold text-violet-800">Your workspace is below</p>
                    <p className="text-xs text-violet-600 mt-0.5">The listing agent manages the brain sources. Scroll down to update your <strong>LO Financing Brain</strong> — rate sheet, programs, and disclosures.</p>
                  </div>
                </div>
              )}

              {/* Header + actions */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Listing Brain</p>
                <p className="mb-4 text-sm text-slate-500">
                  Feed the AI everything you know about this property. This trains the home&apos;s AI voice for descriptions, scripts, and follow-up copy.
                </p>
                {viewerRole === 'owner' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={sourceBusy}
                    onClick={() => setBrainModal({ type: 'text', value: '' })}
                    className={outlineBtn}
                  >
                    📝 Paste Text
                  </button>
                  <button
                    type="button"
                    disabled={sourceBusy}
                    onClick={() => {
                      setDocUploadError(null)
                      docFileRef.current?.click()
                    }}
                    className={outlineBtn}
                  >
                    {uploadingDoc ? 'Uploading…' : '📄 Upload Doc'}
                  </button>
                  <button
                    type="button"
                    disabled={sourceBusy}
                    onClick={() => setBrainModal({ type: 'url', value: '' })}
                    className={outlineBtn}
                  >
                    🌐 Scan Website
                  </button>
                </div>
                )}
                {docUploadError && (
                  <p className="mt-3 text-xs font-medium text-rose-600">{docUploadError}</p>
                )}
              </div>

              {/* Sources list */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">
                      {sources.length} {sources.length === 1 ? 'Source' : 'Sources'}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      Last trained: {lastTrainedAt ? formatUpdatedTime(lastTrainedAt) : 'Never'}
                    </span>
                  </div>
                  {viewerRole === 'owner' && (
                  <button
                    type="button"
                    disabled={sourceBusy || sources.length === 0}
                    onClick={() => void handleRetrain()}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Retrain AI
                  </button>
                  )}
                </div>

                {sources.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-500">No sources yet</p>
                    <p className="mt-1 text-xs text-slate-400">Add your first source above to train this home&apos;s AI before publishing.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {sources.map((source) => (
                      <li key={source.id} className="flex items-center gap-4 px-4 py-3">
                        <span className="text-lg leading-none">{sourceTypeIcon(source.type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{source.title}</p>
                          <p className="text-xs text-slate-400">{sourceTypeLabel(source.type)} · {formatUpdatedTime(source.updated_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            source.status === 'trained'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {source.status === 'trained' ? '✓ Trained' : 'Needs retrain'}
                          </span>
                          {viewerRole === 'owner' && (
                          <button
                            type="button"
                            disabled={sourceBusy}
                            onClick={() => void handleDeleteSource(source.id)}
                            className="text-xs font-semibold text-rose-500 transition hover:text-rose-700 disabled:opacity-40"
                          >
                            Remove
                          </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <input
                ref={docFileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setDocUploadError(null)
                  setUploadingDoc(true)
                  setSourceBusy(true)
                  try {
                    if (demoMode || isLocalOnly) {
                      appendDocFallbackSource(file)
                      return
                    }
                    const source = await uploadListingBrainDoc(listingId, file)
                    setSources((prev) => [source, ...prev])
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Could not upload file.'
                    setDocUploadError(`Upload failed: ${message}. Added local source fallback.`)
                    appendDocFallbackSource(file)
                  } finally {
                    setUploadingDoc(false)
                    setSourceBusy(false)
                  }
                }}
              />

              {/* ═══ PAYMENT REFERENCE ═══ */}
              <PaymentScenariosSection
                price={draft.price}
                rate={loRate}
                onRateChange={setLoRate}
              />

              {/* ═══ PAYMENT DISCLOSURES ═══ */}
              <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">📋</span>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Payment Disclosures</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Required regulatory fine print — NMLS #, APR assumptions, licensing, state-specific disclosures. Displayed below every payment scenario shown to buyers.
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  <textarea
                    value={disclosuresContent}
                    onChange={e => setDisclosuresContent(e.target.value)}
                    placeholder={`Example:\nNMLS# 123456 · Licensed in TX, CA, FL · Equal Housing Lender\n\nAPR is based on a 30-year fixed-rate loan, a credit score of 740+, and the assumptions shown. Actual APR will vary. Not all applicants will qualify. Rates subject to change without notice. This is not a commitment to lend.\n\nFHA loans require mortgage insurance premiums (MIP). Conventional loans with less than 20% down require private mortgage insurance (PMI). Rates quoted include discount points where applicable.\n\nLicensed by the Texas Department of Savings and Mortgage Lending. NMLS Consumer Access: nmlsconsumeraccess.org`}
                    rows={8}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 font-mono placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 leading-relaxed"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <p>✅ Include: NMLS #, state licensing, APR assumptions, MIP/PMI notes</p>
                      <p>✅ Include: "Not a commitment to lend" · "Equal Housing Lender"</p>
                      <p>✅ Check your state's specific disclosure requirements</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSaveDisclosures()}
                      disabled={savingDisclosures || !disclosuresContent.trim()}
                      className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">{disclosuresSaved ? 'check_circle' : 'save'}</span>
                      {savingDisclosures ? 'Saving…' : disclosuresSaved ? 'Saved!' : 'Save Disclosures'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ═══ LO FINANCING BRAIN ═══ */}
              <LoBrainSection
                draft={draft}
                demoMode={demoMode}
                isLocalOnly={isLocalOnly}
                loBrainDocId={loBrainDocId}
                setLoBrainDocId={setLoBrainDocId}
                loBrainContent={loBrainContent}
                setLoBrainContent={setLoBrainContent}
                savingLoBrain={savingLoBrain}
                setSavingLoBrain={setSavingLoBrain}
                loBrainSaved={loBrainSaved}
                setLoBrainSaved={setLoBrainSaved}
                csvScenarios={csvScenarios}
                setCsvScenarios={setCsvScenarios}
                csvFileName={csvFileName}
                setCsvFileName={setCsvFileName}
                csvUploadedAt={csvUploadedAt}
                setCsvUploadedAt={setCsvUploadedAt}
                onSave={handleSaveLoBrain}
              />

            </div>
          )}

        </div>
      </div>
    </div>

    {/* ── Brain source modal ── */}
    {brainModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setBrainModal(null)}
        />

        {/* Card */}
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

          {/* Close */}
          <button
            type="button"
            onClick={() => setBrainModal(null)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {brainModal.type === 'text' ? (
            <>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Add Source</p>
              <h2 className="mb-1 text-lg font-bold text-slate-900">Paste Text</h2>
              <p className="mb-4 text-sm text-slate-500">Paste any property info — MLS notes, feature lists, agent remarks, anything relevant.</p>
              <textarea
                autoFocus
                rows={7}
                value={brainModal.value}
                onChange={(e) => setBrainModal({ ...brainModal, value: e.target.value })}
                placeholder="Paste your source text here…"
                className={`${fieldCls} resize-none`}
              />
            </>
          ) : (
            <>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Add Source</p>
              <h2 className="mb-1 text-lg font-bold text-slate-900">Scan Website</h2>
              <p className="mb-4 text-sm text-slate-500">Enter a URL and the AI will scan it for property details — Zillow, Realtor.com, your own site, anywhere.</p>
              <input
                autoFocus
                type="url"
                value={brainModal.value}
                onChange={(e) => setBrainModal({ ...brainModal, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = brainModal.value.trim()
                    if (url) { void createSource({ type: 'url', title: url, url }); setBrainModal(null) }
                  }
                }}
                placeholder="https://zillow.com/homedetails/…"
                className={fieldCls}
              />
            </>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setBrainModal(null)} className={outlineBtn}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!brainModal.value.trim() || sourceBusy}
              onClick={() => {
                const val = brainModal.value.trim()
                if (!val) return
                if (brainModal.type === 'text') {
                  void createSource({ type: 'text', title: val.slice(0, 80), content: val })
                } else {
                  void createSource({ type: 'url', title: val, url: val })
                }
                setBrainModal(null)
              }}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Source
            </button>
          </div>
        </div>
      </div>
    )}
    <FairHousingScannerModal
      open={fairHousingOpen}
      onClose={() => setFairHousingOpen(false)}
      initialText={draft.description || ''}
      contextLabel="Listing Editor"
    />
    </>
  )
}

export default ListingEditorPage
