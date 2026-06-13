const assertFetchAvailable = () => {
  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch is not available. Please run on Node 18+ or polyfill fetch for email service.'
    );
  }
};

const { sendAlert } = require('./slackService');

const buildWelcomeHtml = (firstName, dashboardUrl, password, billingUrl) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header card — dark navy matching the site -->
    <div style="background:linear-gradient(135deg,#0B1121 0%,#0f172a 100%);border-radius:16px 16px 0 0;padding:40px 32px 36px;text-align:center;">
      <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" style="width:52px;height:52px;border-radius:12px;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;">
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">You're live, ${firstName}. 🚀</h1>
      <p style="color:#94a3b8;font-size:15px;margin:0;font-weight:400;">Your LO platform is set up and ready to go.</p>
    </div>

    <!-- White body -->
    <div style="background:#ffffff;padding:36px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

      <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 28px;">
        Welcome to HomeListingAI. You now have an AI-powered loan officer platform built for two things: <strong style="color:#0f172a;">getting warm leads</strong> and <strong style="color:#0f172a;">building agent partnerships</strong> that actually send you business.
      </p>

      ${password ? `
      <!-- Credentials box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 12px;">🔐 Your Login Details</p>
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>Email:</strong> This address</p>
        <p style="font-size:14px;color:#334155;margin:0 0 12px;"><strong>Temporary password:</strong> <span style="font-family:monospace;background:#e2e8f0;padding:2px 8px;border-radius:6px;font-size:13px;">${password}</span></p>
        <p style="font-size:12px;color:#94a3b8;margin:0;">Change your password after first login under Settings → Security.</p>
      </div>
      ` : ''}

      <!-- Primary CTA -->
      <div style="text-align:center;margin:0 0 36px;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;box-shadow:0 4px 16px rgba(37,99,235,0.35);letter-spacing:-0.2px;">Go to My Dashboard →</a>
        ${billingUrl ? `<div style="margin-top:12px;"><a href="${billingUrl}" style="font-size:13px;color:#2563eb;text-decoration:none;font-weight:600;">View plans & billing</a></div>` : ''}
      </div>

      <!-- 3-step setup -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 20px;">Get set up in 3 steps</p>

        <!-- Step 1 -->
        <div style="display:flex;align-items:flex-start;margin-bottom:20px;">
          <div style="background:#2563eb;color:#fff;width:28px;height:28px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:28px;flex-shrink:0;margin-right:14px;">1</div>
          <div>
            <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 3px;">Complete your LO profile</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">Add your NMLS #, headshot, company, and licensed states. This is what buyers and agents see on every co-branded page.</p>
          </div>
        </div>

        <!-- Step 2 -->
        <div style="display:flex;align-items:flex-start;margin-bottom:20px;">
          <div style="background:#2563eb;color:#fff;width:28px;height:28px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:28px;flex-shrink:0;margin-right:14px;">2</div>
          <div>
            <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 3px;">Send your first WOW Link</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">Pick a real estate agent, hit <em>Add Partner</em>, and send them a live listing demo with your AI financing chatbot already running — before they even sign up.</p>
          </div>
        </div>

        <!-- Step 3 -->
        <div style="display:flex;align-items:flex-start;">
          <div style="background:#2563eb;color:#fff;width:28px;height:28px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:28px;flex-shrink:0;margin-right:14px;">3</div>
          <div>
            <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 3px;">Watch leads come in</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">Every buyer who asks a financing question on an agent's listing goes directly to you — pre-qualified, with context, in real time.</p>
          </div>
        </div>
      </div>

      <!-- What the platform does -->
      <div style="border-top:1px solid #f1f5f9;padding-top:24px;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 16px;">What you now have access to</p>

        <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
          <span style="font-size:18px;margin-right:12px;flex-shrink:0;">🤝</span>
          <div><p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 2px;">Agent Partnership Network</p><p style="font-size:13px;color:#64748b;margin:0;">Invite agents, co-brand their listings, and become the go-to LO in their business.</p></div>
        </div>
        <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
          <span style="font-size:18px;margin-right:12px;flex-shrink:0;">🤖</span>
          <div><p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 2px;">AI Financing Chatbot</p><p style="font-size:13px;color:#64748b;margin:0;">Your bot answers buyer mortgage questions 24/7 on every listing — trained on your rates, programs, and FAQs.</p></div>
        </div>
        <div style="display:flex;align-items:flex-start;">
          <span style="font-size:18px;margin-right:12px;flex-shrink:0;">📊</span>
          <div><p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 2px;">Live Lead Dashboard</p><p style="font-size:13px;color:#64748b;margin:0;">See every lead, their intent, which listing they came from, and share a live dashboard link with your agent partners.</p></div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#0f172a;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
      <p style="font-size:13px;color:#64748b;margin:0 0 6px;">Questions? Just reply to this email — we respond fast.</p>
      <p style="font-size:12px;color:#475569;margin:0;">© ${new Date().getFullYear()} HomeListingAI · <a href="https://homelistingai.com" style="color:#475569;text-decoration:none;">homelistingai.com</a></p>
    </div>

  </div>
