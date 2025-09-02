// Local-only SessionService stub to eliminate Firebase network calls
export class SessionService {
  private static currentSessionId: string | null = null;
  private static sessionStartTime: Date | null = null;
  private static heartbeatInterval: number | null = null;

  static async startSession(): Promise<string | null> {
    if (this.currentSessionId) return this.currentSessionId;
    this.currentSessionId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.sessionStartTime = new Date();
    this.startHeartbeat();
    return this.currentSessionId;
  }

  static async endSession(): Promise<void> {
    if (!this.currentSessionId) return;
    if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
    this.currentSessionId = null;
    this.sessionStartTime = null;
  }

  private static async updateActivity(): Promise<void> {
    // no-op: local only
  }

  private static startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.updateActivity();
    }, 30000);
  }

  static async trackEvent(eventType: string, eventData: any = {}): Promise<void> {
    // Local console log to avoid network
    if (!this.currentSessionId) await this.startSession();
    console.debug('[Session]', eventType, { eventData, sessionId: this.currentSessionId });
  }

  static async trackPageView(page: string, additionalData: any = {}): Promise<void> {
    await this.trackEvent('page_view', { page, title: document.title, ...additionalData });
  }

  static async trackInteraction(interactionType: string, target: string, data: any = {}): Promise<void> {
    await this.trackEvent('user_interaction', { interactionType, target, ...data });
  }

  static async trackError(error: Error, context: string = ''): Promise<void> {
    await this.trackEvent('error', { message: error.message, stack: error.stack, context });
  }

  static async trackPerformance(metric: string, value: number, unit: string = 'ms'): Promise<void> {
    await this.trackEvent('performance', { metric, value, unit, timestamp: Date.now() });
  }

  static getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  static isSessionActive(): boolean {
    return this.currentSessionId !== null;
  }

  static initialize(): void {
    // Start a local session immediately to avoid external deps
    this.startSession();
    window.addEventListener('beforeunload', () => this.endSession());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.updateActivity();
    });
  }
}