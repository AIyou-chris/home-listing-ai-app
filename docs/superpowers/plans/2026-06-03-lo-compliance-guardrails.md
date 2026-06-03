# LO Compliance Guardrails — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hard-coded platform compliance guardrails + per-LO company compliance doc upload to the AI Financing Bot, enforced across the chatbot and all LO AI content surfaces.

**Architecture:** Extract a `buildLoSystemPrompt()` helper in the backend that assembles system prompts in compliance-first order (platform guardrails → company rules → knowledge base). Add a `compliance_rules TEXT` column to `lo_chatbot_configs`. Add a Compliance Rules tab to the frontend chatbot setup page using the same component pattern as `KnowledgeBaseSection`.

**Tech Stack:** Express 5 / Node.js, Supabase (Postgres), React 18 + TypeScript, Tailwind CSS, multer (already in use for file upload), pdf-parse (already in use)

---

## Files

| File | Action |
|---|---|
| `GOLDEN_RULES.md` | Add Rule 4 |
| `lo-compliance-migration.sql` | New — DB migration |
| `backend/server.cjs` | Add `buildLoSystemPrompt()`, update chatbot config GET/PUT, add DELETE compliance endpoint, update `/api/public/lo-chat` |
| `src/components/dashboard-command/LOChatbotSetupPage.tsx` | Add `ComplianceSection` component, tab navigation, wire `compliance_rules` into load/save |

---

## Task 1: Add Golden Rule 4 to GOLDEN_RULES.md

**Files:**
- Modify: `GOLDEN_RULES.md`

- [ ] **Step 1: Add Rule 4**

Open `GOLDEN_RULES.md`. After the Rule 3 block (the `⚡ Keep It Simple and Fast` section and its bullets), add this new section before `---` / `## What This App Actually Solves`:

```markdown
### 4. 🛡️ Be Compliant by Default
The AI never puts an LO's license or their company's reputation at risk.
Hard-coded platform rules are always active and cannot be removed by any user.
LOs can layer their own company's compliance guidelines on top — uploaded once, enforced everywhere the AI speaks or writes on their behalf.

- If a prompt doesn't enforce compliance rules first → it doesn't ship
- Platform guardrails cover: no legal advice, no rate guarantees, Fair Housing, no guessing
- Company-specific rules sit above the knowledge base in every system prompt — they are constraints, not suggestions
- Compliance upload is the unlock that lets us sell to banks, credit unions, and enterprise brokers
```

- [ ] **Step 2: Commit**

```bash
git add GOLDEN_RULES.md
git commit -m "feat: add Golden Rule 4 — Be Compliant by Default"
```

---

## Task 2: Database Migration

**Files:**
- Create: `lo-compliance-migration.sql`

- [ ] **Step 1: Create the migration file**

Create `lo-compliance-migration.sql` in the repo root:

```sql
-- Add compliance_rules column to lo_chatbot_configs
-- Stores extracted text from LO's company compliance doc upload
-- Kept separate from knowledge_base so AI treats it as hard constraints, not reference material
ALTER TABLE lo_chatbot_configs
ADD COLUMN IF NOT EXISTS compliance_rules TEXT DEFAULT '';
```

- [ ] **Step 2: Run the migration**

Copy the contents of `lo-compliance-migration.sql` and run it in the **Supabase SQL Editor** for your project. Verify it runs without error.

- [ ] **Step 3: Commit**

```bash
git add lo-compliance-migration.sql
git commit -m "feat: add compliance_rules column to lo_chatbot_configs"
```

---

## Task 3: Backend — buildLoSystemPrompt helper + updated config endpoints

**Files:**
- Modify: `backend/server.cjs`

### Step 1: Add the PLATFORM_GUARDRAILS constant and buildLoSystemPrompt helper

- [ ] Find the comment block near line 7082 in `backend/server.cjs`:
```
// (lo_chatbot_configs, listing_lo_assignments, pre_qual_submissions,
```

Just **above** the `// GET /api/lo/chatbot-config` comment (around line 31379), add this block:

