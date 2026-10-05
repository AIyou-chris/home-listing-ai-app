'use strict';

const DEFAULT_ADDRESS = '3855 Self Rd, Cashmere, WA 98815';
const postalAddress = () => process.env.LO_MAILING_ADDRESS || DEFAULT_ADDRESS;

// Added by the server at send time. The screen never shows this for editing.
const appendFooter = (bodyText, { unsubscribeUrl, address = postalAddress(), business = 'HomeListingAI' }) =>
  [
    String(bodyText || '').trimEnd(),
    '',
    '--',
    `${business}, ${address}`,
    `This is a commercial message. To stop these emails, unsubscribe here: ${unsubscribeUrl}`,
    'You can also reply STOP.'
  ].join('\n');

const listUnsubscribeHeaders = ({ unsubscribeUrl, mailto }) => ({
  'List-Unsubscribe': mailto ? `<${unsubscribeUrl}>, <mailto:${mailto}?subject=unsubscribe>` : `<${unsubscribeUrl}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
});

module.exports = { appendFooter, listUnsubscribeHeaders, postalAddress, DEFAULT_ADDRESS };
