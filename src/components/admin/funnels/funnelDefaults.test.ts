import { isCallStepType, slugifyBotKey, resolveCallBotId, normalizeCallStep, highlightCards, initialHomeBuyerSteps, DEFAULT_CALL_BOT_KEY } from './funnelDefaults';
import type { CallBot, EditableStep } from '../../../types';

const bot = (over: Partial<CallBot>): CallBot => ({ id: '1', key: 'a', name: 'A', configId: 'c', isActive: true, isDefault: false, ...over } as CallBot);

describe('funnel defaults', () => {
  it('knows which steps are calls', () => {
    expect(isCallStepType('Call')).toBe(true);
    expect(isCallStepType('AI Call')).toBe(true);
    expect(isCallStepType('Email')).toBe(false);
    expect(isCallStepType('')).toBe(false);
  });

  it('turns a bot name into a safe key', () => {
    expect(slugifyBotKey('  Broker Follow-Up Bot! ')).toBe('broker_follow_up_bot');
  });

  it('keeps a real bot key and otherwise falls back to the default bot', () => {
    const bots = [bot({ key: 'x' }), bot({ key: 'main', isDefault: true })];
    expect(resolveCallBotId('x', bots)).toBe('x');
    expect(resolveCallBotId('gone', bots)).toBe('main');
    expect(resolveCallBotId('anything', [])).toBe(DEFAULT_CALL_BOT_KEY);
  });

  it('only rewrites call steps', () => {
    const bots = [bot({ key: 'main', isDefault: true })];
    const email = { id: 'e', type: 'Email', content: 'hi' } as EditableStep;
    const call = { id: 'c', type: 'Call', content: 'old' } as EditableStep;
    expect(normalizeCallStep(email, bots)).toBe(email);
    expect(normalizeCallStep(call, bots).content).toBe('main');
  });

  it('ships a starter funnel and the page cards', () => {
    expect(initialHomeBuyerSteps.length).toBeGreaterThan(0);
    expect(new Set(initialHomeBuyerSteps.map((s) => s.id)).size).toBe(initialHomeBuyerSteps.length);
    expect(highlightCards.length).toBeGreaterThan(0);
  });
});
