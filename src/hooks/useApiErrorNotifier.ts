import { useCallback } from 'react';

type ApiErrorPayload = {
  title: string;
  description?: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

/**
 * Centralized helper for reporting API failures.
 * It keeps console output consistent and emits a window event so UI layers
 * (toasts, devtools, etc.) can hook in without every caller duplicating logic.
 */
export const useApiErrorNotifier = () => {
  return useCallback((payload: ApiErrorPayload) => {
    const { title, description, error, context } = payload;
    const consolePayload = {
      description,
      context,
      error: error instanceof Error ? error.stack || error.message : error
    };

    console.error(`[API ERROR] ${title}`, consolePayload);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hlai:api-error', {
          detail: {
            title,
            description,
            context,
            error: consolePayload.error,
            timestamp: Date.now()
          }
        })
      );
    }
  }, []);
};

export type UseApiErrorNotifier = ReturnType<typeof useApiErrorNotifier>;
