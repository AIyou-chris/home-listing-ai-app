type AuthScope = string[]

interface AuthResult {
  success: boolean
  accessToken?: string | null
  reason?: string
}

type OAuthContext = 'calendar' | 'gmail'

interface StoredCredentials {
  accessToken: string | null
  refreshToken?: string | null
  expiryDate?: number | null
  scope?: string | null
  tokenType?: string | null
  email?: string | null
  receivedAt: number
}

interface RequestOptions {
  userId?: string
  scopes?: AuthScope
  context?: OAuthContext
}

const DEFAULT_USER_ID = 'blueprint-agent'
const CALENDAR_STORAGE_KEY = 'google_calendar_credentials'
const GMAIL_STORAGE_KEY = 'google_gmail_credentials'
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000

class GoogleOAuthService {
  public readonly isAvailable: boolean

  private popup: Window | null = null
  private calendarCredentials: StoredCredentials | null = null
  private gmailCredentials: StoredCredentials | null = null
  private pending: Partial<Record<OAuthContext, {
    resolve(value: boolean): void
    reject(reason?: unknown): void
    timeout: number
  }>> = {}
  private readonly messageHandler: (event: MessageEvent) => void

  constructor() {
    this.isAvailable = this.computeAvailability()
    if (this.isBrowser()) {
      this.calendarCredentials = this.loadStoredCredentials('calendar')
      this.gmailCredentials = this.loadStoredCredentials('gmail')
      this.messageHandler = this.handleMessage.bind(this)
      window.addEventListener('message', this.messageHandler)
    } else {
      this.messageHandler = () => { }
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined'
  }

  private computeAvailability(): boolean {
    const flagValue = String(this.getEnvValue('VITE_ENABLE_GOOGLE_INTEGRATIONS') || '').toLowerCase() === 'true'
    const clientId = (this.getEnvValue('VITE_GOOGLE_OAUTH_CLIENT_ID') || '').length > 0
    return flagValue || clientId
  }

  private getEnvValue(key: string): string | undefined {
    try {
      const metaEnv = Function('return (typeof import !== "undefined" && import.meta && import.meta.env) ? import.meta.env : undefined;')() as Record<string, unknown> | undefined
      const metaValue = metaEnv?.[key]
      if (typeof metaValue === 'string') {
        return metaValue
      }
    } catch (_) {
      // ignore
    }

    const processEnv = (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env
    if (processEnv && typeof processEnv[key] === 'string') {
      return processEnv[key] as string
    }

    return undefined
  }

  private loadStoredCredentials(context: OAuthContext): StoredCredentials | null {
    if (!this.isBrowser()) return null

    const key = context === 'calendar' ? CALENDAR_STORAGE_KEY : GMAIL_STORAGE_KEY
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return null

      const parsed = JSON.parse(raw) as StoredCredentials
      if (parsed && typeof parsed === 'object') {
        return {
          accessToken: parsed.accessToken || null,
          refreshToken: parsed.refreshToken || null,
          expiryDate: typeof parsed.expiryDate === 'number' ? parsed.expiryDate : this.normalizeExpiry(parsed.expiryDate),
          scope: parsed.scope || null,
          tokenType: parsed.tokenType || null,
          email: parsed.email || null,
          receivedAt: typeof parsed.receivedAt === 'number' ? parsed.receivedAt : Date.now()
        }
      }
    } catch (error) {
      console.warn(`Failed to load Google ${context} credentials:`, error)
    }

    return null
  }

  private saveCredentials(context: OAuthContext, credentials: StoredCredentials | null): void {
    if (!this.isBrowser()) return

    const key = context === 'calendar' ? CALENDAR_STORAGE_KEY : GMAIL_STORAGE_KEY
    if (!credentials) {
      window.localStorage.removeItem(key)
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(credentials))
    } catch (error) {
      console.warn(`Failed to persist Google ${context} credentials:`, error)
    }
  }

  private normalizeExpiry(expiry: unknown): number | null {
    if (typeof expiry === 'number' && Number.isFinite(expiry)) {
      return expiry
    }

    if (typeof expiry === 'string') {
      const parsed = Number(expiry)
      return Number.isFinite(parsed) ? parsed : null
    }

    return null
  }

  private handleMessage(event: MessageEvent): void {
    const payload = event?.data
    if (!payload || typeof payload !== 'object') {
      return
    }

    const { type } = payload as { type?: string }
    if (!type) {
      return
    }

    const isCalendar = type === 'calendar-oauth-success'
    const isGmail = type === 'gmail-oauth-success'

    if (isCalendar || isGmail) {
      const context: OAuthContext = isCalendar ? 'calendar' : 'gmail'
      const data = payload as {
        tokens?: {
          accessToken?: string | null
          refreshToken?: string | null
          expiryDate?: number | string | null
          scope?: string | null
          tokenType?: string | null
          idToken?: string | null
        }
        email?: string | null
      }

      const tokens = data.tokens || {}
      const expiry = this.normalizeExpiry(tokens.expiryDate ?? null)

      const credentials: StoredCredentials = {
        accessToken: tokens.accessToken || null,
        refreshToken: tokens.refreshToken || null,
        expiryDate: expiry,
        scope: tokens.scope || null,
        tokenType: tokens.tokenType || null,
        email: data.email || null,
        receivedAt: Date.now()
      }

      if (context === 'calendar') {
        this.calendarCredentials = credentials
      } else {
        this.gmailCredentials = credentials
      }

      this.saveCredentials(context, credentials)
      this.finishPending(context, true)
      this.closePopup()
      return
    }

    if (type === 'calendar-oauth-error' || type === 'gmail-oauth-error') {
      const context: OAuthContext = type === 'calendar-oauth-error' ? 'calendar' : 'gmail'
      this.finishPending(context, false, (payload as { reason?: unknown }).reason)
      this.closePopup()
      return
    }
  }

  private closePopup(): void {
    try {
      this.popup?.close()
    } catch (_) {
      // ignore
    }
    this.popup = null
  }

  private finishPending(context: OAuthContext, success: boolean, reason?: unknown): void {
    const pendingEntry = this.pending[context]
    if (!pendingEntry) return

    window.clearTimeout(pendingEntry.timeout)
    if (success) {
      pendingEntry.resolve(true)
    } else {
      pendingEntry.resolve(false)
      if (reason instanceof Error) {
        pendingEntry.reject(reason)
      } else if (typeof reason === 'string' && reason.length) {
        pendingEntry.reject(new Error(reason))
      }
    }

    this.pending[context] = undefined
  }

  isAuthenticated(context: OAuthContext = 'calendar'): boolean {
    const credentials = context === 'calendar' ? this.calendarCredentials : this.gmailCredentials
    if (!credentials || !credentials.accessToken) {
      return false
    }

    if (!credentials.expiryDate) {
      return true
    }

    // Treat token as expired 60 seconds before the actual expiry to avoid race conditions
    const bufferMs = 60_000
    const now = Date.now()
    return now + bufferMs < credentials.expiryDate
  }

  getAccessToken(context: OAuthContext = 'calendar'): string | null {
    if (!this.isAuthenticated(context)) {
      return null
    }

    const credentials = context === 'calendar' ? this.calendarCredentials : this.gmailCredentials
    return credentials?.accessToken || null
  }

  getUserEmail(context: OAuthContext = 'calendar'): string | null {
    const credentials = context === 'calendar' ? this.calendarCredentials : this.gmailCredentials
    return credentials?.email || null
  }

  async requestAccess(options: RequestOptions = {}): Promise<boolean> {
    if (!this.isBrowser() || !this.isAvailable) {
      return false
    }

    const context: OAuthContext = options.context ?? 'calendar'
    const userId = options.userId || DEFAULT_USER_ID
    const scopes = options.scopes

    const params = new URLSearchParams()
    params.set('userId', userId)
    params.set('context', context)

    if (scopes && scopes.length) {
      params.set('scopes', scopes.join(' '))
    }

    const response = await fetch(`/api/email/google/oauth-url?${params.toString()}`)
    if (response.status === 503) {
      throw new Error('Google OAuth is not configured for this environment.')
    }

    if (!response.ok) {
      throw new Error(`Failed to start Google OAuth (status ${response.status})`)
    }

    const payload = (await response.json()) as { success?: boolean; url?: string }
    if (!payload?.url) {
      throw new Error('Google OAuth URL was not provided by the server.')
    }

    const popup = window.open(
      payload.url,
      `${context}-oauth-popup`,
      'width=480,height=720,menubar=no,toolbar=no,status=no'
    )

    if (!popup) {
      throw new Error('Popup blocked. Please enable popups to connect Google Calendar.')
    }

    this.popup = popup

    return await new Promise<boolean>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.finishPending(context, false, new Error('Google OAuth timed out.'))
        this.closePopup()
      }, OAUTH_TIMEOUT_MS)

      this.pending[context] = { resolve, reject, timeout }
    })
  }

  async authenticate(scopes: AuthScope = [], options: RequestOptions = {}): Promise<AuthResult> {
    const context: OAuthContext = options.context ?? 'calendar'

    try {
      const success = await this.requestAccess({ ...options, scopes, context })
      const accessToken = success ? this.getAccessToken(context) : null
      return {
        success: success && Boolean(accessToken),
        accessToken
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Google OAuth failed'
      return {
        success: false,
        accessToken: null,
        reason
      }
    }
  }

  logout(context: OAuthContext = 'calendar'): void {
    if (context === 'calendar') {
      this.calendarCredentials = null
    } else {
      this.gmailCredentials = null
    }
    this.saveCredentials(context, null)
  }

  async forceReAuth(options: RequestOptions = {}): Promise<boolean> {
    this.logout(options.context ?? 'calendar')
    return await this.requestAccess(options)
  }

  refreshTokenLoading(): void {
    // Placeholder for UI hooks (spinner, etc.)
  }
}

export const googleOAuthService = new GoogleOAuthService()

export default googleOAuthService