</body>
</html>`;

// ── legacy alias kept for credential-only sends ──────────────────────────────
const buildWelcomeHtmlLegacy = (firstName, dashboardUrl, password, billingUrl) => buildWelcomeHtml(firstName, dashboardUrl, password, billingUrl);
/* eslint-disable-next-line no-unused-vars */
void buildWelcomeHtmlLegacy;


const PLAN_DISPLAY_NAMES = {
  starter: 'LO',
  pro: 'LO Pro',
  free: 'Free',
};

const buildSubscriptionConfirmedHtml = (firstName, planId, dashboardUrl) => {
  const planName = PLAN_DISPLAY_NAMES[planId] || planId || 'LO';
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #059669 0%, #0891b2 100%); padding: 32px 24px; text-align: center; }
      .logo { width: 48px; height: 48px; background-color: white; border-radius: 8px; padding: 4px; margin-bottom: 16px; object-fit: contain; }
      .header-title { color: white; font-size: 24px; font-weight: bold; margin: 0; }
      .content { padding: 32px 24px; }
      .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
      .body-text { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
      .plan-box { background: linear-gradient(135deg, #f0fdf4, #ecfeff); border: 1px solid #6ee7b7; border-radius: 10px; padding: 20px 24px; margin: 24px 0; text-align: center; }
      .plan-name { font-size: 28px; font-weight: 800; color: #065f46; margin: 0 0 4px; }
      .plan-sub { font-size: 14px; color: #047857; }
      .btn-container { text-align: center; margin: 32px 0; }
      .btn { background-color: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(5,150,105,0.3); }
      .next-steps { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0; }
      .step { display: flex; align-items: flex-start; margin-bottom: 12px; }
      .step-num { background-color: #059669; color: white; width: 24px; height: 24px; border-radius: 50%; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
      .step-text { font-size: 14px; color: #334155; line-height: 1.5; }
      .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <div style="padding: 24px;">
      <div class="container">
        <div class="header">
          <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" class="logo">
          <h1 class="header-title">You're officially in. ✅</h1>
        </div>
        <div class="content">
          <h2 class="greeting">Hi ${firstName} 👋</h2>
          <p class="body-text">Your subscription is confirmed and your account is fully active. Welcome to the platform.</p>
          <div class="plan-box">
            <div class="plan-name">HomeListingAI ${planName}</div>
            <div class="plan-sub">Active subscription · Billed monthly</div>
          </div>
          <div class="next-steps">
            <strong style="display:block;margin-bottom:12px;color:#0f172a;">Your first 3 things to do:</strong>
            <div class="step"><span class="step-num">1</span><span class="step-text"><strong>Complete your LO profile</strong> — add your headshot, NMLS #, and company so every co-branded listing looks sharp.</span></div>
            <div class="step"><span class="step-num">2</span><span class="step-text"><strong>Invite a real estate agent partner</strong> — send them your WOW Link and give their listing an AI-powered upgrade.</span></div>
            <div class="step"><span class="step-num">3</span><span class="step-text"><strong>Set up your AI financing chatbot</strong> — it answers buyer questions 24/7 and routes warm leads to you automatically.</span></div>
          </div>
          <div class="btn-container">
            <a href="${dashboardUrl}" class="btn">Go to My Dashboard →</a>
          </div>
        </div>
        <div class="footer">
          <p>Questions? Just reply to this email — we're here.</p>
          <p style="margin-top: 8px; font-size: 12px;">© ${new Date().getFullYear()} HomeListingAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>`;
};

const buildUpgradeHtml = (firstName, planId, dashboardUrl) => {
  const planName = PLAN_DISPLAY_NAMES[planId] || planId || 'LO Pro';
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 32px 24px; text-align: center; }
      .logo { width: 48px; height: 48px; background-color: white; border-radius: 8px; padding: 4px; margin-bottom: 16px; object-fit: contain; }
      .header-title { color: white; font-size: 24px; font-weight: bold; margin: 0; }
      .content { padding: 32px 24px; }
      .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
      .body-text { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
      .plan-box { background: linear-gradient(135deg, #f5f3ff, #eef2ff); border: 1px solid #c4b5fd; border-radius: 10px; padding: 20px 24px; margin: 24px 0; text-align: center; }
      .plan-name { font-size: 28px; font-weight: 800; color: #4c1d95; margin: 0 0 4px; }
      .plan-sub { font-size: 14px; color: #6d28d9; }
      .unlock-list { list-style: none; padding: 0; margin: 0; }
      .unlock-item { display: flex; align-items: flex-start; margin-bottom: 12px; font-size: 15px; color: #334155; }
      .unlock-icon { color: #7c3aed; font-size: 18px; margin-right: 10px; flex-shrink: 0; }
      .btn-container { text-align: center; margin: 32px 0; }
      .btn { background-color: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
      .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <div style="padding: 24px;">
      <div class="container">
        <div class="header">
          <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" class="logo">
          <h1 class="header-title">You just leveled up. 🚀</h1>
        </div>
        <div class="content">
          <h2 class="greeting">Hi ${firstName},</h2>
          <p class="body-text">Your plan has been upgraded. You now have access to everything in <strong>HomeListingAI ${planName}</strong>.</p>
          <div class="plan-box">
            <div class="plan-name">HomeListingAI ${planName}</div>
            <div class="plan-sub">Upgraded · Active now</div>
          </div>
          <p class="body-text" style="margin-bottom: 12px;"><strong>What just unlocked:</strong></p>
          <ul class="unlock-list">
            <li class="unlock-item"><span class="unlock-icon">✓</span>50 active listings across your partner network</li>
            <li class="unlock-item"><span class="unlock-icon">✓</span>Unlimited SMS per month</li>
            <li class="unlock-item"><span class="unlock-icon">✓</span>Priority lead routing</li>
            <li class="unlock-item"><span class="unlock-icon">✓</span>Everything in LO — all features included</li>
          </ul>
          <div class="btn-container">
            <a href="${dashboardUrl}" class="btn">Explore My New Features →</a>
          </div>
        </div>
        <div class="footer">
          <p>Questions about your upgrade? Reply to this email.</p>
          <p style="margin-top: 8px; font-size: 12px;">© ${new Date().getFullYear()} HomeListingAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>`;
};

const buildCancellationHtml = (firstName, periodEnd, dashboardUrl) => {
  const endDateStr = periodEnd ? new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'your billing period end';
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #475569 0%, #334155 100%); padding: 32px 24px; text-align: center; }
      .logo { width: 48px; height: 48px; background-color: white; border-radius: 8px; padding: 4px; margin-bottom: 16px; object-fit: contain; }
      .header-title { color: white; font-size: 24px; font-weight: bold; margin: 0; }
      .content { padding: 32px 24px; }
      .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
      .body-text { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
      .end-date-box { background-color: #fef9c3; border: 1px solid #fde047; border-radius: 10px; padding: 16px 20px; margin: 24px 0; text-align: center; }
      .end-date-label { font-size: 13px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .end-date-value { font-size: 22px; font-weight: 800; color: #78350f; }
      .btn-container { text-align: center; margin: 32px 0; }
      .btn { background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
      .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <div style="padding: 24px;">
      <div class="container">
        <div class="header">
          <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" class="logo">
          <h1 class="header-title">Subscription cancelled</h1>
        </div>
        <div class="content">
          <h2 class="greeting">Hi ${firstName},</h2>
          <p class="body-text">We've received your cancellation request. We're sorry to see you go — and we mean that.</p>
          <p class="body-text">Your account remains <strong>fully active</strong> until your current billing period ends. After that, your listings will go offline and lead capture will stop.</p>
          <div class="end-date-box">
            <div class="end-date-label">Access ends on</div>
            <div class="end-date-value">${endDateStr}</div>
          </div>
          <p class="body-text">Changed your mind? You can reactivate anytime before that date and nothing will be interrupted.</p>
          <div class="btn-container">
            <a href="${dashboardUrl}/billing" class="btn">Reactivate My Account</a>
          </div>
          <p class="body-text" style="font-size:14px;color:#64748b;">If there's something we could have done better, please just reply to this email. We read every response.</p>
        </div>
        <div class="footer">
          <p>Thank you for being a HomeListingAI customer.</p>
          <p style="margin-top: 8px; font-size: 12px;">© ${new Date().getFullYear()} HomeListingAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>`;
};

const buildPasswordResetHtml = (firstName, resetUrl) => `<!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; }
      .logo { width: 48px; height: 48px; background-color: white; border-radius: 8px; padding: 4px; margin-bottom: 16px; object-fit: contain; }
      .header-title { color: white; font-size: 24px; font-weight: bold; margin: 0; }
      .content { padding: 32px 24px; }
      .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
      .body-text { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
      .btn-container { text-align: center; margin: 32px 0; }
      .btn { background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; }
      .expiry-note { background-color: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #92400e; margin: 16px 0; text-align: center; }
      .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <div style="padding: 24px;">
      <div class="container">
        <div class="header">
          <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" class="logo">
          <h1 class="header-title">Password Reset Request</h1>
        </div>
        <div class="content">
          <h2 class="greeting">Hi ${firstName || 'there'},</h2>
          <p class="body-text">We received a request to reset your HomeListingAI password. Click the button below to choose a new one.</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn">Reset My Password →</a>
          </div>
          <div class="expiry-note">⏱ This link expires in 1 hour.</div>
          <p class="body-text" style="font-size:14px;color:#64748b;">If you didn't request a password reset, you can safely ignore this email. Your password won't change unless you click the link above.</p>
        </div>
        <div class="footer">
          <p>Need help? Reply to this email.</p>
          <p style="margin-top: 8px; font-size: 12px;">© ${new Date().getFullYear()} HomeListingAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>`;

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
      <p class="body-text">This is it. Your 7-Day Trial is ending.</p>
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
  const mailgunKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN || 'mg.homelistingai.com';
  const mailgunFromEmail =
    process.env.MAILGUN_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    'notifications@mg.homelistingai.com';
  const mailgunFromName =
    process.env.MAILGUN_FROM_NAME ||
    process.env.FROM_NAME ||
    'HomeListingAI';
  const fallbackSupportEmail = process.env.MAILGUN_REPLYTO_FALLBACK || 'homelistingai@gmail.com';
  const fromAddress = `${mailgunFromName} <${mailgunFromEmail}>`;

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



  const sendViaMailgun = async ({ to, subject, html, cc, bcc, tags, overrideReplyTo, options }) => {
    if (!mailgunKey || !mailgunDomain) { console.warn('[Email] Mailgun not configured — email NOT sent to:', to); return { sent: false }; }
    assertFetchAvailable();

    const formData = new FormData();
    formData.append('from', fromAddress);

    // Always attach the original customFrom to Reply-To alongside the actual overrideReplyTo if they differ? 
    // The spec: REPLY-TO is agent.email if available, else MAILGUN_REPLYTO_FALLBACK
    formData.append('h:Reply-To', overrideReplyTo || fallbackSupportEmail);

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

    // Handle BCC
    if (bcc && bcc.length) {
      if (Array.isArray(bcc)) {
        bcc.forEach(b => formData.append('bcc', b));
      } else {
        formData.append('bcc', bcc);
      }
    }

    formData.append('subject', subject);
    formData.append('html', html);

    // Add tags and variables
    if (tags) {
      Object.keys(tags).forEach(key => {
        // Mailgun Tags (for searching in Mailgun dashboard)
        formData.append('o:tag', `${key}:${tags[key]}`);

        // Mailgun User Variables (for Webhooks)
        formData.append(`v:${key}`, tags[key]);

        // Map sequence_id to campaign_id for analytics consistency
        if (key === 'sequence_id') {
          formData.append('v:campaign_id', tags[key]);
        }
      });
    }

    // Tracking Options
    if (options) {
      if (options.trackOpens) formData.append('o:tracking-opens', 'yes');
      if (options.trackClicks) formData.append('o:tracking-clicks', 'yes');

      // Add ICS if available
      if (options.ics) {
        const icsBlob = new Blob([options.ics.content], { type: 'text/calendar; charset=utf-8; method=REQUEST' });
        formData.append('attachment', icsBlob, options.ics.filename);
      }
    }

    const auth = Buffer.from(`api:${mailgunKey}`).toString('base64');

    const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mailgun error: ${errorBody}`);
    }

    return { sent: true, provider: 'mailgun' };
  };

  const emailTrackingService = require('./emailTrackingService');

  const sendEmail = async ({ to, subject, html, cc = [], bcc = [], tags, options }) => {
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
      let customReplyTo = fallbackSupportEmail;
      let isDemo = false;
      const identityKey =
        tags?.agent_id ||
        tags?.agentId ||
        tags?.user_id ||
        tags?.userId ||
        null;

      if (identityKey) {
        try {
          const { data: agentData } = await supabaseAdmin
            .from('agents')
            .select('email, is_demo')
            .or(`id.eq.${identityKey},auth_user_id.eq.${identityKey}`)
            .maybeSingle();

          if (agentData) {
            if (agentData.email) {
              customReplyTo = agentData.email;
            }
            if (agentData.is_demo === true) {
              isDemo = true;
            }
          }
        } catch (identityErr) {
          console.error(`⚠️ [EmailService] Identity Resolve Failed for User ${tags.user_id}:`, identityErr.message);
        }
      }

      if (isDemo) {
        console.log(`⚠️ [EmailService] Blocking email to ${to} (User is in demo mode)`);
        const suppressedLeadId = tags?.lead_id || tags?.leadId || null;
        if (supabaseAdmin && suppressedLeadId) {
          await supabaseAdmin.from('lead_events').insert({
            lead_id: suppressedLeadId,
            type: 'outbound_suppressed',
            payload: {
              channel: 'email',
              reason: 'demo_mode',
              subject,
              to
            },
            created_at: new Date().toISOString()
          });
        }
        return { sent: true, suppressed: true, provider: 'demo_suppressed', messageId };
      }

      const result = await sendViaMailgun({
        to,
        subject,
        html: finalHtml,
        cc,
        tags: { ...tags, internal_msg_id: messageId },
        overrideReplyTo: customReplyTo,
        options
      });
      if (result.sent) {
        return { sent: true, provider: result.provider, messageId };
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

  const sendWelcomeEmail = async ({ to, firstName, dashboardUrl, billingUrl, cc }) =>
    sendEmail({
      to,
      subject: 'Welcome to HomeListingAI — your dashboard is ready',
      html: buildWelcomeHtml(firstName, dashboardUrl, undefined, billingUrl),
      cc: cc && cc.length ? cc : fallbackSupportEmail ? [fallbackSupportEmail] : [],
      tags: { template: 'welcome' }
    });

  const sendCredentialsEmail = async ({ to, firstName, dashboardUrl, billingUrl, password, cc }) =>
    sendEmail({
      to,
      subject: 'Welcome to HomeListingAI — your dashboard is ready',
      html: buildWelcomeHtml(firstName, dashboardUrl, password, billingUrl),
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
    },

    sendSubscriptionConfirmedEmail: async ({ to, firstName, planId, dashboardUrl }) =>
      sendEmail({
        to,
        subject: `You're in — HomeListingAI ${PLAN_DISPLAY_NAMES[planId] || planId || 'LO'} is active`,
        html: buildSubscriptionConfirmedHtml(firstName, planId, dashboardUrl),
        tags: { template: 'subscription-confirmed' }
      }),

    sendUpgradeEmail: async ({ to, firstName, planId, dashboardUrl }) =>
      sendEmail({
        to,
        subject: `Plan upgraded — HomeListingAI ${PLAN_DISPLAY_NAMES[planId] || planId || 'LO Pro'}`,
        html: buildUpgradeHtml(firstName, planId, dashboardUrl),
        tags: { template: 'upgrade-confirmed' }
      }),

    sendCancellationEmail: async ({ to, firstName, periodEnd, dashboardUrl }) =>
      sendEmail({
        to,
        subject: 'Your HomeListingAI subscription has been cancelled',
        html: buildCancellationHtml(firstName, periodEnd, dashboardUrl),
        tags: { template: 'cancellation' }
      }),

    sendPasswordResetEmail: async ({ to, firstName, resetUrl }) =>
      sendEmail({
        to,
        subject: 'Reset your HomeListingAI password',
        html: buildPasswordResetHtml(firstName, resetUrl),
        tags: { template: 'password-reset' }
      }),

    sendWowLinkReminderEmail: async ({ to, agentName, loName, loCompany, wowLink }) => {
      const firstName = agentName ? agentName.split(' ')[0] : 'there';
      const html = `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,#0B1121 0%,#0f172a 100%);border-radius:16px 16px 0 0;padding:36px 32px;text-align:center;">
      <img src="https://homelistingai.com/newlogo.png" alt="HomeListingAI" style="width:44px;height:44px;border-radius:10px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">Hey ${firstName} — still want to see this? 👋</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">${loName}${loCompany ? ` · ${loCompany}` : ''} sent you something</p>
    </div>
    <div style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 24px;">
        ${loName} set up an AI-powered listing experience for you — it lets buyers ask questions about your listings 24/7 and quietly flags the serious ones. Took them 5 minutes to build.
      </p>
      <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 28px;">
        No signup needed to look around. Just take a peek at what they put together for you:
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${wowLink}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 4px 16px rgba(37,99,235,0.3);">See What ${loName.split(' ')[0]} Built →</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">Nothing to sign up for · Takes 30 seconds · Built by ${loName}</p>
    </div>
    <div style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">Powered by <a href="https://homelistingai.com" style="color:#2563eb;text-decoration:none;font-weight:600;">HomeListingAI</a></p>
    </div>
  </div>
</body>
</html>`;
      return sendEmail({
        to,
        subject: `${loName} still has something for your listings`,
        html,
        tags: { template: 'wow-link-reminder' }
      });
    },
  };
};
