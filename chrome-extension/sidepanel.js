const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://homelistingai.com',
  userId: '',
  agentName: '',
  agentTitle: '',
  company: '',
  language: 'English',
  defaultContext: ''
};

const GOALS = [
  { value: 'book a call', label: 'Book a call' },
  { value: 'qualify the lead', label: 'Qualify lead' },
  { value: 'nurture the conversation', label: 'Nurture lead' },
  { value: 'reconnect and restart the thread', label: 'Reconnect' }
];

const TONES = [
  { value: 'professional and warm', label: 'Professional' },
  { value: 'friendly and conversational', label: 'Friendly' },
  { value: 'direct and confident', label: 'Direct' },
  { value: 'helpful and consultative', label: 'Consultative' }
];

const PRESETS = [
  {
    key: 'buyer',
    label: 'Buyer',
    goal: 'book a call',
    tone: 'helpful and consultative',
    context: 'You help active homebuyers narrow options fast and move them into a short discovery call or showing plan.',
    threadText: `Prospect: Hi, I saw your post about off-market homes in Scottsdale.\nMe: Thanks for reaching out. Are you actively looking right now or just exploring?\nProspect: Actively looking. We may need to move in the next 60 days.`
  },
  {
    key: 'seller',
    label: 'Seller',
    goal: 'qualify the lead',
    tone: 'professional and warm',
    context: 'You help homeowners price, prep, and launch listings. Your best next step is a quick pricing call.',
    threadText: `Prospect: Hi, I may be selling my home later this year.\nMe: Happy to help. Are you mainly trying to understand price, timing, or what updates matter most?\nProspect: Mostly price and what I should fix before listing.`
  },
  {
    key: 'investor',
    label: 'Investor',
    goal: 'nurture the conversation',
    tone: 'direct and confident',
    context: 'You work with investors who care about speed, deal fit, returns, and repeat opportunities.',
    threadText: `Prospect: I saw your note about investor-friendly deals.\nMe: Thanks for reaching out. What kinds of properties are you targeting right now?\nProspect: Small multifamily or fix-and-flip if the numbers make sense.`
  },
  {
    key: 'agent',
    label: 'Recruiting Agent',
    goal: 'book a call',
    tone: 'friendly and conversational',
    context: 'You are recruiting producing agents into your team. Focus on opportunity, support, and a low-pressure intro call.',
    threadText: `Prospect: Thanks for connecting.\nMe: Glad we connected. I liked your activity in the market and wanted to say hello.\nProspect: Appreciate that. What made you reach out?`
  },
  {
    key: 'team-leader',
    label: 'Recruiting Team Leader',
    goal: 'reconnect and restart the thread',
    tone: 'direct and confident',
    context: 'You are opening partnership talks with a team leader. Focus on growth, platform leverage, and a strategic conversation.',
    threadText: `Prospect: Thanks for the message.\nMe: Happy to connect. I work with growth-minded team leaders and thought it made sense to introduce myself.\nProspect: Open to hearing more. What does that look like?`
  },
  {
    key: 'broker',
    label: 'Recruiting Broker',
    goal: 'book a call',
    tone: 'professional and warm',
    context: 'You are speaking to a broker about platform leverage, recruiting support, and expansion opportunities.',
    threadText: `Prospect: Appreciate you reaching out.\nMe: Glad to connect. I thought there could be a fit based on what you are building.\nProspect: Maybe. What kind of fit do you mean?`
  },
  {
    key: 'owner',
    label: 'Recruiting Owner',
    goal: 'qualify the lead',
    tone: 'direct and confident',
    context: 'You are talking to a brokerage owner. Focus on scale, retention, margin, and operator-level outcomes.',
    threadText: `Prospect: Thanks for connecting.\nMe: Glad we connected. I work with owners who want stronger recruiting and conversion systems.\nProspect: That is interesting. What are you seeing work right now?`
  }
];

const state = { selectedPresetKey: PRESETS[0].key, result: null };

