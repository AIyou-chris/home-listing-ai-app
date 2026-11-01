// Filters for the free Google Maps file (gosom columns: review_count, website).
// Rows from other sources have no review_count/place_id and pass through untouched.
export type MapsFilters = { maxReviews: number | null; website: 'any' | 'has' };

export const REVIEW_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any number of reviews' },
  { value: '20', label: 'Under 20 reviews' },
  { value: '50', label: 'Under 50 reviews' },
  { value: '100', label: 'Under 100 reviews' },
];

export function filterMapsRows(rows: Record<string, string>[], f: MapsFilters): Record<string, string>[] {
  return rows.filter(r => {
    if (!('place_id' in r) && !('cid' in r)) return true;
    if (f.maxReviews !== null) {
      const n = Number(r.review_count);
      if (!Number.isFinite(n) || n >= f.maxReviews) return false;
    }
    if (f.website === 'has' && !(r.website || '').trim()) return false;
    return true;
  });
}
