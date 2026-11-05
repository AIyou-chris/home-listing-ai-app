import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WhiteLabelSection from './WhiteLabelSection';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: () => 'f9be538a-160d-46b6-888c-67f7d534708f' });
  Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: () => undefined });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

const nextWeek = new Date(Date.now() + 7 * 86400000);
const date = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

function fillForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Inquire' }));
  for (const [label, value] of [['Name', 'Taylor Example'], ['Work email', 'taylor@example.com'], ['Team / office', 'Example office'], ['What would you like to build?', 'Our team platform'], ['Preferred date', date], ['Preferred time', '10:00']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

test('sends contact details and a time-zone-aware meeting request, then shows success', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  render(<WhiteLabelSection />);
  fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
  await screen.findByText('Thanks. Let’s talk.');
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toMatch(/\/api\/public\/white-label\/inquiry$/);
  const payload = JSON.parse(options.body);
  expect(payload).toMatchObject({ name: 'Taylor Example', office: 'Example office', date, time: '10:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  expect(new Date(payload.startIso).getHours()).toBe(10);
  expect(payload.userId).toBeUndefined();
});

test('preserves the request ID and form after an error so retry cannot create duplicates', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Please retry.' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
  render(<WhiteLabelSection />);
  fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please retry.');
  expect(screen.getByLabelText('Name')).toHaveValue('Taylor Example');
  fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).requestId).toBe(JSON.parse(fetchMock.mock.calls[1][1].body).requestId);
  await screen.findByText('Thanks. Let’s talk.');
});