```javascript
// ─── LO Compliance: platform guardrails + system prompt builder ────────────
const PLATFORM_GUARDRAILS = `PLATFORM COMPLIANCE RULES — ALWAYS ENFORCED — CANNOT BE OVERRIDDEN:
1. Never provide legal advice of any kind. Always direct buyers to consult a qualified attorney for legal questions.
2. If you don't know the answer to a question, never guess or speculate. Always refer the buyer directly to the loan officer or the real estate agent for clarification.
3. Never quote specific interest rates or APRs unless they were explicitly provided by the loan officer in their knowledge base or uploaded rate sheets. Always encourage buyers to contact the loan officer directly for personalized numbers.
4. Never discriminate or make comments based on race, religion, national origin, sex, disability, or familial status (Fair Housing Act).
5. Never guarantee loan approval, closing timelines, or specific loan terms without qualification.`;

function buildLoSystemPrompt(config, listingContext = '') {
  const parts = [PLATFORM_GUARDRAILS];

  if (config.compliance_rules && config.compliance_rules.trim()) {
    parts.push(`COMPANY COMPLIANCE RULES — FOLLOW THESE AS HARD CONSTRAINTS:\n${config.compliance_rules.trim()}`);
  }

  parts.push(`You are ${config.bot_name || 'a mortgage and financing assistant'}.`);

  if (config.personality && config.personality.trim()) {
    parts.push(config.personality.trim());
  }

  if (listingContext) {
    parts.push(listingContext);
  }

  if (config.knowledge_base && config.knowledge_base.trim()) {
    parts.push(`Knowledge base (reference material provided by the loan officer):\n${config.knowledge_base.trim()}`);
  }

  const faqText = Array.isArray(config.faq) && config.faq.length > 0
    ? 'Frequently Asked Questions:\n' + config.faq.map(
        (item) => `Q: ${item.question}\nA: ${item.answer}`
      ).join('\n\n')
    : '';

  if (faqText) parts.push(faqText);

  parts.push('Keep responses brief (2-4 sentences).');

  return parts.join('\n\n');
}
// ──────────────────────────────────────────────────────────────────────────────
```

### Step 2: Update GET /api/lo/chatbot-config to include compliance_rules

- [ ] Find this line (around line 31386):
```javascript
      const { data, error } = await supabaseAdmin
        .from('lo_chatbot_configs')
        .select('*')
        .eq('lo_agent_id', agentId)
        .maybeSingle();
```

The `select('*')` already returns all columns, so `compliance_rules` will come through automatically once the migration runs. No change needed to the select.

Find the default return block (no config saved yet) and add `compliance_rules`:

```javascript
    // Return defaults if no config saved yet
    if (!data) {
      return res.json({
        bot_name: 'Your Loan Officer',
        greeting: 'Hi! I can answer your financing and mortgage questions. What would you like to know?',
        personality: 'Professional, friendly, and knowledgeable mortgage advisor. Keep answers clear and concise. Always encourage the visitor to reach out directly for personalized numbers.',
        knowledge_base: '',
        compliance_rules: '',
        faq: [],
        is_active: true
      });
    }
```

### Step 3: Update PUT /api/lo/chatbot-config to save compliance_rules

- [ ] Find the upsert in `PUT /api/lo/chatbot-config` (around line 31419). Change:

```javascript
    const { bot_name, greeting, personality, knowledge_base, faq, is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from('lo_chatbot_configs')
      .upsert({
        lo_agent_id: agentId,
        bot_name: bot_name || 'Your Loan Officer',
        greeting: greeting || 'Hi! I can answer your financing and mortgage questions.',
        personality: personality || '',
        knowledge_base: knowledge_base || '',
        faq: Array.isArray(faq) ? faq : [],
        is_active: is_active !== false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lo_agent_id' })
```

To:

```javascript
    const { bot_name, greeting, personality, knowledge_base, compliance_rules, faq, is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from('lo_chatbot_configs')
      .upsert({
        lo_agent_id: agentId,
        bot_name: bot_name || 'Your Loan Officer',
        greeting: greeting || 'Hi! I can answer your financing and mortgage questions.',
        personality: personality || '',
        knowledge_base: knowledge_base || '',
        compliance_rules: typeof compliance_rules === 'string' ? compliance_rules : '',
        faq: Array.isArray(faq) ? faq : [],
        is_active: is_active !== false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lo_agent_id' })
```

### Step 4: Add DELETE /api/lo/chatbot/compliance-doc endpoint

