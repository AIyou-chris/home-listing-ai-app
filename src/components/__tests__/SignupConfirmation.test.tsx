import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignUpPage from '../SignUpPage';
import LOSignupPage from '../LOSignupPage';
import { agentOnboardingService } from '../../services/agentOnboardingService';
import { supabase } from '../../services/supabase';

jest.mock('../../services/agentOnboardingService', () => ({ agentOnboardingService: { registerAgent: jest.fn() } }));
jest.mock('../../services/supabase', () => ({ supabase: { auth: { signInWithPassword: jest.fn(), signInWithOAuth: jest.fn() } } }));
jest.mock('../layout/PublicHeader', () => ({ PublicHeader: () => null }));
jest.mock('../layout/PublicFooter', () => ({ PublicFooter: () => null }));
jest.mock('../BackgroundTechIcons', () => ({ BackgroundTechIcons: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  (agentOnboardingService.registerAgent as jest.Mock).mockResolvedValue({ credentials: null, confirmationRequired: true });
  sessionStorage.clear();
});

test('general signup shows email confirmation without trying to use returned passwords', async () => {
  const { container } = render(<MemoryRouter><SignUpPage onNavigateToSignIn={jest.fn()} onNavigateToLanding={jest.fn()} onNavigateToSection={jest.fn()} onEnterDemoMode={jest.fn()} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Sam' } });
  fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Buyer' } });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'sam@example.invalid' } });
  fireEvent.submit(container.querySelector('form')!);
  expect(await screen.findByRole('status')).toHaveTextContent('Check your email');
  expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
});

test('loan-officer signup sends the chosen password only to registration and waits for email verification', async () => {
  const { container } = render(<MemoryRouter><LOSignupPage /></MemoryRouter>);
  for (const [placeholder, value] of [['Chris', 'Sam'], ['Johnson', 'Buyer'], ['you@example.com', 'sam@example.invalid'], ['••••••••', 'Chosen-password-123'], ['1234567', '1234567']]) {
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
  }
  fireEvent.submit(container.querySelector('form')!);
  expect(await screen.findByRole('status')).toHaveTextContent('Check your email');
  expect(agentOnboardingService.registerAgent).toHaveBeenCalledWith(expect.objectContaining({ accountType: 'lo', password: 'Chosen-password-123' }));
  expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
});
