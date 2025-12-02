import React, { useEffect, useMemo, useState } from 'react'
import { blueprintSidekicksService, type BlueprintSidekickId, type BlueprintSidekick } from '../services/blueprintSidekicksService'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const SidebarButton: React.FC<{ active: boolean; onClick: () => void; title: string; description: string }> = ({ active, onClick, title, description }) => (
  <button
    onClick={onClick}
    className={`w-full text-left rounded-xl border px-4 py-3 transition ${active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}
  >
    <div className='font-semibold text-slate-900'>{title}</div>
    <div className='text-xs text-slate-500'>{description}</div>
  </button>
)

const BlueprintSidekicks: React.FC = () => {
  const [sidekicks, setSidekicks] = useState<BlueprintSidekick[]>([])
  const [selectedId, setSelectedId] = useState<BlueprintSidekickId>('agent')
  const [promptDraft, setPromptDraft] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [uploading, setUploading] = useState(false)
  const selected = useMemo(() => sidekicks.find((s) => s.id === selectedId), [sidekicks, selectedId])

  useEffect(() => {
    (async () => {
      const list = await blueprintSidekicksService.list()
      setSidekicks(list)
      if (list.length) {
        setSelectedId(list[0].id)
        setPromptDraft(list[0].systemPrompt || '')
      }
    })()
  }, [])

  useEffect(() => {
    if (selected) setPromptDraft(selected.systemPrompt || '')
  }, [selectedId, selected])

  const handleSavePrompt = async () => {
    await blueprintSidekicksService.savePrompt(selectedId, promptDraft)
    setSidekicks((prev) => prev.map((s) => (s.id === selectedId ? { ...s, systemPrompt: promptDraft } : s)))
  }

  const handleChatSend = async () => {
    const message = chatInput.trim()
    if (!message) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: message }
    setChatHistory((prev) => [...prev, userMsg])
    setChatInput('')
    const response = await blueprintSidekicksService.chat(
      selectedId,
      message,
      chatHistory.map((m) => ({ role: m.role, content: m.content }))
    )
    const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: response }
    setChatHistory((prev) => [...prev, aiMsg])
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return
    setUploading(true)
    try {
      await blueprintSidekicksService.uploadMemory(selectedId, files[0])
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='px-6 py-6'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <p className='inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
              <span className='material-symbols-outlined text-base'>smart_toy</span>
              Blueprint AI Sidekicks
            </p>
            <h1 className='text-2xl font-bold text-slate-900 mt-2'>Your AI Sidekick Team</h1>
            <p className='text-sm text-slate-600'>Chat, memory upload, and prompt control for the agent’s blueprint workspace.</p>
          </div>
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-4'>
          <div className='lg:col-span-1 space-y-2'>
            {sidekicks.map((sk) => (
              <SidebarButton
                key={sk.id}
                active={selectedId === sk.id}
                onClick={() => setSelectedId(sk.id)}
                title={sk.name}
                description={sk.description}
              />
            ))}
          </div>
          <div className='lg:col-span-3 space-y-4'>
            <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold text-slate-900'>System Prompt</h3>
                  <p className='text-sm text-slate-500'>
                    {'Define how this sidekick behaves. Tokens: {{agent.firstName}}, {{agent.brand}}.'}
                  </p>
                </div>
                <button onClick={handleSavePrompt} className='px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700'>
                  Save Prompt
                </button>
              </div>
              <textarea
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                rows={6}
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
              />
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold text-slate-900'>Knowledge & Memory</h3>
                  <p className='text-sm text-slate-500'>Upload PDFs, TXT, or images to train this sidekick.</p>
                </div>
                <label className='px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm cursor-pointer hover:bg-slate-200'>
                  Upload
                  <input
                    type='file'
                    className='hidden'
                    onChange={(e) => handleUpload(e.target.files)}
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && <div className='text-sm text-slate-500'>Uploading...</div>}
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold text-slate-900'>Chat</h3>
                  <p className='text-sm text-slate-500'>Talk to the selected sidekick with agent context merged.</p>
                </div>
              </div>
              <div className='h-64 border border-slate-200 rounded-lg p-3 overflow-y-auto space-y-2 bg-slate-50'>
                {chatHistory.map((m) => (
                  <div key={m.id} className={`text-sm ${m.role === 'user' ? 'text-slate-900' : 'text-blue-700'}`}>
                    <strong>{m.role === 'user' ? 'You' : selected?.name}</strong>: {m.content}
                  </div>
                ))}
                {chatHistory.length === 0 && <div className='text-sm text-slate-500'>Ask a question to get started.</div>}
              </div>
              <div className='flex gap-2'>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className='flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  placeholder='Ask something...'
                />
                <button onClick={handleChatSend} className='px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700'>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlueprintSidekicks
