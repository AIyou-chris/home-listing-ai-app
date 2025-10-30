import React from 'react'
import { StylePresetId } from '../../state/useFunnelEditorStore'
import { VariableHighlighter } from './VariableHighlighter'

interface MessagePreviewProps {
  message: string
  tonePresetId: StylePresetId
}

const presetClasses: Record<Exclude<StylePresetId, undefined>, string> = {
  friendly: 'bg-emerald-50 border-emerald-200',
  professional: 'bg-slate-50 border-slate-200',
  bold: 'bg-indigo-50 border-indigo-200',
  custom: 'bg-primary-50 border-primary-200'
}

export const MessagePreview: React.FC<MessagePreviewProps> = ({ message, tonePresetId }) => {
  const toneLabel =
    tonePresetId === 'friendly'
      ? 'Friendly tone preview'
      : tonePresetId === 'professional'
        ? 'Professional tone preview'
        : tonePresetId === 'bold'
          ? 'Bold tone preview'
          : 'Default tone preview'

  const toneClass = tonePresetId ? presetClasses[tonePresetId] ?? presetClasses.custom : 'bg-white border-slate-200'

  return (
    <section className="px-6 pb-6">
      <div className={`border rounded-xl px-4 py-3 shadow-sm ${toneClass}`}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{toneLabel}</p>
        <div className="text-sm text-slate-800 leading-relaxed">
          <VariableHighlighter message={message} />
        </div>
      </div>
    </section>
  )
}

