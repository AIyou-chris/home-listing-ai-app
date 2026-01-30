const assertFetchAvailable = () => {
  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch is not available. Please run on Node 18+ or polyfill fetch for email service.'
    );
  }
};

const { sendAlert } = require('./slackService');

const buildWelcomeHtml = (firstName, dashboardUrl, password) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; }
      .logo { width: 48px; height: 48px; background-color: white; border-radius: 8px; padding: 4px; margin-bottom: 16px; object-fit: contain; }
      .header-title { color: white; font-size: 24px; font-weight: bold; margin: 0; }
      .content { padding: 32px 24px; }
      .greeting { font-size: 20px; font-weight: 600; margin-bottom: 24px; color: #0f172a; }
      .hero-text { font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #475569; }
      .btn-container { text-align: center; margin: 32px 0; }
      .btn { background-color: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
      .section-title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
      .feature-list { list-style: none; padding: 0; margin: 0; }
      .feature-item { display: flex; align-items: flex-start; margin-bottom: 16px; }
      .feature-icon { background-color: #e0e7ff; color: #4338ca; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; font-size: 14px; font-weight: bold; }
      .feature-text { font-size: 15px; line-height: 1.5; color: #475569; }
      .feature-title { font-weight: 600; color: #1e293b; display: block; margin-bottom: 2px; }
      .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: #64748b; }
      .credentials-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0; font-size: 15px; color: #1e40af; }
      .credentials-title { font-weight: bold; margin-bottom: 8px; color: #1e3a8a; display: block; }
      .credential-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .credential-label { font-weight: 600; color: #1e40af; }
      .credential-value { font-family: monospace; background: rgba(255,255,255,0.5); padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div style="padding: 24px;">
      <div class="container">
        <div class="header">
          <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" class="logo">
          <h1 class="header-title">Welcome to Your AI Command Center</h1>
        </div>
        
        <div class="content">
          <h2 class="greeting">Hi ${firstName} 👋</h2>
          <p class="hero-text">
            We're thrilled to have you on board! Your personal AI Real Estate Dashboard is set up and ready to revolutionize how you handle leads, listings, and client communications.
          </p>

          ${password ? `
          <div class="credentials-box">
            <span class="credentials-title">🔐 Your Login Credentials</span>
            <div style="margin-top: 8px;">
              <div><strong>Email:</strong> This address</div>
              <div style="margin-top: 4px;"><strong>Temporary Password:</strong> <span class="credential-value">${password}</span></div>
            </div>
            <div style="margin-top: 12px; font-size: 13px; opacity: 0.9;">
              For security, please change this password after your first login (Settings → Security).
            </div>
          </div>
          ` : ''}

          <div class="btn-container">
            <a href="${dashboardUrl}" class="btn">Launch My Dashboard</a>
          </div>

          <h3 class="section-title">🚀 What You Can Do Now</h3>
          <ul class="feature-list">
            <li class="feature-item">
              <div class="feature-icon">✨</div>
              <div class="feature-text">
                <span class="feature-title">Deploy Your AI Sidekicks</span>
                 Activate your specialized agents: Listing Agent (for property details), Sales Agent (for lead qualification), and Helper (for coaching).
              </div>
            </li>
            <li class="feature-item">
              <div class="feature-icon">📈</div>
              <div class="feature-text">
                <span class="feature-title">Automate Lead Nurturing</span>
                Set up intelligent follow-up sequences. Our system tracks engagement and notifies you the moment a lead is hot.
              </div>
            </li>
            <li class="feature-item">
              <div class="feature-icon">🏠</div>
              <div class="feature-text">
                <span class="feature-title">Create Instant Listing Sites</span>
                Turn any address into a stunning, SEO-optimized single property website in seconds.
              </div>
            </li>
            <li class="feature-item">
              <div class="feature-icon">💬</div>
              <div class="feature-text">
                <span class="feature-title">24/7 Multilingual Support</span>
                Your AI agents speak 12 languages fluently, ensuring you never miss a opportunity with international buyers.
              </div>
            </li>
          </ul>
        </div>

        <div class="footer">
          <p>Sent with 💙 by the HomeListingAI Team</p>
          <p>Need help? Just reply to this email, we're here for you.</p>
          <p style="margin-top: 12px; font-size: 12px;">© ${new Date().getFullYear()} HomeListingAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
`;


const buildTrialHtml = (firstName, day, dashboardUrl) => {
  const styles = `
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; }
    .logo { width: 48px; height: 48px; background-color: white; border-radius: 8px; padding: 4px; margin-bottom: 16px; object-fit: contain; }
    .header-title { color: white; font-size: 24px; font-weight: bold; margin: 0; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 20px; font-weight: 600; margin-bottom: 24px; color: #0f172a; }
    .body-text { font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #475569; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background-color: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
    .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: #64748b; }
    .pro-tip-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .pro-tip-title { font-weight: bold; color: #15803d; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .how-to-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .how-to-title { font-weight: bold; color: #334155; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  `;

  let content = '';
  let subject = '';
  let btnText = 'Login to Dashboard';
  let btnLink = dashboardUrl;

  if (day === 1) {
    subject = 'Your Business Card is Dead. (Here is the upgrade)';
    content = `
      <p class="body-text">You signed up effectively, but are you using your <strong>AI Agent</strong> to its full potential?</p>
      <p class="body-text">Paper business cards get lost or thrown away. Your <strong>AI Card</strong> works 24/7.</p>
      <p class="body-text">It's not just a profile—it's a fully interactive <strong>Lead Capture Machine</strong>.</p>
      
      <p class="body-text" style="margin-bottom: 8px;"><strong>Why your AI Card wins listings:</strong></p>
      <ul class="body-text" style="padding-left: 20px; margin-top: 0;">
        <li style="margin-bottom: 8px;"><strong>🗣️ Instant Conversation:</strong> Leads can talk to your AI immediately—no forms to fill out.</li>
        <li style="margin-bottom: 8px;"><strong>🧠 Smart Qualification:</strong> It asks the right questions (Budget? Timeline?) while you sleep.</li>
        <li style="margin-bottom: 8px;"><strong>📲 One-Tap Save:</strong> Clients can save your contact info directly to their phone.</li>
      </ul>

      <p class="body-text"><strong>Stop handing out paper. Start capturing leads.</strong></p>

      <div class="btn-container">
        <a href="${dashboardUrl}/admin/ai-card" class="btn">View My AI Card</a>
      </div>
      <div class="pro-tip-box">
        <div class="pro-tip-title">💡 Pro Tip</div>
        <p class="body-text" style="margin:0; font-size:15px;">Print your AI Card's <strong>QR Code</strong> and put it on your Open House signs. Visitors scan it, meet your AI, and get instantly logged in your CRM. No more messy sign-in sheets.</p>
      </div>
      <div class="how-to-box">
        <div class="how-to-title">🛠️ How To</div>
        <ol class="body-text" style="margin:0; padding-left: 20px; font-size:15px;">
          <li>Go to "AI Card" in your dashboard.</li>
          <li>Click "Share" → "Download QR Code".</li>
          <li>Create a new Listing Site instantly by entering an address in the "Listings" tab.</li>
        </ol>
      </div>
    `;
  } else if (day === 2) {
    subject = 'Let Your Listing Sell Itself';
    content = `
      <p class="body-text">Stop manually building landing pages.</p>
      <p class="body-text">Your AI Agent builds a dedicated <strong>Single Property AI Application</strong> for every listing—instantly.</p>
      <p class="body-text">It's not just a photo gallery. It's a 24/7 Virtual Open House that captures buyers.</p>
      
      <p class="body-text" style="margin-bottom: 8px;"><strong>Why Agents Love AI Listings:</strong></p>
      <ul class="body-text" style="padding-left: 20px; margin-top: 0;">
        <li style="margin-bottom: 8px;"><strong>🚀 Zero Work:</strong> Just type the address. AI writes the description, picks the photos, and builds the site.</li>
        <li style="margin-bottom: 8px;"><strong>🎨 Stunning Design:</strong> Premium layouts that look like you paid a pro agency $500.</li>
        <li style="margin-bottom: 8px;"><strong>🔍 SEO & Social Ready:</strong> Perfect for sharing on Facebook/Instagram. Visitors land on <em>your</em> branded page, not Zillow.</li>
        <li style="margin-bottom: 8px;"><strong>🧠 Intelligent Capture:</strong> Visitors can ask questions ("How are the schools?") and get instant AI answers.</li>
      </ul>

      <p class="body-text"><strong>Your listings deserve to shine. And you deserve to sleep.</strong></p>

      <div class="btn-container">
        <a href="${dashboardUrl}/admin/listings" class="btn">Create Listing Site</a>
      </div>
      <div class="pro-tip-box">
        <div class="pro-tip-title">💡 Pro Tip</div>
        <p class="body-text" style="margin:0; font-size:15px;">Post your AI Listing link to local Facebook Community groups. The "What's my home worth?" tool is built into every page, capturing seller leads from your buyer traffic.</p>
      </div>
      <div class="how-to-box">
        <div class="how-to-title">🛠️ How To</div>
        <ol class="body-text" style="margin:0; padding-left: 20px; font-size:15px;">
          <li>Click <strong>"Listings"</strong>.</li>
          <li>Click <strong>"Add New"</strong> and type the address.</li>
          <li>Watch the AI build the site. Click <strong>"Publish"</strong>.</li>
        </ol>
      </div>
    `;
  } else if (day === 3) {
    subject = 'Your ROI: The math is simple.';
    content = `
      <p class="body-text">This is it. Your 3-Day Trial is ending.</p>
      <p class="body-text">You’ve seen how your <strong>AI Card</strong> captures authentic leads.</p>
      <p class="body-text">You’ve seen how <strong>Single Property AI Applications</strong> turn listings into 24/7 virtual tours.</p>
      
      <p class="body-text" style="font-size: 18px; font-weight: bold; color: #4f46e5; margin: 15px 0;">But here is the real question: What is your time worth?</p>

      <p class="body-text">Every day, agents lose money doing tasks a robot should do:</p>
      <ul class="body-text" style="padding-left: 20px;">
        <li style="margin-bottom: 5px;">Chasing unqualified leads who never answer.</li>
        <li style="margin-bottom: 5px;">Answering "Is this still available?" at 10 PM.</li>
        <li style="margin-bottom: 5px;">Manually building marketing assets.</li>
      </ul>

      <p class="body-text"><strong>Your AI Agent takes this workload off your plate forever.</strong></p>
      <p class="body-text">Imagine waking up to <strong>booked appointments</strong> on your calendar instead of a list of unread texts. Your AI nurtures every lead, filters the tire-kickers, and serves you the serious buyers on a silver platter.</p>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p class="body-text" style="margin-top: 0; font-weight: bold; color: #166534;">Let's look at the ROI:</p>
        <ul class="body-text" style="padding-left: 20px; margin-bottom: 0; color: #166534;">
          <li><strong>One Commission Check:</strong> ~$12,000 (avg)</li>
          <li><strong>HomeListingAI:</strong> $97/mo</li>
        </ul>
        <p class="body-text" style="margin-bottom: 0; margin-top: 10px; color: #166534;">If this system helps you close <strong>just one extra deal this year</strong>, you have achieved a <strong>10,000% Return on Investment.</strong></p>
      </div>

      <p class="body-text"><strong>Don't go back to doing it the hard way. The future is automated.</strong></p>

      <div class="btn-container">
        <a href="${dashboardUrl}/billing" class="btn">Secure My Account</a>
      </div>
      <div class="pro-tip-box">
        <div class="pro-tip-title">💡 Pro Tip</div>
        <p class="body-text" style="margin:0; font-size:15px;">Check the <strong>"Sentiment Analysis"</strong> in your Funnel Analytics. If a lead is "Warm" but hasn't booked, jump in personally! The AI does 90% of the work so you can be the hero for the last 10%.</p>
      </div>
      <div class="how-to-box">
        <div class="how-to-title">🛠️ How To</div>
        <ol class="body-text" style="margin:0; padding-left: 20px; font-size:15px;">
          <li>Go to <strong>"Marketing Funnels"</strong>.</li>
          <li>Switch on the "Buyer Nurture" (Step 1).</li>
          <li>Click "Analytics" to see open rates and AI conversation depth.</li>
        </ol>
      </div>
    `;
  }

  return {
    html: `
      < !DOCTYPE html >
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${styles}</style>
          </head>
          <body>
            <div style="padding: 24px;">
              <div class="container">
                <div class="header">
                  <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" class="logo">
                    <h1 class="header-title">HomeListingAI Academy</h1>
                </div>
                <div class="content">
                  <h2 class="greeting">Hi ${firstName},</h2>
                  ${content}
                </div>
                <div class="footer">
                  <p>Sent with 💙 by the HomeListingAI Team</p>
                  <p>Need help? Just reply to this email, we're here for you.</p>
                  <p style="margin-top: 12px; font-size: 12px;">© ${new Date().getFullYear()} HomeListingAI. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
    `,
    subject
  };
};

// Legacy credentials HTML builder removed/merged



module.exports = (supabaseAdmin) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const mailgunKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const fallbackSupportEmail = process.env.SUPPORT_EMAIL || '';
  const fromName = process.env.EMAIL_FROM_NAME || 'AI You Agent Team';
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS || `AI You Agent Team < noreply@homelistingai.com> `;

  const persistFallbackEmail = async ({ to, subject, html, cc, tags, reason }) => {
    if (!supabaseAdmin) return { queued: false };
    try {
      await supabaseAdmin.from('email_outbox').insert({
        to,
        cc: cc && cc.length ? cc : null,
        subject,
        body: html,
        tags: tags || null,
        send_after: new Date().toISOString(),
        status: 'queued',
        failure_reason: reason || null
      });
      sendAlert(`🚨 Email Failed & Queued: "${subject}" to ${to}.Reason: ${reason || 'Unknown'} `);
      return { queued: true };
    } catch (err) {
      console.error('[EmailService] Failed to persist fallback email queue', err);
      return { queued: false, error: err };
    }
  };

  const sendViaResend = async ({ to, subject, html, cc, tags, overrideFrom, overrideReplyTo }) => {
    if (!resendApiKey) return { sent: false };
    assertFetchAvailable();

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey} `
      },
      body: JSON.stringify({
        from: overrideFrom || fromAddress,
        to,
        cc,
        reply_to: overrideReplyTo,
        subject,
        html,
        tags
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend error: ${errorBody} `);
    }

    return { sent: true, provider: 'resend' };
  };

  const sendViaPostmark = async ({ to, subject, html, cc, tags, overrideFrom, overrideReplyTo }) => {
    if (!postmarkToken) return { sent: false };
    assertFetchAvailable();

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmarkToken
      },
      body: JSON.stringify({
        From: overrideFrom || fromAddress,
        To: Array.isArray(to) ? to.join(',') : to,
        Cc: cc && cc.length ? (Array.isArray(cc) ? cc.join(',') : cc) : undefined,
        ReplyTo: overrideReplyTo,
        Subject: subject,
        HtmlBody: html,
        MessageStream: 'outbound',
        Metadata: tags
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Postmark error: ${errorBody} `);
    }

    return { sent: true, provider: 'postmark' };
  };

  const sendViaSendgrid = async ({ to, subject, html, cc, tags, overrideFrom, overrideReplyTo }) => {
    if (!sendgridKey) return { sent: false };
    assertFetchAvailable();

    const finalFrom = overrideFrom || fromAddress;

    const payload = {
      personalizations: [
        {
          to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
          cc: cc && cc.length ? cc.map((email) => ({ email })) : undefined,
          dynamic_template_data: {},
          custom_args: tags
        }
      ],
      from: {
        email: finalFrom.includes('<')
          ? finalFrom.substring(finalFrom.indexOf('<') + 1, finalFrom.indexOf('>'))
          : finalFrom,
        name: finalFrom.includes('<')
          ? finalFrom.substring(0, finalFrom.indexOf('<')).trim()
          : (overrideFrom ? '' : fromName)
      },
      reply_to: overrideReplyTo ? { email: overrideReplyTo } : undefined,
      subject,
      content: [
        {
          type: 'text/html',
          value: html
        }
      ]
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey} `,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SendGrid error: ${errorBody} `);
    }

    return { sent: true, provider: 'sendgrid' };
  };

  const sendViaMailgun = async ({ to, subject, html, cc, tags, overrideFrom, overrideReplyTo, options }) => {
    if (!mailgunKey || !mailgunDomain) return { sent: false };
    assertFetchAvailable();

    const formData = new URLSearchParams();
    formData.append('from', overrideFrom || fromAddress);
    if (overrideReplyTo) {
      formData.append('h:Reply-To', overrideReplyTo);
    }

    // Handle TO
    if (Array.isArray(to)) {
      to.forEach(t => formData.append('to', t));
    } else {
      formData.append('to', to);
    }

    // Handle CC
    if (cc && cc.length) {
      if (Array.isArray(cc)) {
        cc.forEach(c => formData.append('cc', c));
      } else {
        formData.append('cc', cc);
      }
    }

    formData.append('subject', subject);
    formData.append('html', html);

    // Add tags if present
    if (tags) {
      Object.keys(tags).forEach(key => {
        formData.append(`o: tag`, `${key}:${tags[key]} `);
      });
    }

    // Tracking Options
    if (options) {
      if (options.trackOpens) formData.append('o:tracking-opens', 'yes');
      if (options.trackClicks) formData.append('o:tracking-clicks', 'yes');
    }

    const auth = Buffer.from(`api:${mailgunKey}`).toString('base64');

    const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mailgun error: ${errorBody}`);
    }

    return { sent: true, provider: 'mailgun' };
  };

  const emailTrackingService = require('./emailTrackingService');

  const sendEmail = async ({ to, subject, html, cc = [], tags, options }) => {
    try {
      // 1. Prepare Tracking (if context available)
      let finalHtml = html;
      let messageId = null;

      if (tags && tags.user_id && tags.lead_id) {
        messageId = emailTrackingService.generateMessageId();
        finalHtml = emailTrackingService.injectTracking(html, messageId);

        // Async create record (don't block sending)
        emailTrackingService.createTrackingRecord(supabaseAdmin, {
          messageId,
          userId: tags.user_id,
          leadId: tags.lead_id,
          funnelType: tags.funnel_step, // or derive funnel type
          stepId: tags.funnel_step,
          subject,
          recipientEmail: Array.isArray(to) ? to[0] : to
        }).catch(err => console.error('[EmailService] Tracking Record Error:', err));
      }

      // --- AGENT IDENTITY RESOLUTION ---
      let customFrom = fromAddress;
      let customReplyTo = fromAddress;

      if (tags?.user_id) {
        try {
          const { data: agentData } = await supabaseAdmin
            .from('agents')
            .select('slug, sender_name, sender_email, sender_reply_to')
            .eq('auth_user_id', tags.user_id)
            .single();

          if (agentData) {
            // Build personal 'From' header
            if (agentData.sender_name) {
              const name = agentData.sender_name;
              const email = agentData.sender_email || fromAddress;
              customFrom = `${name} <${email}>`;
            }

            // Determine personal 'Reply-To'
            if (agentData.sender_reply_to) {
              customReplyTo = agentData.sender_reply_to;
            } else if (agentData.slug) {
              customReplyTo = `${agentData.slug}@leads.homelistingai.com`;
            }
          }

          // Gmail Override
          const gmailService = require('./gmailService');
          const connection = await gmailService.getConnection(tags.user_id);
          if (connection) {
            console.log(`📡 [EmailService] Routing via Gmail for User ${tags.user_id}`);
            const gmailResult = await gmailService.sendEmail(tags.user_id, {
              to,
              subject,
              text: html.replace(/<[^>]*>?/gm, ''), // Simple text fallback
              html: finalHtml,
              replyTo: customReplyTo
            });
            return { sent: true, provider: 'gmail', messageId, gmailData: gmailResult };
          }
        } catch (identityErr) {
          console.error(`⚠️ [EmailService] Identity Resolve Failed for User ${tags.user_id}:`, identityErr.message);
        }
      }

      // Prioritize Mailgun if available, then others
      const attempts = [sendViaMailgun, sendViaResend, sendViaPostmark, sendViaSendgrid];
      for (const attempt of attempts) {
        // Pass the resolved identity to the provider-specific senders
        const result = await attempt({
          to,
          subject,
          html: finalHtml,
          cc,
          tags,
          overrideFrom: customFrom,
          overrideReplyTo: customReplyTo,
          options
        });
        if (result.sent) {
          return { sent: true, provider: result.provider, messageId };
        }
      }

      // No provider configured – store fallback
      const fallBackResult = await persistFallbackEmail({
        to,
        subject,
        html: finalHtml,
        cc,
        tags,
        reason: 'No transactional email provider configured'
      });
      return { sent: false, queued: fallBackResult.queued, messageId };
    } catch (error) {
      console.error('[EmailService] Failed to send email', error);
      await persistFallbackEmail({
        to,
        subject,
        html,
        cc,
        tags,
        reason: error.message
      });
      return { sent: false, error };
    }
  };

  const sendWelcomeEmail = async ({ to, firstName, dashboardUrl, cc }) =>
    sendEmail({
      to,
      subject: `Welcome to AI You Agent Team!`,
      html: buildWelcomeHtml(firstName, dashboardUrl),
      cc: cc && cc.length ? cc : fallbackSupportEmail ? [fallbackSupportEmail] : [],
      tags: { template: 'welcome' }
    });

  const sendCredentialsEmail = async ({ to, firstName, dashboardUrl, password, cc }) =>
    sendEmail({
      to,
      subject: 'Welcome to AI You Agent Team!',
      html: buildWelcomeHtml(firstName, dashboardUrl, password),
      cc: cc && cc.length ? cc : fallbackSupportEmail ? [fallbackSupportEmail] : [],
      tags: { template: 'welcome-credentials' }
    });

  return {
    sendEmail,
    sendWelcomeEmail,
    sendCredentialsEmail,
    sendTrialEngagementEmail: async ({ to, firstName, day, dashboardUrl }) => {
      const { html, subject } = buildTrialHtml(firstName, day, dashboardUrl);
      return sendEmail({
        to,
        subject,
        html,
        tags: { template: `trial-day-${day}`, type: 'nurture' }
      });
    }
  };
};
