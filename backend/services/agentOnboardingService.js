const crypto = require('crypto');

const DEFAULT_DASHBOARD_MODULES = [
  {
    key: 'welcome-setup-guide',
    title: 'Welcome Setup Guide',
    type: 'guide',
    order_index: 1,
    status: 'ready',
    is_default: true
  },
  {
    key: 'follow-up-funnels',
    title: 'Follow-up Funnel Templates',
    type: 'library',
    order_index: 2,
    status: 'ready',
    is_default: true,
    metadata: {
      templates: ['welcome', 'buyers', 'sellers', 'long-touch']
    }
  },
  {
    key: 'agent-profile-setup',
    title: 'Agent Profile Setup',
    type: 'form',
    order_index: 3,
    status: 'ready',
    is_default: true
  },
  {
    key: 'chat-voice-preview',
    title: 'Chat & Voice Bot Preview',
    type: 'assistant_preview',
    order_index: 4,
    status: 'ready',
    is_default: true
  }
];

const DEFAULT_TEMPLATES = [
  {
    template_key: 'welcome-email',
    name: 'Welcome Email',
    channel: 'email',
    category: 'onboarding',
    version: 1,
    default_version: 1,
    content: `Hi {{first_name}},

Welcome aboard! Your AI Agent dashboard is ready.

👉 Click here to access it: {{dashboard_url}}

From your dashboard, you can:
- Customize your AI follow-up funnels
- Edit your chat & voice bot scripts
- See real-time engagement metrics

Login with the credentials you received in your email.

If you have any questions, reply to this email.

– The AI You Agent Team`
  },
  {
    template_key: 'buyers-sequence',
    name: 'AI Buyer Follow-up',
    channel: 'email',
    category: 'buyers',
    version: 1,
    default_version: 1,
    content: `Subject: Ready to tour your top homes?

Hi {{lead_first_name}},

I hand-picked properties that match what you told me you were looking for. Can I send you a quick shortlist or schedule a tour this week?

Talk soon,
{{agent_first_name}}`
  },
  {
    template_key: 'sellers-sequence',
    name: 'AI Seller Follow-up',
    channel: 'email',
    category: 'sellers',
    version: 1,
    default_version: 1,
    content: `Subject: Ready to see your home’s AI valuation?

Hey {{lead_first_name}},

I just generated an AI-backed pricing breakdown for your property along with recommended upgrade options.

When can we hop on a quick call to review it?

{{agent_first_name}}`
  },
  {
    template_key: 'long-touch-sequence',
    name: 'Long-Term Nurture',
    channel: 'email',
    category: 'nurture',
    version: 1,
    default_version: 1,
    content: `Subject: Quick update on the market

Hi {{lead_first_name}},

I just published a quick update on the latest market shifts you should know about. Want me to send it your way?

Staying in your corner,
{{agent_first_name}}`
  }
];

