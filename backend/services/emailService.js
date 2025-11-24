const assertFetchAvailable = () => {
  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch is not available. Please run on Node 18+ or polyfill fetch for email service.'
    );
  }
};

const buildWelcomeHtml = (firstName, dashboardUrl) => `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
    <p>Hi ${firstName} 👋</p>
    <p>Welcome aboard! Your AI Agent dashboard is ready.</p>
    <p>
      👉 <a href="${dashboardUrl}" style="color: #4f46e5; font-weight: 600;">Click here to access it</a>
    </p>
    <p>From your dashboard, you can:</p>
    <ul>
      <li>Customize your AI follow-up funnels</li>
      <li>Edit your chat & voice bot scripts</li>
      <li>See real-time engagement metrics</li>
    </ul>
    <p>Login with the credentials you just created or the temporary password we sent.</p>
    <p>If you have any questions, reply to this email.</p>
    <p style="margin-top: 32px;">– The AI You Agent Team</p>
  </div>
`;

const buildCredentialsHtml = (firstName, dashboardUrl, password) => `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
    <p>Hi ${firstName},</p>
    <p>Your AI Agent dashboard credentials are ready.</p>
    <p><strong>Email:</strong> This address<br /><strong>Temporary Password:</strong> ${password}</p>
    <p>
      👉 <a href="${dashboardUrl}" style="color: #4f46e5; font-weight: 600;">Login to your dashboard</a>
    </p>
    <p>For security, please change your password after your first login (Dashboard → Settings → Security).</p>
    <p>If you run into any issues, reply to this email and our team will help immediately.</p>
    <p style="margin-top: 32px;">– The AI You Agent Team</p>
  </div>
`;

module.exports = (supabaseAdmin) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fallbackSupportEmail = process.env.SUPPORT_EMAIL || '';
  const fromName = process.env.EMAIL_FROM_NAME || 'AI You Agent Team';
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS || `AI You Agent Team <noreply@aiyouagent.com>`;

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

  const sendEmail = async ({ to, subject, html, cc = [], tags }) => {
    try {
      const attempts = [sendViaResend, sendViaPostmark, sendViaSendgrid];
      for (const attempt of attempts) {
        const result = await attempt({ to, subject, html, cc, tags });
        if (result.sent) {
          return { sent: true, provider: result.provider };
        }
      }

      // No provider configured – store fallback
      const fallBackResult = await persistFallbackEmail({
        to,
        subject,
        html,
        cc,
        tags,
        reason: 'No transactional email provider configured'
      });
      return { sent: false, queued: fallBackResult.queued };
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
      subject: `Welcome to AI You Agent, ${firstName}!`,
      html: buildWelcomeHtml(firstName, dashboardUrl),
      cc: cc && cc.length ? cc : fallbackSupportEmail ? [fallbackSupportEmail] : [],
      tags: { template: 'welcome' }
    });

  const sendCredentialsEmail = async ({ to, firstName, dashboardUrl, password, cc }) =>
    sendEmail({
      to,
      subject: 'Your AI You Agent login credentials',
      html: buildCredentialsHtml(firstName, dashboardUrl, password),
      cc: cc && cc.length ? cc : fallbackSupportEmail ? [fallbackSupportEmail] : [],
      tags: { template: 'credentials' }
    });

  return {
    sendEmail,
    sendWelcomeEmail,
    sendCredentialsEmail
  };
};
