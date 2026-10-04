import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminMarketingStudio from './AdminMarketingStudio';
import { loadStudioBriefs, saveStudioBriefs } from './marketingStudioDrafts';

jest.mock('qrcode', () => ({ __esModule: true, default: { toDataURL: jest.fn() } }));

beforeEach(() => {
  localStorage.clear();
  let nextId = 0;
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: () => `brief-${++nextId}` });
});
afterEach(() => jest.restoreAllMocks());

function saveCampaign() {
  fireEvent.change(screen.getByLabelText('Campaign idea'), { target: { value: 'Promote our agent partnership program' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save campaign brief' }));
}

test('saves a brief across remounts and isolates each account', () => {
  const { unmount } = render(<AdminMarketingStudio ownerId="owner-a" />);
  saveCampaign();
  expect(loadStudioBriefs('owner-a')).toHaveLength(1);
  expect(loadStudioBriefs('owner-b')).toEqual([]);
  unmount();
  render(<AdminMarketingStudio ownerId="owner-a" />);
  fireEvent.click(screen.getByRole('tab', { name: 'My campaigns' }));
  expect(screen.getByText('Promote our agent partnership program')).toBeInTheDocument();
});

test('switching from campaign to video keeps the campaign instead of overwriting it', () => {
  render(<AdminMarketingStudio ownerId="owner-a" />);
  saveCampaign();
  fireEvent.click(screen.getByRole('tab', { name: 'Make a Video' }));
  fireEvent.change(screen.getByLabelText('Video idea'), { target: { value: 'Show a WOW Link walkthrough' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save video brief' }));
  expect(loadStudioBriefs('owner-a').map(brief => brief.kind).sort()).toEqual(['campaign', 'video']);
});

test('storage failure does not report a saved brief or change previous data', () => {
  render(<AdminMarketingStudio ownerId="owner-a" />);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  saveCampaign();
  expect(screen.getByText(/Could not save this brief/)).toBeInTheDocument();
  expect(loadStudioBriefs('owner-a')).toEqual([]);
  expect(screen.queryByText(/Brief saved in this browser/)).not.toBeInTheDocument();
});

test('malformed saved data remains untouched and prevents accidental overwrite', () => {
  const key = 'hlai_marketing_studio_v1:owner-a';
  localStorage.setItem(key, '{broken');
  render(<AdminMarketingStudio ownerId="owner-a" />);
  expect(screen.getByText(/Saved briefs could not be loaded/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save campaign brief' })).toBeDisabled();
  expect(localStorage.getItem(key)).toBe('{broken');
});

test('tabs support keyboard navigation and never schedule publishing', () => {
  render(<AdminMarketingStudio ownerId="owner-a" />);
  const createTab = screen.getByRole('tab', { name: 'Create' });
  fireEvent.keyDown(createTab, { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'My campaigns' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'My campaigns' })).toHaveFocus();
  fireEvent.click(screen.getByRole('tab', { name: 'Calendar' }));
  expect(screen.getByText(/Nothing on this calendar will publish automatically/)).toBeInTheDocument();
});

test('requires an account before persistence', () => {
  expect(() => saveStudioBriefs('', [])).toThrow(/account is still loading/);
  expect(localStorage.length).toBe(0);
});
