import React, { useMemo, useState } from 'react'
import { AIBlogPost } from '../types'
import { generateBlogPost } from '../services/geminiService'

type Step = 'intro' | 'qna' | 'generating' | 'complete'

interface QA {
  id: string
  label: string
  placeholder?: string
  required?: boolean
}

interface StoredBlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  author: string
  publishedAt: string
  status: string
  tags: string[]
  imageUrl: string
  readTime: string
}

const isStoredBlogPost = (value: unknown): value is StoredBlogPost => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.content === 'string'
  )
}

const getStoredBlogPosts = (): StoredBlogPost[] => {
  const raw = localStorage.getItem('localBlogPosts')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredBlogPost)
  } catch (error) {
    console.warn('Failed to parse stored blog posts', error)
    return []
  }
}

const QUESTIONS: QA[] = [
  { id: 'topic', label: 'What is the blog topic?', required: true },
  { id: 'audience', label: 'Who is the audience?', required: true },
  { id: 'tone', label: 'Preferred tone (e.g., Warm, Professional)?', required: true },
  { id: 'keywords', label: 'Any key ideas to include? (optional)' },
  { id: 'urls', label: 'Reference URLs (comma-separated)', placeholder: 'https://example.com, https://...' },
]

const brandFooterHtml = () => `
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
  <div style="display:flex;gap:12px;align-items:center;">
    <img src="/newlogo.png" alt="HomeListingAI" style="height:32px;width:auto;"/>
    <div style="font-size:14px;color:#334155;">
      <div>HomeListingAI</div>
      <div><a href="https://homelistingai.com" target="_blank" rel="noopener" style="color:#0ea5e9;">https://homelistingai.com</a></div>
      <div>Contact: us@homelistingai.com</div>
    </div>
  </div>
`

const drawImage = async (title: string, sub: string): Promise<string> => {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 628
  const ctx = canvas.getContext('2d')!

  const g = ctx.createLinearGradient(0, 0, 1200, 628)
  g.addColorStop(0, '#0ea5e9')
  g.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1200, 628)

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = 'bold 64px Inter, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.textBaseline = 'top'
  const wrap = (text: string, maxWidth: number) => {
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(line)
        line = w
      } else line = test
    }
    if (line) lines.push(line)
    return lines
  }
  const lines = wrap(title, 980)
  lines.forEach((ln, i) => ctx.fillText(ln, 110, 140 + i * 76))

  ctx.fillStyle = 'rgba(241,245,249,0.95)'
  ctx.font = 'normal 28px Inter, system-ui, -apple-system, Segoe UI, Roboto'
  const subLines = wrap(sub, 980)
  subLines.forEach((ln, i) => ctx.fillText(ln, 110, 140 + lines.length * 76 + 24 + i * 36))

  // Logo mark
  const logo = new Image()
  logo.src = '/newlogo.png'
  await new Promise(r => (logo.onload = r))
  ctx.drawImage(logo, 1040, 28, 120, 120)

  return canvas.toDataURL('image/png')
}