const DEFAULT_FUNNELS = [
  {
    funnel_key: 'welcome-onboarding',
    name: 'Welcome Sequence',
    description: 'Guides the agent through first login, dashboard setup, and connecting automations.',
    version: 1,
    default_version: 1,
    steps: [
      {
        step_key: 'welcome-email',
        type: 'email',
        template_key: 'welcome-email',
        delay_minutes: 0
      },
      {
        step_key: 'profile-reminder',
        type: 'email',
        subject: 'Finish setting up your AI dashboard',
        delay_minutes: 60,
        body: `Hi {{first_name}},

Your AI Agent dashboard is live. Take two minutes to complete your profile so we can personalize your automations.

👉 {{dashboard_url}}

Need help? Reply to this email.`
      },
      {
        step_key: 'funnel-tour',
        type: 'email',
        subject: 'Tour your AI follow-up funnels',
        delay_minutes: 180,
        body: `Ready to see what your AI follow-up funnels can do?

Log in here: {{dashboard_url}}

Once you are inside, open the funnel library (left menu) and activate the workflows you want live today.`
      }
    ]
  },
  {
    funnel_key: 'buyers-fast-response',
    name: 'AI Buyer Fast Response',
    description: 'Automated nurture sequence tailored for new buyer leads.',
    version: 1,
    default_version: 1,
    steps: [
      {
        step_key: 'instant-reply',
        type: 'sms',
        delay_minutes: 0,
        body: `Hey {{lead_first_name}}, this is {{agent_first_name}}. I saw your request come through and I am on it. Want me to text over a shortlist now & set up alerts?`
      },
      {
        step_key: 'next-steps-email',
        type: 'email',
        delay_minutes: 30,
        subject: 'Your next 3 steps to find the right home',
        template_key: 'buyers-sequence'
      },
      {
        step_key: 'call-to-action',
        type: 'email',
        delay_minutes: 1440,
        subject: 'Let’s schedule a quick strategy call',
        body: `I have ideas that will save you weeks of searching. Grab a time on my calendar here: {{calendar_url}}`
      }
    ]
  },
  {
    funnel_key: 'seller-high-touch',
    name: 'AI Seller Follow-up',
    description: 'Combines automated valuation touchpoints with personal outreach reminders.',
    version: 1,
    default_version: 1,
    steps: [
      {
        step_key: 'valuation-email',
        type: 'email',
        delay_minutes: 0,
        template_key: 'sellers-sequence'
      },
      {
        step_key: 'market-update',
        type: 'email',
        delay_minutes: 720,
        subject: 'Latest trends you can leverage',
        body: `Quick market insight: inventory shifted {{market_stat}} last month. Reply if you want the full breakdown.`
      },
      {
        step_key: 'followup-task',
        type: 'task',
        delay_minutes: 1440,
        body: 'Call lead to review valuation and discuss timeline.'
      }
    ]
  }
];

