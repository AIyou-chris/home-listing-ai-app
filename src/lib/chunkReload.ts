// Auto-recovery for stale-chunk crashes after a deploy.
//
// When a new build ships, lazy-loaded chunks get new hashed filenames. A tab
// opened before the deploy still references the OLD names; loading one 404s and
// throws — surfacing as the "Something went wrong" card on random pages. The fix
// is to reload ONCE so the browser fetches the fresh index.html + chunk names.

const RELOAD_KEY = 'hlai_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 10_000; // one reload per 10s — prevents reload loops

/** True if the error looks like a failed dynamic import / chunk load. */
export const isChunkLoadError = (error: unknown): boolean => {
  const msg = String((error as { message?: string })?.message || error || '');
  return /dynamically imported module|module script failed|ChunkLoadError|Failed to fetch dynamically|error loading dynamically/i.test(msg);
};

/** Reload the page once to pick up fresh assets. Guarded against loops. */
export const reloadForStaleChunks = (): void => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return; // already reloaded just now
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    /* sessionStorage unavailable — skip rather than risk a loop */
  }
};
