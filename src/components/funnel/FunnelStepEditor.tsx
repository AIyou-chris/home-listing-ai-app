import React, { useMemo } from 'react'
import { useFunnelEditorStore } from '../../state/useFunnelEditorStore'
import { validateMessageVariables } from '../../utils/validateMessageVariables'
import { VariableHighlighter } from './VariableHighlighter'
import { ValidationBanner } from './ValidationBanner'
import { StylePresetPicker } from './StylePresetPicker'
import { MessagePreview } from './MessagePreview'

interface FunnelStepEditorProps {
  allowedVariables: string[]
  onSaveDraft: (stepId: string, message: string) => Promise<void>
  onShareDraft: (stepId: string) => void
  onClose: () => void
}

export const FunnelStepEditor: React.FC<FunnelStepEditorProps> = ({
  allowedVariables,
  onSaveDraft,
  onShareDraft,
  onClose
}) => {
  const {
    activeStepId,
    stepDrafts,
    updateDraftMessage,
    updateTonePreset,
    setValidationResults,
    resetStepToDefault
  } = useFunnelEditorStore()

  const draft = activeStepId ? stepDrafts[activeStepId] : undefined

  const validation = useMemo(() => {
    if (!draft || !activeStepId) return { missing: [], malformed: [], used: [] }
    const result = validateMessageVariables(draft.draftMessage, allowedVariables)
    setValidationResults(activeStepId, result.missing, result.malformed)
    return result
  }, [draft, allowedVariables, activeStepId, setValidationResults])

  if (!draft || !activeStepId) return null

  const disableSave = validation.missing.length > 0 || validation.malformed.length > 0

  return (
    <aside className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col z-30">
      <header className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Editing step</p>
          <h2 className="text-lg font-semibold text-slate-900 leading-tight">{draft.original.subject || draft.original.id}</h2>
          <p className="text-sm text-slate-500 mt-1">Personalize the message and tone. Changes apply only after you save.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => resetStepToDefault(activeStepId)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </header>

      <ValidationBanner missing={validation.missing} malformed={validation.malformed} />

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="funnel-step-message">
            Message content
          </label>
          <textarea
            id="funnel-step-message"
            value={draft.draftMessage}
            onChange={(event) => updateDraftMessage(activeStepId, event.target.value)}
            className="w-full h-48 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="mt-2 text-xs text-slate-500">Allowed variables: {allowedVariables.map((variable) => `{{${variable}}}`).join(', ')}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Variables detected</h3>
          <div className="border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <VariableHighlighter message={draft.draftMessage} />
          </div>
        </div>

        <StylePresetPicker value={draft.tonePresetId} onChange={(preset) => updateTonePreset(activeStepId, preset)} />

        <MessagePreview message={draft.draftMessage} tonePresetId={draft.tonePresetId} />
      </div>

      <footer className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onShareDraft(activeStepId)}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          Share with team
        </button>
        <button
          type="button"
          onClick={() => onSaveDraft(activeStepId, draft.draftMessage)}
          disabled={disableSave}
          className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition ${
            disableSave ? 'bg-slate-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          Save changes
        </button>
      </footer>
    </aside>
  )
}

