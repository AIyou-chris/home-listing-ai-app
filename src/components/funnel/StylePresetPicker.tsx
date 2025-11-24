import React from 'react'
import { StylePresetId } from '../../state/useFunnelEditorStore'

interface StylePresetPickerProps {
  value: StylePresetId
  onChange: (preset: StylePresetId) => void
}

const PRESETS: Array<{ id: StylePresetId; label: string; description: string }> = [
  { id: undefined, label: 'Default', description: 'Use the template as-is' },
  { id: 'friendly', label: 'Friendly', description: 'Warm greeting, conversational tone' },
  { id: 'professional', label: 'Professional', description: 'Concise, confident, expert' },
  { id: 'bold', label: 'Bold', description: 'High energy, action oriented' }
]

export const StylePresetPicker: React.FC<StylePresetPickerProps> = ({ value, onChange }) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Style presets</h3>
      <div className="grid grid-cols-1 gap-3">
        {PRESETS.map((preset) => {
          const isActive = preset.id === value
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`text-left rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                isActive
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/40'
              }`}
            >
              <p className="text-sm font-semibold">{preset.label}</p>
              <p className="text-xs text-slate-500 mt-1">{preset.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