const AIBlogWriterPage: React.FC = () => {
  const [step, setStep] = useState<Step>('intro')
  const [answers, setAnswers] = useState<Record<string, string>>({
    tone: 'Warm',
  })
  const [post, setPost] = useState<AIBlogPost | null>(null)
  const [headerUrl, setHeaderUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [imagesMode, setImagesMode] = useState<'auto' | 'prompt' | 'none'>('auto')
  const [imagesPrompt, setImagesPrompt] = useState<string>('')

  const canStart = useMemo(() => !!answers.topic && !!answers.audience && !!answers.tone, [answers])

  const start = () => setStep('qna')

  const handleGenerate = async () => {
    setStep('generating')
    setBusy(true)
    try {
      const urls = (answers.urls || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const requestPayload: Parameters<typeof generateBlogPost>[0] = {
        topic: answers.topic || '',
        keywords: answers.keywords || '',
        tone: answers.tone || 'Warm',
        style: 'Conversational',
        audience: answers.audience || 'Home buyers',
        cta: 'Contact us for a free consultation',
        urls,
      }

      const result = await generateBlogPost(requestPayload)

      // Generate images based on selection
      let header = ''
      let inline = ''
      if (imagesMode !== 'none') {
        const headerSub = imagesMode === 'prompt' && imagesPrompt
          ? imagesPrompt
          : (answers.topic || '')
        header = await drawImage(result.title, headerSub)
        inline = await drawImage('Key Insight', 'Generated with HomeListingAI')
        setHeaderUrl(header)
      } else {
        setHeaderUrl('')
      }

      const withBrand = `
        ${imagesMode !== 'none' && header ? `<img src="${header}" alt="Header" style="width:100%;height:auto;border-radius:12px;margin:16px 0;"/>` : ''}
        ${result.body}
        ${imagesMode !== 'none' && inline ? `<img src="${inline}" alt="Illustration" style="width:100%;height:auto;border-radius:12px;margin:16px 0;"/>` : ''}
        ${urls.length ? `<h3>Sources</h3><ul>${urls.map(u => `<li><a href="${u}" target="_blank" rel="noopener">${u}</a></li>`).join('')}</ul>` : ''}
        ${brandFooterHtml()}
      `

      const finalPost: AIBlogPost = { title: result.title, body: withBrand }
      setPost(finalPost)
      setStep('complete')
    } catch (e) {
      console.error(e)
      alert('Failed to generate blog. Please try again.')
      setStep('qna')
    } finally {
      setBusy(false)
    }
  }

  const saveLocal = async () => {
    try {
      const existing = getStoredBlogPosts()
      const slug = (post!.title || 'blog')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const entry = {
        id: Date.now().toString(),
        title: post!.title,
        slug,
        content: post!.body,
        excerpt: (post!.body || '').replace(/<[^>]+>/g, '').slice(0, 180) + '...',
        author: 'HomeListingAI',
        publishedAt: new Date().toISOString(),
        status: 'published',
        tags: ['AI', 'Real Estate'],
        imageUrl: headerUrl,
        readTime: '4 min',
      }
      localStorage.setItem('localBlogPosts', JSON.stringify([entry, ...existing]))
      try {
        await fetch('http://localhost:5001/home-listing-ai/us-central1/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        })
      } catch (error) {
        console.warn('Failed to sync local blog posts to API', error)
      }
      alert('Saved locally. View it in Blog page.')
      window.location.hash = '#/blog'
    } catch (error) {
      console.warn('Failed to save local blog post', error)
    }
  }

  if (step === 'intro') {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-slate-900">AI Blog Writer</h2>
        <p className="text-slate-600 mt-2">Conversational blog generation with AIO-focused structure.</p>
        <button
          onClick={start}
          className="mt-6 w-full sm:w-auto px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >Start</button>
      </div>
    )
  }

  if (step === 'qna') {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Quick Questions</h3>
        <div className="space-y-4">
          {QUESTIONS.map(q => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{q.label}</label>
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Images</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="imagesMode"
                  checked={imagesMode === 'auto'}
                  onChange={() => setImagesMode('auto')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                />
                <span className="text-sm text-slate-700">Auto-generate header & body images</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="imagesMode"
                  checked={imagesMode === 'prompt'}
                  onChange={() => setImagesMode('prompt')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                />
                <span className="text-sm text-slate-700">I'll describe the images</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="imagesMode"
                  checked={imagesMode === 'none'}
                  onChange={() => setImagesMode('none')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                />
                <span className="text-sm text-slate-700">No images</span>
              </label>
            </div>
            {imagesMode === 'prompt' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Describe your header image</label>
                <textarea
                  value={imagesPrompt}
                  onChange={e => setImagesPrompt(e.target.value)}
                  placeholder="e.g., Modern home exterior at golden hour with warm lighting"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[88px]"
                />
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canStart || busy}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >{busy ? 'Generating…' : 'Generate Blog'}</button>
          <button
            onClick={() => setStep('intro')}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700"
          >Back</button>
        </div>
      </div>
    )
  }

  if (step === 'generating') {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <p className="text-slate-700">Generating your article…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">{post?.title}</h3>
        <div className="flex gap-2">
          <button onClick={saveLocal} className="px-3 py-2 bg-primary-600 text-white rounded-lg">Publish (Local)</button>
        </div>
      </div>
      <div className="p-6">
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post?.body || '' }} />
      </div>
    </div>
  )
}

export default AIBlogWriterPage


