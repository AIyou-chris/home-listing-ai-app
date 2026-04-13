import { AuthService } from './authService'

export interface LinkedInAssistantRequest {
  threadText: string
  goal: string
  tone: string
  context?: string
  agentProfile?: {
    name?: string
    title?: string
    company?: string
    language?: string
  }
}

export interface LinkedInLeadInsights {
  intent: string
  urgency: 'low' | 'medium' | 'high'
  temperature: 'cold' | 'warm' | 'hot'
  fitScore: number
  whyItMatters: string
  nextBestAction: string
}

export interface LinkedInAutomationIdea {
  title: string
  trigger: string
  action: string
  copy: string
}

export interface LinkedInFollowUpStep {
  step: number
  wait: string
  message: string
}

export interface LinkedInAssistantResponse {
  success: boolean
  replyDraft: string
  replyStyleNotes: string[]
  leadInsights: LinkedInLeadInsights
  automationIdeas: LinkedInAutomationIdea[]
  followUpSequence: LinkedInFollowUpStep[]
  complianceNotes: string[]
}

export const generateLinkedInAssistantPlan = async (
  input: LinkedInAssistantRequest
): Promise<LinkedInAssistantResponse> => {
  const auth = AuthService.getInstance()
  const response = await auth.makeAuthenticatedRequest('/api/linkedin/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Failed to generate LinkedIn plan.')
  }

  return data as LinkedInAssistantResponse
}
