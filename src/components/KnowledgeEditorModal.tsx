import React, { useCallback, useState } from 'react'

interface KnowledgeEditorModalProps {
  isOpen: boolean
  title?: string
  addingText?: boolean
  scraping?: boolean
  onClose: () => void
  onAddText: (title: string, content: string) => Promise<void> | void
  onUpload: (files: FileList | File[]) => Promise<void> | void
  onScrape: (url: string, frequency: 'once' | 'daily' | 'weekly') => Promise<void> | void
}

const KnowledgeEditorModal: React.FC<KnowledgeEditorModalProps> = ({
  isOpen,
  title = 'Agent Knowledge Base',
  addingText = false,
  scraping = false,
  onClose,
  onAddText,
  onUpload,
  onScrape
}) => {
  const [knowledgeTitle, setKnowledgeTitle] = useState('')
  const [knowledgeContent, setKnowledgeContent] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scrapingFrequency, setScrapingFrequency] = useState<'once' | 'daily' | 'weekly'>('once')
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setDragActive(false)
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        onUpload(event.dataTransfer.files)
      }
    },
    [onUpload]
  )

  const handleScrape = async () => {
    if (!websiteUrl.trim()) return
    await onScrape(websiteUrl.trim(), scrapingFrequency)
    setWebsiteUrl('')
  }

  const handleAddText = async () => {
    if (!knowledgeTitle.trim() || !knowledgeContent.trim()) return
    await onAddText(knowledgeTitle.trim(), knowledgeContent.trim())
    setKnowledgeTitle('')
    setKnowledgeContent('')
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='px-6 py-5 border-b border-slate-200 flex items-center justify-between'>
          <h3 className='text-xl font-semibold text-slate-900'>{title}</h3>
          <button onClick={onClose} className='text-slate-500 hover:text-slate-700'>
            <span className='material-symbols-outlined'>close</span>
          </button>
        </div>
        <div className='px-6 py-5 space-y-6'>
          <div
            onDragEnter={e => {
              e.preventDefault()
              e.stopPropagation()
              setDragActive(true)
            }}
            onDragOver={e => {
              e.preventDefault()
              e.stopPropagation()
              setDragActive(true)
            }}
            onDragLeave={e => {
              e.preventDefault()
              e.stopPropagation()
              setDragActive(false)
            }}
            onDrop={handleDrop}
            className={`border-dashed border-2 rounded-2xl p-6 text-center ${dragActive ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
          >
            <p className='text-sm font-semibold text-slate-700 mb-2'>Upload documents, scripts, and materials</p>
            <p className='text-xs text-slate-500 mb-3'>Drop files here or click to browse (PDF/DOC/TXT/MD, max 10MB each)</p>
            <label className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700'>
              Choose Files
              <input type='file' multiple className='hidden' onChange={e => e.target.files && onUpload(e.target.files)} />
            </label>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='border border-amber-200 rounded-xl p-4 bg-amber-50 space-y-3'>
              <h4 className='text-lg font-semibold text-orange-900'>Add Text Knowledge</h4>
              <label className='text-xs text-slate-600'>Knowledge Title</label>
              <input
                type='text'
                value={knowledgeTitle}
                onChange={e => setKnowledgeTitle(e.target.value)}
                className='w-full px-3 py-2 border border-amber-300 rounded-lg text-sm'
                placeholder='e.g., Pricing Strategy, Client Communication...'
              />
              <label className='text-xs text-slate-600'>Knowledge Content</label>
              <textarea
                value={knowledgeContent}
                onChange={e => setKnowledgeContent(e.target.value)}
                rows={4}
                className='w-full px-3 py-2 border border-amber-300 rounded-lg text-sm'
                placeholder='Enter detailed knowledge, procedures, or information...'
              />
              <button
                onClick={handleAddText}
                disabled={!knowledgeTitle.trim() || !knowledgeContent.trim() || addingText}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-white ${addingText ? 'bg-amber-300' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                {addingText ? 'Adding…' : 'Add Knowledge'}
              </button>
            </div>
            <div className='border border-emerald-200 rounded-xl p-4 bg-emerald-50 space-y-3'>
              <h4 className='text-lg font-semibold text-emerald-900'>URL Scraper</h4>
              <label className='text-xs text-slate-600'>Website URL</label>
              <input
                type='url'
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                className='w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm'
                placeholder='https://example.com'
              />
              <label className='text-xs text-slate-600'>Scraping Frequency</label>
              <select
                value={scrapingFrequency}
                onChange={e => setScrapingFrequency(e.target.value as 'once' | 'daily' | 'weekly')}
                className='w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm'
              >
                <option value='once'>Once</option>
                <option value='daily'>Daily</option>
                <option value='weekly'>Weekly</option>
              </select>
              <button
                onClick={handleScrape}
                disabled={!websiteUrl.trim() || scraping}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 ${scraping ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800'}`}
              >
                {scraping ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                    Scraping...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">download</span>
                    Scrape Website
                  </>
                )}
              </button>
              {websiteUrl === '' && !scraping && (
                <p className="text-xs text-emerald-700 font-medium text-center animate-pulse">
                  Ready to scrape next URL
                </p>
              )}
            </div>
          </div>
        </div>
        <div className='px-6 py-4 border-t border-slate-200 flex justify-end'>
          <button onClick={onClose} className='px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50'>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeEditorModal
