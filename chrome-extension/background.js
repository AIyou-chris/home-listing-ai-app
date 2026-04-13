const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://homelistingai.com',
  userId: '',
  agentName: '',
  agentTitle: '',
  company: '',
  language: 'English',
  defaultContext: ''
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(DEFAULT_SETTINGS);
  await chrome.storage.local.set(existing);

  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const isAppTabUrl = (url) => {
  const value = String(url || '');
  return (
    /^http:\/\/(localhost|127\.0\.0\.1):(5173|5175)\//i.test(value) ||
    /^https:\/\/([a-z0-9-]+\.)?homelistingai\.com\//i.test(value)
  );
};

const getAppTabPriority = (url) => {
  const value = String(url || '');
  if (/^https:\/\/([a-z0-9-]+\.)?homelistingai\.com\//i.test(value)) return 0;
  if (/^http:\/\/(localhost|127\.0\.0\.1):(5173|5175)\//i.test(value)) return 1;
  return 99;
};

const detectUserFromAppTab = async () => {
  const tabs = await chrome.tabs.query({});
  const appTabs = tabs
    .filter((tab) => isAppTabUrl(tab.url) && tab.id)
    .sort((a, b) => getAppTabPriority(a.url) - getAppTabPriority(b.url));

  for (const appTab of appTabs) {
    try {
      const [{ result } = {}] = await chrome.scripting.executeScript({
        target: { tabId: appTab.id },
        func: () => {
          const keys = Object.keys(window.localStorage || {});
          const supabaseKey = keys.find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
          if (!supabaseKey) return null;

          try {
            const raw = window.localStorage.getItem(supabaseKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return {
              userId: parsed?.user?.id || '',
              email: parsed?.user?.email || '',
              origin: window.location.origin || ''
            };
          } catch (_error) {
            return null;
          }
        }
      });

      if (result?.userId) {
        return result;
      }
    } catch (_error) {
      // Skip tabs that are on browser error pages or otherwise inaccessible.
    }
  }

  return null;
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'HLAI_DETECT_LOCAL_USER') {
    (async () => {
      try {
        const detected = await detectUserFromAppTab();
        if (!detected?.userId) {
          throw new Error('Could not find your Home Listing AI login in an open app tab.');
        }

        const nextSettings = { userId: detected.userId };
        if (detected.origin && isAppTabUrl(detected.origin)) {
          nextSettings.apiBaseUrl = normalizeBaseUrl(detected.origin);
        }

        await chrome.storage.local.set(nextSettings);
        sendResponse({ ok: true, data: detected });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Could not detect your app user.'
        });
      }
    })();

    return true;
  }

  if (message?.type === 'HLAI_FETCH_LINKEDIN_ASSISTANT') {
    (async () => {
      try {
        const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
        const apiBaseUrl = normalizeBaseUrl(settings.apiBaseUrl);
        const userId = String(settings.userId || '').trim();

        if (!apiBaseUrl) {
          throw new Error('Add your API URL first.');
        }

        if (!userId) {
          throw new Error('No app user ID found yet. Click Auto find my user first.');
        }

        const response = await fetch(`${apiBaseUrl}/api/linkedin/assistant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            threadText: message.payload?.threadText || '',
            goal: message.payload?.goal || '',
            tone: message.payload?.tone || '',
            context: message.payload?.context || settings.defaultContext || '',
            agentProfile: {
              name: settings.agentName || undefined,
              title: settings.agentTitle || undefined,
              company: settings.company || undefined,
              language: settings.language || undefined
            }
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
          throw new Error(data?.error || 'Failed to build the LinkedIn plan.');
        }

        sendResponse({ ok: true, data });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown extension error.'
        });
      }
    })();

    return true;
  }

  return false;
});
