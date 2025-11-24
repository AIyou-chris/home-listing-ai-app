import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { FollowUpSequence, SequenceStep } from '../types'

export type StylePresetId = 'friendly' | 'professional' | 'bold' | 'custom' | undefined

export type StepDraft = {
  original: SequenceStep
  draftMessage: string
  tonePresetId: StylePresetId
  variablesMissing: string[]
  variablesMalformed: string[]
  lastSavedAt?: string
  sharedWith?: string[]
}

export type AISuggestion =
  | { type: 'ordering'; message: string; proposedOrder: string[] }
  | { type: 'tone'; stepId: string; message: string }
  | { type: 'fatigue'; window: string; message: string }
  | { type: 'missing-step'; message: string; suggestedStep: Partial<SequenceStep> }

interface FunnelEditorState {
  activeSequence?: FollowUpSequence
  activeStepId?: string
  stepDrafts: Record<string, StepDraft>
  aiSuggestions: AISuggestion[]
  showStepEditor: boolean
  setActiveSequence: (sequence: FollowUpSequence | undefined) => void
  setActiveStep: (stepId: string | undefined) => void
  updateDraftMessage: (stepId: string, draft: string) => void
  updateTonePreset: (stepId: string, presetId: StylePresetId) => void
  setValidationResults: (stepId: string, missing: string[], malformed: string[]) => void
  resetStepToDefault: (stepId: string) => void
  upsertAISuggestions: (suggestions: AISuggestion[]) => void
  clearAISuggestions: () => void
  setShowStepEditor: (open: boolean) => void
  applyDraftOverrides: (
    overrides: Record<string, { draftMessage?: string; tonePresetId?: StylePresetId; lastSavedAt?: string }>
  ) => void
}

const buildDrafts = (sequence?: FollowUpSequence): Record<string, StepDraft> => {
  if (!sequence) return {}
  return sequence.steps.reduce<Record<string, StepDraft>>((acc, step) => {
    acc[step.id] = {
      original: step,
      draftMessage: step.content,
      tonePresetId: undefined,
      variablesMissing: [],
      variablesMalformed: []
    }
    return acc
  }, {})
}

export const useFunnelEditorStore = create<FunnelEditorState>()(
  immer((set) => ({
    activeSequence: undefined,
    activeStepId: undefined,
    stepDrafts: {},
    aiSuggestions: [],
    showStepEditor: false,
    setActiveSequence: (sequence) =>
      set((state) => {
        state.activeSequence = sequence
        state.stepDrafts = buildDrafts(sequence)
        state.activeStepId = sequence?.steps[0]?.id
      }),
    setActiveStep: (stepId) =>
      set((state) => {
        state.activeStepId = stepId
      }),
    updateDraftMessage: (stepId, draft) =>
      set((state) => {
        const target = state.stepDrafts[stepId]
        if (target) target.draftMessage = draft
      }),
    updateTonePreset: (stepId, presetId) =>
      set((state) => {
        const target = state.stepDrafts[stepId]
        if (target) target.tonePresetId = presetId
      }),
    setValidationResults: (stepId, missing, malformed) =>
      set((state) => {
        const target = state.stepDrafts[stepId]
        if (!target) return
        target.variablesMissing = missing
        target.variablesMalformed = malformed
      }),
    resetStepToDefault: (stepId) =>
      set((state) => {
        const target = state.stepDrafts[stepId]
        if (!target) return
        target.draftMessage = target.original.content
        target.tonePresetId = undefined
        target.variablesMissing = []
        target.variablesMalformed = []
      }),
    upsertAISuggestions: (suggestions) =>
      set((state) => {
        state.aiSuggestions = suggestions
      }),
    clearAISuggestions: () =>
      set((state) => {
        state.aiSuggestions = []
      }),
    setShowStepEditor: (open) =>
      set((state) => {
        state.showStepEditor = open
      }),
    applyDraftOverrides: (overrides) =>
      set((state) => {
        Object.entries(overrides).forEach(([stepId, override]) => {
          const target = state.stepDrafts[stepId]
          if (!target) return
          if (override.draftMessage) target.draftMessage = override.draftMessage
          if (override.tonePresetId !== undefined) target.tonePresetId = override.tonePresetId
          if (override.lastSavedAt) target.lastSavedAt = override.lastSavedAt
        })
      })
  }))
)

