import React, { useState, useEffect } from 'react';

interface PageTipBannerProps {
  pageKey: string;
  title?: string;
  message?: string;
  emoji?: string;
  expandedContent?: React.ReactNode;
}

const PageTipBanner: React.FC<PageTipBannerProps> = ({
  pageKey,
  title,
  message,
  emoji = "💡",
  expandedContent
}) => {
  const storageKey = `tip-banner-${pageKey}`;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  console.log(`🎯 PageTipBanner rendering for pageKey: ${pageKey}, storageKey: ${storageKey}`);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(storageKey) === 'dismissed';
      console.log(`📦 localStorage check for ${storageKey}: dismissed=${dismissed}`);
      setIsDismissed(dismissed);
    } catch (e) {
      console.error('localStorage error:', e);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, 'dismissed');
      setIsDismissed(true);
    } catch (e) {
      console.error('localStorage error:', e);
    }
  };

  const handleShowAgain = () => {
    try {
      localStorage.removeItem(storageKey);
      setIsDismissed(false);
    } catch (e) {
      console.error('localStorage error:', e);
    }
  };

  if (isDismissed) {
    console.log(`⏭️ Banner ${pageKey} is dismissed, showing "Show Quick Tips" button`);
    return (
      <div className="mb-4">
        <button
          onClick={handleShowAgain}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
        >
          <span>{emoji}</span>
          <span>Show Quick Tips</span>
        </button>
      </div>
    );
  }

  console.log(`✅ Banner ${pageKey} is NOT dismissed, rendering full banner. isExpanded=${isExpanded}`);

  return (
    <div className="mb-6">
      {!isExpanded ? (
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-300 rounded-xl p-4 shadow-lg">
          {(!title && !message) ? (
            <div className="flex items-center justify-center relative">
              <div className="absolute left-0 text-3xl opacity-50">{emoji}</div>
              {expandedContent && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="px-8 py-3 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Learn More
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="absolute right-0 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-3xl flex-shrink-0">{emoji}</div>

              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    {title}
                  </h3>
                )}
                {message && (
                  <p className="text-sm text-slate-600">
                    {message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {expandedContent && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Learn More
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 text-lg font-bold text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-300 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-white/70 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{emoji}</div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Collapse ▲
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {message}
            </p>

            {expandedContent && (
              <div className="text-sm text-slate-700">
                {expandedContent}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-blue-200">
              <button
                onClick={handleDismiss}
                className="px-5 py-2.5 text-sm font-bold text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Got it, hide this tip
              </button>
              <span className="text-xs text-slate-500 italic">
                You can show tips again anytime
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageTipBanner;