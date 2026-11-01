import { filterMapsRows } from './mapsFilters';

const rows = [
  { place_id: 'a', review_count: '12', website: 'https://a.com' },
  { place_id: 'b', review_count: '80', website: 'https://b.com' },
  { place_id: 'c', review_count: '5', website: '' },
  { email: 'x@y.com' },
];

describe('filterMapsRows', () => {
  it('keeps everything when no filter is set', () => {
    expect(filterMapsRows(rows, { maxReviews: null, website: 'any' })).toHaveLength(4);
  });
  it('drops Maps rows at or over the review limit', () => {
    const out = filterMapsRows(rows, { maxReviews: 50, website: 'any' });
    expect(out.map(r => r.place_id)).toEqual(['a', 'c', undefined]);
  });
  it('drops Maps rows with no website when asked', () => {
    const out = filterMapsRows(rows, { maxReviews: null, website: 'has' });
    expect(out.map(r => r.place_id)).toEqual(['a', 'b', undefined]);
  });
});
