import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Resets scroll to the top on every route change. Without this, React Router
// keeps the previous page's scroll position, so clicking a CTA near the bottom
// of one page opens the next page already scrolled down. Honors in-page hash
// anchors (e.g. /page#section) by letting the browser jump to the target.
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // anchor links handle their own scroll target
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
