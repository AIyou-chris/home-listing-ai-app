import React, { useEffect, useState } from 'react'

// "Put HomeListingAI on your phone" — once, only on phones, only until dismissed or installed.
// Android gets the real install button; iPhone gets the 2-step instructions.

const KEY = 'hlai_install_prompt_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const safeGet = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const safeSet = () => { try { localStorage.setItem(KEY, '1') } catch { /* private mode */ } }

const InstallAppPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
    const phone = window.matchMedia?.('(max-width: 768px)').matches
    if (standalone || !phone || safeGet()) return
    setVisible(true)
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!visible) return null
  const dismiss = () => { safeSet(); setVisible(false) }
  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice.catch(() => undefined)
    dismiss()
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4">
      <span className="material-symbols-outlined text-primary-600">install_mobile</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-primary-900">Keep this on your home screen</p>
        <p className="mt-0.5 text-xs text-primary-800">
          {installEvent
            ? 'Open it in one tap, like any app.'
            : isIos
              ? 'Tap the Share button, then “Add to Home Screen”.'
              : 'Open your browser menu, then “Add to Home screen”.'}
        </p>
        {installEvent && (
          <button type="button" onClick={() => void install()} className="mt-2 min-h-[36px] rounded-lg bg-primary-600 px-4 text-xs font-bold text-white">Add it</button>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-primary-700">
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  )
}

export default InstallAppPrompt
