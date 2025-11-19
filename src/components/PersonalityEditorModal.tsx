import React, { useEffect, useMemo, useState } from 'react'
import { personalityPresets } from '../services/aiSidekicksService'

export interface PersonalityPayload {
  description: string
  traits: string[]
  preset: string
}

interface PersonalityEditorModalProps {
  isOpen: boolean
  title?: string
  initialDescription: string
  initialTraits: string[]
  initialPreset?: string
  saving?: boolean
  onClose: () => void
  onSave: (payload: PersonalityPayload) => Promise<void> | void
}

const PersonalityEditorModal: React.FC<PersonalityEditorModalProps> = ({
  isOpen,
  title = 'AI Personality Editor',
  initialDescription,
  initialTraits,
  initialPreset = 'custom',
  saving = false,
  onClose,
  onSave
}) => {
  const [description, setDescription] = useState(initialDescription)
  const [traits, setTraits] = useState(initialTraits)
  const [preset, setPreset] = useState(initialPreset)
  const [newTrait, setNewTrait] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDescription(initialDescription)
      setTraits(initialTraits)
      setPreset(initialPreset)
      setNewTrait('')
    }
  }, [isOpen, initialDescription, initialTraits, initialPreset])

  const presetOptions = useMemo(() => Object.entries(personalityPresets), [])

  const handlePresetChange = (value: string) => {
    setPreset(value)
    const presetData = personalityPresets[value]
    if (presetData) {
      setDescription(presetData.description)
      setTraits(presetData.traits)
    }
  }

  const addTrait = () => {
    const trimmed = newTrait.trim()
    if (!trimmed) return
    setTraits(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setNewTrait('')
  }

  const removeTrait = (trait: string) => {
    setTraits(prev => prev.filter(t => t !== trait))
  }

  const handleSave = async () => {
    await onSave({
      description: description.trim(),
      traits: traits,
      preset
    })
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='px-6 py-5 border-b border-slate-200 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='material-symbols-outlined text-blue-600'>psychology</span>
            <h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
          </div>
          <button onClick={onClose} className='text-slate-500 hover:text-slate-700'>
            <span className='material-symbols-outlined'>close</span>
          </button>
        </div>
        <div className='px-6 py-5 space-y-5'>
          <div>
            <h4 className='font-medium text-slate-900 mb-2'>Who You Are</h4>
            <label className='block text-sm font-medium text-slate-700 mb-2'>Choose a preset or keep custom</label>
            <select
              value={preset}
              onChange={e => handlePresetChange(e.target.value)}
              className='w-full px-3 py-2 border border-slate-300 rounded-lg mb-2'
            >
              {presetOptions.map(([key, presetOption]) => (
                <option key={key} value={key}>
                  {presetOption.name}
                </option>
              ))}
            </select>
            <p className='text-xs text-slate-500'>Presets pre-fill the description and traits. You can still edit everything below.</p>
          </div>

          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>Personality Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className='w-full px-3 py-2 border border-slate-300 rounded-lg'
              placeholder='Describe the AI persona, tone, role, and guardrails...'
            />
            <p className='text-xs text-slate-500 mt-1'>Be specific about role, expertise, and approach. Keep it concise.</p>
          </div>

          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>Additional Personality Traits</label>
            <div className='flex gap-2 mb-2'>
              <input
                type='text'
                value={newTrait}
                onChange={e => setNewTrait(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTrait())}
                placeholder="Add a trait (e.g., 'patient', 'creative')"
                className='flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm'
              />
              <button onClick={addTrait} className='px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800'>
                Add
              </button>
            </div>
            <div className='flex flex-wrap gap-2'>
              {traits.map(trait => (
                <span key={trait} className='inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm'>
                  {trait}
                  <button onClick={() => removeTrait(trait)} className='text-slate-400 hover:text-slate-600'>
                    <span className='material-symbols-outlined text-sm'>close</span>
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className='font-medium text-slate-900 mb-2'>Preview</h4>
            <div className='border border-slate-200 rounded-lg p-4 bg-slate-50'>
              <p className='text-slate-700'>{description}</p>
            </div>
          </div>
        </div>
        <div className='px-6 py-5 border-t border-slate-200 flex flex-col gap-3 sm:flex-row sm:justify-end'>
          <button onClick={onClose} className='px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50'>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${saving ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? 'Saving…' : 'Save Personality'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PersonalityEditorModal