const els = {
  apiBaseUrl: document.getElementById('api-base-url'),
  userId: document.getElementById('user-id'),
  agentName: document.getElementById('agent-name'),
  agentTitle: document.getElementById('agent-title'),
  company: document.getElementById('company'),
  language: document.getElementById('language'),
  detectUser: document.getElementById('detect-user'),
  saveSettings: document.getElementById('save-settings'),
  pullThread: document.getElementById('pull-thread'),
  presetGrid: document.getElementById('preset-grid'),
  goal: document.getElementById('goal'),
  tone: document.getElementById('tone'),
  context: document.getElementById('context'),
  thread: document.getElementById('thread'),
  buildPlan: document.getElementById('build-plan'),
  copyReply: document.getElementById('copy-reply'),
  insertReply: document.getElementById('insert-reply'),
  reply: document.getElementById('reply'),
  chips: document.getElementById('chips'),
  leadRead: document.getElementById('lead-read'),
  automation: document.getElementById('automation'),
  status: document.getElementById('status')
};

const setStatus = (message, kind = '') => {
  els.status.textContent = message || '';
  els.status.className = `status ${kind}`.trim();
};

const populateSelect = (element, options) => {
  element.innerHTML = '';
  options.forEach((option) => {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.label;
    element.appendChild(node);
  });
};

const renderPresetButtons = () => {
  els.presetGrid.innerHTML = '';
  PRESETS.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `preset-button ${preset.key === state.selectedPresetKey ? 'active' : ''}`.trim();
    button.textContent = preset.label;
    button.addEventListener('click', () => applyPreset(preset));
    els.presetGrid.appendChild(button);
  });
};

const applyPreset = (preset) => {
  state.selectedPresetKey = preset.key;
  els.goal.value = preset.goal;
  els.tone.value = preset.tone;
  els.context.value = preset.context;
  els.thread.value = preset.threadText;
  renderPresetButtons();
  renderResult(null);
};

const renderResult = (result) => {
  state.result = result;
  els.reply.textContent = result?.replyDraft || 'No reply yet.';
  els.chips.innerHTML = '';

  (result?.replyStyleNotes || []).forEach((note) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = note;
    els.chips.appendChild(chip);
  });

  if (!result?.leadInsights) {
    els.leadRead.className = 'lead-read empty';
    els.leadRead.textContent = 'No lead read yet.';
  } else {
    els.leadRead.className = 'lead-read';
    els.leadRead.innerHTML = `
      <div><strong>Intent</strong><div class="muted">${result.leadInsights.intent}</div></div>
      <div><strong>Urgency</strong><div class="muted">${result.leadInsights.urgency}</div></div>
      <div><strong>Temperature</strong><div class="muted">${result.leadInsights.temperature}</div></div>
      <div><strong>Fit score</strong><div class="muted">${result.leadInsights.fitScore}/100</div></div>
      <div><strong>Next best action</strong><div class="muted">${result.leadInsights.nextBestAction}</div></div>
    `;
  }

  if (!result) {
    els.automation.className = 'stack empty';
    els.automation.textContent = 'No follow-up ideas yet.';
    return;
  }

  const blocks = [];
  (result.automationIdeas || []).forEach((idea) => {
    blocks.push(`<div class="stack-item"><strong>${idea.title}</strong><div class="muted">${idea.trigger}</div><p>${idea.action}</p></div>`);
  });
  (result.followUpSequence || []).forEach((step) => {
    blocks.push(`<div class="stack-item"><strong>Step ${step.step}</strong><div class="muted">Wait ${step.wait}</div><p>${step.message}</p></div>`);
  });
  (result.complianceNotes || []).forEach((note) => {
    blocks.push(`<div class="stack-item"><strong>Safety note</strong><div class="muted">${note}</div></div>`);
  });

  els.automation.className = 'stack';
  els.automation.innerHTML = blocks.join('');
};

const getActiveLinkedInTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error('Open LinkedIn first.');
  if (!/^https:\/\/(www\.)?linkedin\.com\//i.test(tab.url || '')) throw new Error('Open a LinkedIn page first.');
  return tab;
};

