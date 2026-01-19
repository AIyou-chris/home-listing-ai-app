const assertFetchAvailable = () => {
  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch is not available. Please run on Node 18+ or polyfill fetch for email service.'
    );
  }
};

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
    process.env.EMAIL_FROM_ADDRESS || `AI You Agent Team <noreply@homelistingai.com>`;

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
      return { queued: true };
    } catch (err) {
      console.error('[EmailService] Failed to persist fallback email queue', err);
      return { queued: false, error: err };
    }
  };

  const sendViaResend = async ({ to, subject, html, cc, tags }) => {
    if (!resendApiKey) return { sent: false };
    assertFetchAvailable();

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        cc,
        subject,
        html,
        tags
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend error: ${errorBody}`);
    }

    return { sent: true, provider: 'resend' };
  };

  const sendViaPostmark = async ({ to, subject, html, cc, tags }) => {
    if (!postmarkToken) return { sent: false };
    assertFetchAvailable();

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmarkToken
      },
      body: JSON.stringify({
        From: fromAddress,
        To: Array.isArray(to) ? to.join(',') : to,
        Cc: cc && cc.length ? (Array.isArray(cc) ? cc.join(',') : cc) : undefined,
        Subject: subject,
        HtmlBody: html,
        MessageStream: 'outbound',
        Metadata: tags
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Postmark error: ${errorBody}`);
    }

    return { sent: true, provider: 'postmark' };
  };

  const sendViaSendgrid = async ({ to, subject, html, cc, tags }) => {
    if (!sendgridKey) return { sent: false };
    assertFetchAvailable();

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
        email: fromAddress.includes('<')
          ? fromAddress.substring(fromAddress.indexOf('<') + 1, fromAddress.indexOf('>'))
          : fromAddress,
        name: fromName
      },
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
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SendGrid error: ${errorBody}`);
    }

    return { sent: true, provider: 'sendgrid' };
  };

  const sendViaMailgun = async ({ to, subject, html, cc, tags }) => {
    if (!mailgunKey || !mailgunDomain) return { sent: false };
    assertFetchAvailable();

    const formData = new URLSearchParams();
    formData.append('from', fromAddress);

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
        formData.append(`o:tag`, `${key}:${tags[key]}`);
      });
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

  const sendEmail = async ({ to, subject, html, cc = [], tags }) => {
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

      // Prioritize Mailgun if available, then others
      const attempts = [sendViaMailgun, sendViaResend, sendViaPostmark, sendViaSendgrid];
      for (const attempt of attempts) {
        const result = await attempt({ to, subject, html: finalHtml, cc, tags });
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
    sendCredentialsEmail
  };
};
