'use strict';

// Touches 2-5 are fixed, checked wording (no AI call, nothing that can drift). Touch 1 is written by the writer.
const SIGN = '\n\nChris';

const touch2 = {
  subject: 'a live example',
  body: `{{first_name}}, here is what an agent sees when you send them a listing: {{demo_link}}\n\nIt is a phone-style page for one home with your name on it. Buyers ask questions, the page answers, and the warm ones come to you.\n\nTell me if you want one built for a listing of yours.${SIGN}`
};

const touch3 = {
  subject: 'one closed loan',
  body: `{{first_name}}, here is the plain math. The LO plan is $149 a month. One closed loan at $3K-$6K commission covers 20+ months of it. That is an example, not a promise.\n\nHere is what an agent would see with your name on the page: {{demo_link}}\n\nIf it is not a fit, tell me and I will stop.${SIGN}`
};

// Touch 4 answers the objection a person like this is most likely to have.
const OBJECTIONS = {
  crm: {
    label: 'I already have a CRM',
    subject: 'not another CRM',
    body: `{{first_name}}, if you already have a CRM, good. This is not one.\n\nIt does not replace anything you use. It sits on a listing page, answers buyers when you are not there, and hands you the warm ones to follow up in the tools you already have.\n\nIf that sounds useful, reply and I will show you how it looks with your name on it.${SIGN}`
  },
  ai: {
    label: 'I do not want AI talking to my buyers',
    subject: 'about the AI part',
    body: `{{first_name}}, fair concern. Here is exactly what it does. It answers questions about the listing and notes when a buyer is interested in pre-approval, then passes that person to you.\n\nIt does not quote rates and it does not take applications. You talk to the buyer, not the chat.\n\nWant to see it before you decide?${SIGN}`
  },
  agents: {
    label: 'Agents will not use it',
    subject: 'will agents use it',
    body: `{{first_name}}, the worry I hear most is that agents will not bother. It is free for them. They get a better listing page, and you do the setup with one invite and one listing.\n\nThey share a page with your name on it. That is all they do.\n\nWorth trying on one listing?${SIGN}`
  },
  compliance: {
    label: 'Compliance',
    subject: 'what about compliance',
    body: `{{first_name}}, a fair question for anyone in lending. The chat does not quote rates, does not take applications, and sends interested buyers to you. Your own disclosures and rules stay yours to set.\n\nI am not a lawyer, and I will not claim anyone has signed off on it for you. I can show you exactly what it says so you can judge for yourself.\n\nWant to look at it together?${SIGN}`
  },
  busy: {
    label: 'Too busy',
    subject: 'if you are busy',
    body: `{{first_name}}, I know your week is full, so I will keep this short. Setup is one invite and one listing. After that the page answers buyers without you, and the warm ones come to you.\n\nIf now is not the time, say so and I will check back later. If it is, reply with one listing address and I will show you what it looks like.${SIGN}`
  }
};

const BREAKUPS = [
  { subject: 'closing the loop', body: `{{first_name}}, I will stop here so I do not crowd your inbox. If warm leads from agent listings ever move up your list, the example is here: {{demo_link}}${SIGN}` },
  { subject: 'last note', body: `{{first_name}}, this is my last email. If agent partners and warm leads matter this quarter, reply and I will set it up for one listing. If not, no hard feelings.${SIGN}` },
  { subject: 'door is open', body: `{{first_name}}, I do not want to be the loan software guy who never stops. I will go quiet now. The example stays here if you want it: {{demo_link}}${SIGN}` },
  { subject: 'should I stop', body: `{{first_name}}, I have not heard back, which usually means the timing is wrong. I will stop emailing. If that changes, just reply and I will pick it up.${SIGN}` },
  { subject: 'one last thing', body: `{{first_name}}, one last thing and then I am out of your inbox. A listing page with your name on it, answering buyers at night. The example is here if you are ever curious: {{demo_link}}${SIGN}` }
];

const fill = (text, values = {}) =>
  String(text || '').replace(/\{\{\s*([a-z_.]+)\s*\}\}/gi, (whole, key) => (values[key] !== undefined && values[key] !== '' ? String(values[key]) : whole));

// Pick the objection that fits the person best (company size words, then default).
const pickObjection = ({ company = '', jobTitle = '' } = {}) => {
  const text = `${company} ${jobTitle}`.toLowerCase();
  if (/branch|manager|director|team lead/.test(text)) return 'agents';
  if (/bank|credit union|retail/.test(text)) return 'compliance';
  return 'crm';
};

const buildLaterTouches = ({ objection = 'crm', breakupIndex = 0 } = {}) => ({
  2: touch2,
  3: touch3,
  4: OBJECTIONS[objection] || OBJECTIONS.crm,
  5: BREAKUPS[breakupIndex % BREAKUPS.length]
});

module.exports = { touch2, touch3, OBJECTIONS, BREAKUPS, fill, pickObjection, buildLaterTouches };