- [ ] After the `PUT /api/lo/chatbot-config` route block (after its closing `});`), add:

```javascript
// DELETE /api/lo/chatbot/compliance-doc — clear LO's uploaded compliance rules
app.delete('/api/lo/chatbot/compliance-doc', requireLoAgent, async (req, res) => {
  try {
    const agentId = req.loAgentId;

    const { error } = await supabaseAdmin
      .from('lo_chatbot_configs')
      .update({ compliance_rules: '', updated_at: new Date().toISOString() })
      .eq('lo_agent_id', agentId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[LO Compliance Doc DELETE] Error:', err);
    res.status(500).json({ error: 'failed_to_clear_compliance_rules' });
  }
});
```

### Step 5: Update /api/public/lo-chat to use buildLoSystemPrompt

- [ ] Find the `/api/public/lo-chat` route. Change the select to include `compliance_rules`:

```javascript
    const { data: config, error: configErr } = await supabaseAdmin
      .from('lo_chatbot_configs')
      .select('bot_name, greeting, personality, knowledge_base, compliance_rules, faq, is_active')
      .eq('lo_agent_id', lo_agent_id)
      .eq('is_active', true)
      .maybeSingle();
```

- [ ] Then replace the entire `// Build FAQ context` + `// Build system prompt` block with a single call:

Remove this:
```javascript
    // Build FAQ context
    const faqText = Array.isArray(config.faq) && config.faq.length > 0
      ? '\n\nFrequently Asked Questions:\n' + config.faq.map(
          (item) => `Q: ${item.question}\nA: ${item.answer}`
        ).join('\n\n')
      : '';

    // Build system prompt
    const systemPrompt = [
      `You are ${config.bot_name}, a mortgage and financing assistant.`,
      config.personality,
      listingContext,
      config.knowledge_base ? `\nKnowledge base:\n${config.knowledge_base}` : '',
      faqText,
      '\nKeep responses brief (2-4 sentences). Do not give specific rate quotes — encourage visitors to contact you directly for personalized numbers. Never discuss topics unrelated to real estate financing and mortgages.'
    ].filter(Boolean).join('\n');
```

Replace with:
```javascript
    const systemPrompt = buildLoSystemPrompt(config, listingContext);
```

- [ ] **Step 6: Commit all backend changes**

```bash
git add backend/server.cjs
git commit -m "feat: add buildLoSystemPrompt with compliance-first ordering, update lo-chat and config endpoints"
```

---

## Task 4: Frontend — ComplianceSection component + tab nav in LOChatbotSetupPage

**Files:**
- Modify: `src/components/dashboard-command/LOChatbotSetupPage.tsx`

### Step 1: Update ChatbotConfig type and add compliance_rules to state

- [ ] In `LOChatbotSetupPage.tsx`, update the `ChatbotConfig` interface:

```typescript
interface ChatbotConfig {
  bot_name: string;
  greeting: string;
  personality: string;
  knowledge_base: string;
  compliance_rules: string;
  faq: FaqItem[];
  is_active: boolean;
}
```

- [ ] Update the initial state in `LOChatbotSetupPage`:

```typescript
  const [config, setConfig] = useState<ChatbotConfig>({
    bot_name: '',
    greeting: '',
    personality: '',
    knowledge_base: '',
    compliance_rules: '',
    faq: [],
    is_active: true
  });
```

- [ ] Update the load effect to include `compliance_rules`:

```typescript
          setConfig({
            bot_name: data.bot_name || '',
            greeting: data.greeting || '',
            personality: data.personality || '',
            knowledge_base: data.knowledge_base || '',
            compliance_rules: data.compliance_rules || '',
            faq: Array.isArray(data.faq) ? data.faq.map((f: Omit<FaqItem, 'id'> & { id?: string }) => ({
              ...f,
              id: f.id || crypto.randomUUID()
            })) : [],
            is_active: data.is_active !== false
          });
```

### Step 2: Add the ComplianceSection component

- [ ] Add this component in `LOChatbotSetupPage.tsx`, just above the `BotPreview` component definition:

```typescript
// ─── Compliance Section ───────────────────────────────────────────────────────

const PLATFORM_RULES = [
  'Never provide legal advice of any kind. Always direct buyers to consult a qualified attorney for legal questions.',
  'If you don\'t know the answer to a question, never guess or speculate. Always refer the buyer directly to the loan officer or the real estate agent for clarification.',
  'Never quote specific interest rates or APRs unless they were provided by the loan officer in their knowledge base or uploaded rate sheets. Always encourage buyers to contact the loan officer directly for personalized numbers.',
  'Never discriminate or make comments based on race, religion, national origin, sex, disability, or familial status (Fair Housing Act).',
  'Never guarantee loan approval, closing timelines, or specific loan terms without qualification.',
];

const ComplianceSection: React.FC<{
  value: string;
  onChange: (text: string) => void;
  getHeaders: () => Promise<HeadersInit>;
}> = ({ value, onChange, getHeaders }) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadComplianceFile = async (file: File) => {
    setUploading(true);
    try {
      const headers = await getHeaders();
      const headerEntries = Object.entries(headers as Record<string, string>).filter(([k]) => k.toLowerCase() !== 'content-type');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(buildApiUrl('/api/lo/chatbot/extract-file'), {
        method: 'POST',
        headers: Object.fromEntries(headerEntries),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to extract file');
      onChange(data.text);
      toast.success('Compliance rules uploaded and active');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeDoc = async () => {
    if (!window.confirm('Remove your uploaded compliance rules? Platform guardrails will still apply.')) return;
    setRemoving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(buildApiUrl('/api/lo/chatbot/compliance-doc'), {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('remove_failed');
      onChange('');
      toast.success('Compliance rules removed');
    } catch {
      toast.error('Failed to remove. Try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <span className="material-symbols-outlined text-base text-red-500">shield_lock</span>
        Compliance Rules
      </h2>

      {/* Platform guardrails — locked */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Platform Guardrails</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700">Always On · Cannot Be Removed</span>
        </div>
        <div className="space-y-2">
          {PLATFORM_RULES.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border-l-4 border-red-300 bg-slate-50 px-4 py-2.5">
              <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-sm text-red-400">lock</span>
              <p className="text-xs text-slate-700">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      <hr className="mb-5 border-slate-100" />

      {/* Company compliance upload */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Your Company's Compliance Rules</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">Optional</span>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Get a compliance doc from your compliance officer. Upload it here and the AI will follow those rules in every response and piece of content it generates.
        </p>

        {value ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="material-symbols-outlined flex-shrink-0 text-2xl text-red-400">picture_as_pdf</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">Compliance rules active</p>
              <p className="text-xs text-slate-500">{value.length.toLocaleString()} characters · Applied to all AI responses</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <button
                onClick={() => void removeDoc()}
                disabled={removing}
                className="text-xs text-slate-400 transition hover:text-red-500 disabled:opacity-50"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        ) : null}

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void uploadComplianceFile(file);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition hover:border-primary-400 hover:bg-primary-50"
        >
          {uploading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-3xl text-primary-500">progress_activity</span>
              <p className="text-sm font-medium text-slate-600">Extracting compliance rules...</p>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-3xl text-slate-400">upload_file</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {value ? 'Upload a new compliance doc' : 'Drop your compliance doc here'}
                </p>
                <p className="mt-1 text-xs text-slate-400">PDF, TXT, or Word · Max 10MB</p>
              </div>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadComplianceFile(file);
          }}
        />
      </div>
    </section>
  );
};
```

### Step 3: Add tab state and render ComplianceSection in the page

- [ ] In `LOChatbotSetupPage`, add a tab state variable just below the existing state declarations:

```typescript
  const [activeTab, setActiveTab] = useState<'identity' | 'knowledge' | 'compliance' | 'faq'>('identity');
```

- [ ] Replace the `<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">` block (the entire left column content) with the following. This adds a tab bar above the sections and conditionally renders each section:

