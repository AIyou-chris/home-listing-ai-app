const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const getConversationTitle = () => {
  const selectors = [
    '.msg-thread__link-to-profile .t-16',
    '.msg-entity-lockup__entity-title',
    '.msg-overlay-bubble-header__title',
    'h2'
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = cleanText(node?.textContent || '');
    if (text) return text;
  }

  return document.title.replace(/\s*\|\s*LinkedIn.*$/i, '').trim();
};

const collectThreadLines = () => {
  const container =
    document.querySelector('.msg-thread') ||
    document.querySelector('.msg-s-message-list') ||
    document.querySelector('[data-view-name="messages-detail"]') ||
    document.body;

  const selectors = [
    '.msg-s-message-list__event',
    '.msg-s-event-listitem',
    '.msg-convo-bubble-row',
    '.msg-s-message-group__messages li',
    '[data-event-urn]'
  ];

  const seen = new Set();
  const lines = [];

  for (const selector of selectors) {
    const nodes = container.querySelectorAll(selector);
    if (!nodes.length) continue;

    nodes.forEach((node) => {
      const text = cleanText(node.innerText || node.textContent || '');
      if (!text || seen.has(text)) return;
      seen.add(text);

      const className = String(node.className || '');
      const sender = /you|self|from-me|sent-by-me|msg-s-message-group--you/i.test(className) ? 'Me' : 'Prospect';
      lines.push(`${sender}: ${text}`);
    });

    if (lines.length >= 2) break;
  }

  return lines.slice(-16);
};

const insertIntoComposer = (text) => {
  const selectors = [
    '.msg-form__contenteditable[contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    '.ql-editor[contenteditable="true"]'
  ];

  let composer = null;
  for (const selector of selectors) {
    composer = document.querySelector(selector);
    if (composer) break;
  }

  if (!composer) {
    return { ok: false, error: 'Could not find the LinkedIn message box.' };
  }

  composer.focus();
  composer.textContent = text;
  composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  composer.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'HLAI_GET_LINKEDIN_CONTEXT') {
    sendResponse({
      ok: true,
      data: {
        title: getConversationTitle(),
        threadText: collectThreadLines().join('\n'),
        pageUrl: window.location.href
      }
    });
    return false;
  }

  if (message?.type === 'HLAI_INSERT_DRAFT') {
    sendResponse(insertIntoComposer(String(message.text || '').trim()));
    return false;
  }

  return false;
});
