/**
 * ExportButton — reusable CRM export dropdown
 *
 * Usage:
 *   <ExportButton
 *     filename="lo_leads"
 *     headers={['Name', 'Email', ...]}
 *     rows={leads.map(l => [l.name, l.email, ...])}
 *     jsonData={leads}
 *   />
 *
 * Supports CSV (universal CRM import) and JSON (API/Zapier).
 */

import React, { useEffect, useRef, useState } from 'react'
import { ExportService } from '../services/exportService'

export interface ExportButtonProps {
  filename: string
  headers: string[]
  rows: (string | number | null | undefined)[][]
  jsonData: unknown
  label?: string
  disabled?: boolean
}

const ExportButton: React.FC<ExportButtonProps> = ({
  filename,
  headers,
  rows,
  jsonData,
  label = 'Export',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleCSV = () => {
    ExportService.exportTableToCSV({ headers, rows, filename })
    setOpen(false)
  }

  const handleJSON = () => {
    ExportService.exportToJSON(jsonData, filename)
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled || rows.length === 0}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        title={rows.length === 0 ? 'Nothing to export yet' : 'Export data'}
      >
        <span className="material-symbols-outlined text-[18px] text-slate-500">download</span>
        {label}
        <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {rows.length} record{rows.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* CSV option */}
          <button
            onClick={handleCSV}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">table_view</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">CSV</p>
              <p className="text-[11px] text-slate-400">Works with any CRM</p>
            </div>
          </button>

          {/* JSON option */}
          <button
            onClick={handleJSON}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <span className="material-symbols-outlined text-[18px] text-blue-600">data_object</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">JSON</p>
              <p className="text-[11px] text-slate-400">Zapier / API / dev</p>
            </div>
          </button>

          {/* Tip */}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <p className="text-[10px] text-slate-400">
              CSV imports into HubSpot, Salesforce, Pipedrive, Follow Up Boss, and more.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportButton
