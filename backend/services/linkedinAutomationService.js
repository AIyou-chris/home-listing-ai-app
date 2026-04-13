const clampScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const normalizeText = (value) => String(value || '').replace(/\r/g, '').trim();

const parseThreadText = (threadText) => {
  const raw = normalizeText(threadText);
  if (!raw) return [];

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(prospect|lead|client|buyer|seller|them|other|me|agent|rep|assistant)\s*:\s*(.+)$/i);
      if (!match) {
        return {
          sender: index % 2 === 0 ? 'prospect' : 'agent',
          text: line
        };
      }

      const rawSender = match[1].toLowerCase();
      return {
        sender: ['me', 'agent', 'rep', 'assistant'].includes(rawSender) ? 'agent' : 'prospect',
        text: match[2].trim()
      };
    })
    .slice(-20);
};

const coerceStringArray = (value, fallback = []) => {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const coerceAutomationIdeas = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      title: normalizeText(item?.title),
      trigger: normalizeText(item?.trigger),
      action: normalizeText(item?.action),
      copy: normalizeText(item?.copy)
    }))
    .filter((item) => item.title || item.trigger || item.action || item.copy)
    .slice(0, 4);
};

const coerceFollowUpSequence = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => ({
      step: Math.max(1, Number(item?.step || index + 1)),
      wait: normalizeText(item?.wait),
      message: normalizeText(item?.message)
    }))
    .filter((item) => item.message)
    .slice(0, 3);
};

const buildSystemPrompt = ({ agentProfile, goal, tone, context }) => {
  const agentName = normalizeText(agentProfile?.name) || 'the agent';
  const agentTitle = normalizeText(agentProfile?.title);
  const company = normalizeText(agentProfile?.company);
  const language = normalizeText(agentProfile?.language) || 'English';

  return [
    `You are a LinkedIn inbox assistant for ${agentName}${agentTitle ? `, ${agentTitle}` : ''}${company ? ` at ${company}` : ''}.`,
    `Goal: ${normalizeText(goal) || 'qualify the prospect and move the conversation forward'}.`,
    `Preferred tone: ${normalizeText(tone) || 'professional and warm'}.`,
    `Preferred language: ${language}.`,
    context ? `Extra context: ${normalizeText(context)}` : null,
    '',
    'Rules:',
    '- Write like a sharp human, not a chatbot.',
    '- Do not promise that anything was already sent, booked, researched, or done.',
    '- Do not suggest mass spam, fake engagement, scraping, stealth browser automation, or anything that risks a LinkedIn account.',
    '- Keep the main reply concise and easy to send manually.',
    '- Automation ideas must stay human-approved and operationally safe.',
    '- If the lead is weak or unclear, say that directly and recommend a low-friction next step.'
  ]
    .filter(Boolean)
    .join('\n');
};

const buildUserPrompt = ({ thread }) => {
  const transcript = thread
    .map((message) => `${message.sender === 'agent' ? 'Agent' : 'Prospect'}: ${message.text}`)
    .join('\n');

  return [
    'Read this LinkedIn conversation and return strict JSON.',
    '',
    'Required JSON shape:',
    '{',
    '  "replyDraft": "string",',
    '  "replyStyleNotes": ["string"],',
    '  "leadInsights": {',
    '    "intent": "string",',
    '    "urgency": "low|medium|high",',
    '    "temperature": "cold|warm|hot",',
    '    "fitScore": 0,',
    '    "whyItMatters": "string",',
    '    "nextBestAction": "string"',
    '  },',
    '  "automationIdeas": [',
    '    { "title": "string", "trigger": "string", "action": "string", "copy": "string" }',
    '  ],',
    '  "followUpSequence": [',
    '    { "step": 1, "wait": "string", "message": "string" }',
    '  ],',
    '  "complianceNotes": ["string"]',
    '}',
    '',
    'Conversation:',
    transcript
  ].join('\n');
};

const fallbackPayload = () => ({
  replyDraft: 'Thanks for reaching out. Happy to help. Can you share a little more about what you need so I can point you in the right direction?',
  replyStyleNotes: ['Keep it short and human.', 'End with one simple question.'],
  leadInsights: {
    intent: 'general inquiry',
    urgency: 'medium',
    temperature: 'warm',
    fitScore: 55,
    whyItMatters: 'The conversation shows interest, but the next step is still vague.',
    nextBestAction: 'Ask one qualifying question and move toward a quick call if they engage.'
  },
  automationIdeas: [
    {
      title: 'Fast first-response play',
      trigger: 'New LinkedIn message arrives',
      action: 'Review the draft and send it manually within 10 minutes.',
      copy: 'Use the generated reply as your first response.'
    }
  ],
  followUpSequence: [
    {
      step: 1,
      wait: '2 days',
      message: 'Checking back in here in case this is still on your list. Happy to send the next best step.'
    }
  ],
  complianceNotes: [
    'Keep sending human-approved.',
    'Avoid mass outreach or browser bot behavior on LinkedIn.'
  ]
});

const sanitizePayload = (payload) => {
  const fallback = fallbackPayload();
  const leadInsights = payload?.leadInsights || {};

  return {
    replyDraft: normalizeText(payload?.replyDraft) || fallback.replyDraft,
    replyStyleNotes: coerceStringArray(payload?.replyStyleNotes, fallback.replyStyleNotes).slice(0, 4),
    leadInsights: {
      intent: normalizeText(leadInsights.intent) || fallback.leadInsights.intent,
      urgency: ['low', 'medium', 'high'].includes(normalizeText(leadInsights.urgency).toLowerCase())
        ? normalizeText(leadInsights.urgency).toLowerCase()
        : fallback.leadInsights.urgency,
      temperature: ['cold', 'warm', 'hot'].includes(normalizeText(leadInsights.temperature).toLowerCase())
        ? normalizeText(leadInsights.temperature).toLowerCase()
        : fallback.leadInsights.temperature,
      fitScore: clampScore(leadInsights.fitScore || fallback.leadInsights.fitScore),
      whyItMatters: normalizeText(leadInsights.whyItMatters) || fallback.leadInsights.whyItMatters,
      nextBestAction: normalizeText(leadInsights.nextBestAction) || fallback.leadInsights.nextBestAction
    },
    automationIdeas: coerceAutomationIdeas(payload?.automationIdeas).length
      ? coerceAutomationIdeas(payload?.automationIdeas)
      : fallback.automationIdeas,
    followUpSequence: coerceFollowUpSequence(payload?.followUpSequence).length
      ? coerceFollowUpSequence(payload?.followUpSequence)
      : fallback.followUpSequence,
    complianceNotes: coerceStringArray(payload?.complianceNotes, fallback.complianceNotes).slice(0, 4)
  };
};

const generateLinkedInAssistantPayload = async ({
  openai,
  model,
  threadText,
  agentProfile,
  goal,
  tone,
  context
}) => {
  const thread = parseThreadText(threadText);
  if (!thread.length) {
    throw new Error('Conversation text is required.');
  }

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt({ agentProfile, goal, tone, context })
      },
      {
        role: 'user',
        content: buildUserPrompt({ thread })
      }
    ]
  });

  const content = normalizeText(completion?.choices?.[0]?.message?.content);
  const parsed = content ? JSON.parse(content) : {};
  return sanitizePayload(parsed);
};

module.exports = {
  generateLinkedInAssistantPayload
};