const pullThreadFromLinkedIn = async () => {
  const tab = await getActiveLinkedInTab();
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'HLAI_GET_LINKEDIN_CONTEXT' });
  if (!response?.ok) throw new Error(response?.error || 'Could not read the LinkedIn thread.');
  els.thread.value = response.data?.threadText || '';
  setStatus('Thread loaded from LinkedIn.', 'ok');
};

const buildPlan = async () => {
  const response = await chrome.runtime.sendMessage({
    type: 'HLAI_FETCH_LINKEDIN_ASSISTANT',
    payload: {
      threadText: els.thread.value,
      goal: els.goal.value,
      tone: els.tone.value,
      context: els.context.value
    }
  });

  if (!response?.ok) throw new Error(response?.error || 'Could not build plan.');
  renderResult(response.data);
  setStatus('Plan built.', 'ok');
};

const copyReply = async () => {
  if (!state.result?.replyDraft) throw new Error('Build a reply first.');
  await navigator.clipboard.writeText(state.result.replyDraft);
  setStatus('Reply copied.', 'ok');
};

const insertReply = async () => {
  if (!state.result?.replyDraft) throw new Error('Build a reply first.');
  const tab = await getActiveLinkedInTab();
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'HLAI_INSERT_DRAFT', text: state.result.replyDraft });
  if (!response?.ok) throw new Error(response?.error || 'Could not insert the draft.');
  setStatus('Draft inserted into LinkedIn.', 'ok');
};

const saveSettings = async () => {
  await chrome.storage.local.set({
    apiBaseUrl: els.apiBaseUrl.value.trim(),
    userId: els.userId.value.trim(),
    agentName: els.agentName.value.trim(),
    agentTitle: els.agentTitle.value.trim(),
    company: els.company.value.trim(),
    language: els.language.value.trim(),
    defaultContext: els.context.value.trim()
  });
  setStatus('Settings saved.', 'ok');
};

const loadSettings = async () => {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  els.apiBaseUrl.value = settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl;
  els.userId.value = settings.userId || '';
  els.agentName.value = settings.agentName || '';
  els.agentTitle.value = settings.agentTitle || '';
  els.company.value = settings.company || '';
  els.language.value = settings.language || DEFAULT_SETTINGS.language;
};

const detectLocalUser = async () => {
  const response = await chrome.runtime.sendMessage({ type: 'HLAI_DETECT_LOCAL_USER' });
  if (!response?.ok) throw new Error(response?.error || 'Could not auto-find your user.');
  els.userId.value = response.data.userId || '';
  if (response.data.origin) {
    els.apiBaseUrl.value = response.data.origin;
  }
  setStatus(`Found your app user${response.data.email ? `: ${response.data.email}` : ''}.`, 'ok');
};

const init = async () => {
  populateSelect(els.goal, GOALS);
  populateSelect(els.tone, TONES);
  renderPresetButtons();
  applyPreset(PRESETS[0]);
  await loadSettings();

  els.detectUser.addEventListener('click', async () => {
    try {
      setStatus('Looking for your open Home Listing AI tab...');
      await detectLocalUser();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not detect your user.', 'error');
    }
  });

  els.saveSettings.addEventListener('click', async () => {
    try {
      await saveSettings();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save settings.', 'error');
    }
  });

  els.pullThread.addEventListener('click', async () => {
    try {
      setStatus('Reading the current LinkedIn thread...');
      await pullThreadFromLinkedIn();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not read LinkedIn.', 'error');
    }
  });

  els.buildPlan.addEventListener('click', async () => {
    try {
      setStatus('Building your plan...');
      await buildPlan();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not build plan.', 'error');
    }
  });

  els.copyReply.addEventListener('click', async () => {
    try {
      await copyReply();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not copy reply.', 'error');
    }
  });

  els.insertReply.addEventListener('click', async () => {
    try {
      await insertReply();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not insert reply.', 'error');
    }
  });
};

init().catch((error) => {
  setStatus(error instanceof Error ? error.message : 'Extension failed to start.', 'error');
});
