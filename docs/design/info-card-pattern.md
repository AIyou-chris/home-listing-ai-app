# Info Card Pattern

Use this pattern whenever adding contextual callouts, trust signals, tips, or explanatory notes to dashboard pages. Keep copy short — one bold line, one or two sentences max.

## Structure

```tsx
<div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
  <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[20px] text-{color}-500">{icon}</span>
  <div>
    <p className="text-sm font-bold text-slate-800">Short bold title</p>
    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">One or two sentences. Friendly, direct, no jargon.</p>
  </div>
</div>
```

## Icon + Color Pairings

| Intent | Icon | Color |
|---|---|---|
| Privacy / security | `lock` | `text-primary-500` |
| Verified / compliant | `verified` | `text-emerald-500` |
| Tip / new feature | `auto_awesome` | `text-primary-500` |
| Warning / heads up | `warning` | `text-amber-500` |
| Info / context | `info` | `text-sky-500` |
| Success / complete | `check_circle` | `text-emerald-500` |

## Dismissible variant (for one-time tips)

```tsx
const [tipDismissed, setTipDismissed] = useState(() => {
  try { return localStorage.getItem('hlai_{key}_tip_dismissed') === '1'; } catch { return false; }
});
const dismissTip = () => {
  setTipDismissed(true);
  try { localStorage.setItem('hlai_{key}_tip_dismissed', '1'); } catch { /* noop */ }
};

{!tipDismissed && (
  <div className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3.5">
    <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[18px] text-primary-500">auto_awesome</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-primary-900">Bold title here</p>
      <p className="mt-0.5 text-xs text-primary-700 leading-relaxed">Short explanation.</p>
    </div>
    <button type="button" onClick={dismissTip} className="flex-shrink-0 rounded-lg p-1 text-primary-400 hover:text-primary-700 transition-colors">
      <span className="material-symbols-outlined text-[18px]">close</span>
    </button>
  </div>
)}
```

## Rules

- **One bold line.** The title should make sense even if the body isn't read.
- **Two sentences max.** If it needs more, it's probably a modal or a docs page.
- **No jargon.** Write like you're talking to a busy agent, not a developer or lawyer.
- **Use `bg-slate-50` + `border-slate-100`** for neutral info. Use `bg-primary-50` + `border-primary-100` for tips tied to a feature.
- **Stack multiple cards** with `space-y-3` — never inside a single card.

## Live examples

- `src/components/SettingsPage.tsx` — privacy + real estate compliance cards
- `src/components/agent/AgentBusinessCardEditor.tsx` — dismissible "fill once" tip