```tsx
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Config with tabs */}
        <div>
          {/* Tab nav */}
          <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(
              [
                { id: 'identity', label: 'Identity & Tone', icon: 'smart_toy' },
                { id: 'knowledge', label: 'Knowledge Base', icon: 'library_books' },
                { id: 'compliance', label: 'Compliance', icon: 'shield_lock' },
                { id: 'faq', label: 'FAQ', icon: 'quiz' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {/* Identity & Tone tab */}
            {activeTab === 'identity' && (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    <span className="material-symbols-outlined text-base text-emerald-500">smart_toy</span>
                    Bot Identity
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Bot Name</label>
                      <input
                        value={config.bot_name}
                        onChange={(e) => setConfig((c) => ({ ...c, bot_name: e.target.value }))}
                        placeholder="e.g. Jake's Financing Assistant"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Opening Greeting</label>
                      <textarea
                        value={config.greeting}
                        onChange={(e) => setConfig((c) => ({ ...c, greeting: e.target.value }))}
                        placeholder="Hi! I can answer your mortgage and financing questions..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                      />
                      <p className="mt-1 text-xs text-slate-400">This is the first message visitors see when they open the chat.</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    <span className="material-symbols-outlined text-base text-emerald-500">psychology</span>
                    Personality & Tone
                  </h2>
                  <textarea
                    value={config.personality}
                    onChange={(e) => setConfig((c) => ({ ...c, personality: e.target.value }))}
                    placeholder="Professional and friendly mortgage advisor. Use simple language. Always encourage visitors to reach out directly for personalized rates..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">Describe how you want the bot to communicate. This shapes every reply.</p>
                </section>
              </>
            )}

            {/* Knowledge Base tab */}
            {activeTab === 'knowledge' && (
              <KnowledgeBaseSection
                value={config.knowledge_base}
                onChange={(text) => setConfig((c) => ({ ...c, knowledge_base: text }))}
                getHeaders={getApiHeaders}
              />
            )}

            {/* Compliance tab */}
            {activeTab === 'compliance' && (
              <ComplianceSection
                value={config.compliance_rules}
                onChange={(text) => setConfig((c) => ({ ...c, compliance_rules: text }))}
                getHeaders={getApiHeaders}
              />
            )}

            {/* FAQ tab */}
            {activeTab === 'faq' && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    <span className="material-symbols-outlined text-base text-emerald-500">quiz</span>
                    FAQ Pairs
                  </h2>
                  <button
                    onClick={addFaq}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Question
                  </button>
                </div>

                {config.faq.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                    No FAQ pairs yet. Add common financing questions visitors ask.
                  </p>
                )}

                <div className="space-y-4">
                  {config.faq.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Q&A Pair</span>
                        <button
                          onClick={() => removeFaq(item.id)}
                          className="rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-rose-500"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                      <input
                        value={item.question}
                        onChange={(e) => updateFaq(item.id, 'question', e.target.value)}
                        placeholder="Question (e.g. What's the minimum down payment?)"
                        className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary-400"
                      />
                      <textarea
                        value={item.answer}
                        onChange={(e) => updateFaq(item.id, 'answer', e.target.value)}
                        placeholder="Answer..."
                        rows={2}
                        className="w-full resize-none rounded border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-primary-400"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-slate-400">preview</span>
            <p className="text-sm font-semibold text-slate-600">Live Preview</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Simulated
            </span>
          </div>
          <BotPreview config={config} />
          <p className="mt-3 text-center text-xs text-slate-400">
            Preview uses FAQ matching only. Live bot uses OpenAI with your full knowledge base.
          </p>
        </div>
      </div>
```

- [ ] **Step 4: Commit frontend changes**

```bash
git add src/components/dashboard-command/LOChatbotSetupPage.tsx
git commit -m "feat: add Compliance Rules tab to LO chatbot setup with platform guardrails + company doc upload"
```

---

## Task 5: Smoke Test

- [ ] **Step 1: Start the dev servers**

```bash
npm run dev
# In a second terminal:
npm --prefix backend run dev
```

- [ ] **Step 2: Test the Compliance tab**

1. Go to `/dashboard/lo-chatbot`
2. Click the **Compliance** tab
3. Verify all 5 locked platform rules are visible with the red left border treatment
4. Upload a test PDF or TXT file — verify "Compliance rules active" state appears
5. Click Remove — verify the upload zone returns
6. Click Save Changes — verify no console errors

- [ ] **Step 3: Verify compliance appears in chatbot prompts**

Open your backend terminal logs. Send a message to a listing's chatbot. Confirm the server logs show the prompt starting with `PLATFORM COMPLIANCE RULES`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: LO compliance guardrails — platform rules + company upload, compliance-first system prompts"
```
