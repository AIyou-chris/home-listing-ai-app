import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FunnelTestConfig from './FunnelTestConfig';

const base = { testPhone: '', setTestPhone: jest.fn(), isTestPhoneValid: true, testEmail: '', setTestEmail: jest.fn() };

describe('FunnelTestConfig', () => {
  it('passes typed phone and email back', () => {
    const props = { ...base, setTestPhone: jest.fn(), setTestEmail: jest.fn() };
    render(<FunnelTestConfig {...props} />);
    fireEvent.change(screen.getByPlaceholderText('+15550000000'), { target: { value: '+12125551212' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } });
    expect(props.setTestPhone).toHaveBeenCalledWith('+12125551212');
    expect(props.setTestEmail).toHaveBeenCalledWith('a@b.com');
  });
  it('warns about a bad phone number only when one was typed', () => {
    const { rerender } = render(<FunnelTestConfig {...base} testPhone="123" isTestPhoneValid={false} />);
    expect(screen.getByText(/E\.164 format/)).toBeTruthy();
    rerender(<FunnelTestConfig {...base} testPhone="" isTestPhoneValid={false} />);
    expect(screen.queryByText(/E\.164 format/)).toBeNull();
  });
});