const sanitizeName = (raw) =>
  raw
    .trim()
    .replace(/[^a-zA-Z0-9\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-');

const titleCase = (value) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

const buildSlugBase = (firstName, lastName) => {
  const safeFirst = titleCase(sanitizeName(firstName));
  const safeLast = titleCase(sanitizeName(lastName));
  return `${safeFirst}_${safeLast}`.replace(/_{2,}/g, '_');
};

const createTempPassword = () =>
  crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

const getExistingAgentBySlug = async (client, slug) => {
  const { data, error } = await client.from('agents').select('*').eq('slug', slug).limit(1);
  if (error) throw error;
  return data?.[0] || null;
};

const generateUniqueSlug = async (client, firstName, lastName) => {
  const base = buildSlugBase(firstName, lastName);
  const { data, error } = await client
    .from('agents')
    .select('slug')
    .ilike('slug', `${base}%`);
  if (error) throw error;
  if (!data || data.length === 0) return base;

  const existing = new Set(data.map((row) => row.slug.toLowerCase()));
  if (!existing.has(base.toLowerCase())) return base;

  let counter = 2;
  let candidate = `${base}_${counter}`;
  while (existing.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base}_${counter}`;
  }
  return candidate;
};

const ensureDashboardRecord = async (client, agent, modules = DEFAULT_DASHBOARD_MODULES) => {
  const { data, error } = await client
    .from('dashboards')
    .select('*')
    .eq('agent_id', agent.id)
    .limit(1);
  if (error) throw error;

  if (data && data.length > 0) {
    const dashboard = data[0];
    const updatedUrl = `/dashboard/${agent.slug}`;
    if (dashboard.dashboard_url !== updatedUrl) {
      const { data: updated, error: updateErr } = await client
        .from('dashboards')
        .update({ dashboard_url: updatedUrl })
        .eq('id', dashboard.id)
        .select('*')
        .limit(1);
      if (updateErr) throw updateErr;
      return updated?.[0] || { ...dashboard, dashboard_url: updatedUrl };
    }
    return dashboard;
  }

  const payload = {
    agent_id: agent.id,
    dashboard_url: `/dashboard/${agent.slug}`,
    modules,
    status: 'active',
    created_at: new Date().toISOString()
  };

  const { data: inserted, error: insertErr } = await client
    .from('dashboards')
    .insert(payload)
    .select('*')
    .limit(1);
  if (insertErr) throw insertErr;
  return inserted?.[0] || payload;
};

const ensureTemplates = async (client, agentId, templates = DEFAULT_TEMPLATES) => {
  const { data: existing, error: fetchErr } = await client
    .from('templates')
    .select('template_key')
    .eq('agent_id', agentId);
  if (fetchErr) throw fetchErr;

  const existingKeys = new Set((existing || []).map((t) => t.template_key));
  const inserts = templates
    .filter((tpl) => !existingKeys.has(tpl.template_key))
    .map((tpl) => ({
      agent_id: agentId,
      ...tpl,
      is_default: true,
      is_archived: false,
      created_at: new Date().toISOString()
    }));

  if (inserts.length === 0) return [];

  const { data, error } = await client.from('templates').insert(inserts).select('*');
  if (error) throw error;
  return data;
};

const ensureFunnels = async (client, agentId, funnels = DEFAULT_FUNNELS) => {
  const { data: existing, error: fetchErr } = await client
    .from('funnels')
    .select('funnel_key')
    .eq('agent_id', agentId);
  if (fetchErr) throw fetchErr;

  const existingKeys = new Set((existing || []).map((funnel) => funnel.funnel_key));
  const inserts = funnels
    .filter((funnel) => !existingKeys.has(funnel.funnel_key))
    .map((funnel) => ({
      agent_id: agentId,
      ...funnel,
      is_default: true,
      is_archived: false,
      created_at: new Date().toISOString()
    }));

  if (inserts.length === 0) return [];

  const { data, error } = await client.from('funnels').insert(inserts).select('*');
  if (error) throw error;
  return data;
};

const ensureAuthUser = async (adminClient, agent) => {
  const { data: existing, error: getErr } = await adminClient.auth.admin.getUserByEmail(agent.email);
  if (getErr && getErr.message && !getErr.message.includes('User not found')) {
    throw getErr;
  }

  if (existing && existing.user) {
    return { isNew: false, userId: existing.user.id, email: agent.email };
  }

  const password = createTempPassword();
  const { data, error } = await adminClient.auth.admin.createUser({
    email: agent.email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: agent.first_name,
      last_name: agent.last_name,
      slug: agent.slug,
      role: 'agent'
    }
  });

  if (error) {
    if (error.message?.toLowerCase().includes('already') || error.status === 422) {
      console.warn(`[Onboarding] User ${agent.email} already exists during creation. Fetching existing.`);
      const { data: retry } = await adminClient.auth.admin.getUserByEmail(agent.email);
      if (retry && retry.user) {
        return { isNew: false, userId: retry.user.id, email: agent.email };
      }
    }
    throw error;
  }

  return {
    isNew: true,
    userId: data.user.id,
    email: agent.email,
    password
  };
};

const markAgentStatus = async (client, agentId, statusUpdate) => {
  const { data, error } = await client
    .from('agents')
    .update(statusUpdate)
    .eq('id', agentId)
    .select('*')
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
};

const archiveAgentAssets = async (client, agent) => {
  const archivedAt = new Date().toISOString();

  await client
    .from('dashboards')
    .update({ status: 'archived', archived_at: archivedAt })
    .eq('agent_id', agent.id);

  await client
    .from('funnels')
    .update({ is_archived: true, archived_at: archivedAt })
    .eq('agent_id', agent.id);

  await client
    .from('templates')
    .update({ is_archived: true, archived_at: archivedAt })
    .eq('agent_id', agent.id);
};

module.exports = ({ supabaseAdmin, emailService, dashboardBaseUrl }) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is required for agent onboarding service');
  }
  if (!emailService) {
    throw new Error('Email service is required for agent onboarding service');
  }

  const getAgentBySlug = async (slug) => {
    const { data, error } = await supabaseAdmin.from('agents').select('*').eq('slug', slug).limit(1);
    if (error) throw error;
    return data?.[0] || null;
  };

  const registerAgent = async ({ firstName, lastName, email }) => {
    if (!firstName || !lastName || !email) {
      throw new Error('Missing required fields for agent registration');
    }

    const slug = await generateUniqueSlug(supabaseAdmin, firstName, lastName);

    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        slug,
        status: 'pending',
        payment_status: 'awaiting_payment'
      })
      .select('*')
      .limit(1);

    if (error) throw error;

    return { agent: data?.[0], slug };
  };

  const handlePaymentSuccess = async ({
    slug,
    paymentProvider,
    paymentReference,
    amount,
    currency = 'usd',
    isAdminBypass = false
  }) => {
    if (!slug) {
      throw new Error('Missing slug for payment success handling');
    }

    const agent = await getAgentBySlug(slug);
    if (!agent) {
      throw new Error(`Agent with slug ${slug} not found`);
    }

    const statusUpdate = {
      status: isAdminBypass ? 'admin_test' : 'active',
      payment_status: isAdminBypass ? 'bypassed' : 'paid',
      activated_at: new Date().toISOString(),
      last_payment_provider: paymentProvider || null,
      last_payment_reference: paymentReference || null,
      last_payment_amount: amount || null,
      last_payment_currency: currency
    };

    const updatedAgent = await markAgentStatus(supabaseAdmin, agent.id, statusUpdate);

    const dashboard = await ensureDashboardRecord(supabaseAdmin, updatedAgent);
    await ensureTemplates(supabaseAdmin, updatedAgent.id);
    await ensureFunnels(supabaseAdmin, updatedAgent.id);

    const credentials = await ensureAuthUser(supabaseAdmin, updatedAgent);

    if (credentials.userId && updatedAgent.auth_user_id !== credentials.userId) {
      const { data: agentWithAuth, error: authUpdateError } = await supabaseAdmin
        .from('agents')
        .update({ auth_user_id: credentials.userId })
        .eq('id', updatedAgent.id)
        .select('*')
        .limit(1);
      if (authUpdateError) {
        throw authUpdateError;
      }
      if (agentWithAuth && agentWithAuth.length > 0) {
        Object.assign(updatedAgent, agentWithAuth[0]);
      }
    }
    const dashboardUrl = `${dashboardBaseUrl || 'https://aiyouagent.com'}${dashboard.dashboard_url}`;

    await emailService.sendWelcomeEmail({
      to: updatedAgent.email,
      firstName: updatedAgent.first_name,
      dashboardUrl
    });

    if (credentials.isNew && credentials.password) {
      await emailService.sendCredentialsEmail({
        to: updatedAgent.email,
        firstName: updatedAgent.first_name,
        password: credentials.password,
        dashboardUrl
      });
    }

    return {
      agent: updatedAgent,
      dashboard,
      credentials: credentials.isNew ? { email: credentials.email, password: credentials.password } : null
    };
  };

  const handleAgentDeletion = async ({ slug, reason }) => {
    if (!slug) {
      throw new Error('Missing slug for agent deletion handling');
    }

    const agent = await getAgentBySlug(slug);
    if (!agent) {
      return { skipped: true };
    }

    await archiveAgentAssets(supabaseAdmin, agent);
    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({
        status: 'deleted',
        payment_status: agent.payment_status,
        archived_at: new Date().toISOString(),
        archived_reason: reason || null
      })
      .eq('id', agent.id)
      .select('*')
      .limit(1);
    if (error) throw error;

    return { agent: data?.[0] };
  };

  return {
    registerAgent,
    getAgentBySlug,
    handlePaymentSuccess,
    handleAgentDeletion
  };
};
