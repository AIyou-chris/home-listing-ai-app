// Adapted from ai-landing-template/server/lib/marketing/indexnow.cjs.
/**
 * Tells search engines one URL changed, instead of waiting for a crawl.
 * Deliberately narrow: one URL per call, called only from the publish/update/
 * unpublish paths in server/routes/marketing.cjs (a later task). Never throws
 * -- a failed ping must not fail the publish it's reporting on; the caller
 * records the result in blog_publication_log and moves on.
 */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

async function submitUrl(url, { key, host, fetchImpl = fetch, keyLocation = `https://${host}/${key}.txt`, urls = [url] } = {}) {
  if (!key) return { ok: false, skipped: true, error: 'IndexNow key not configured' };
  try {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      signal: AbortSignal.timeout(10000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList: urls
      })
    });
    if (!response.ok) {
      const error = await response.text().catch(() => '');
      return { ok: false, status: response.status, error: error || `IndexNow returned ${response.status}` };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not reach IndexNow' };
  }
}

module.exports = { submitUrl, INDEXNOW_ENDPOINT };
