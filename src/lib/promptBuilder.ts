import type { AISidekickRole } from '../context/AISidekickContext';
import type { AIPersonality } from '../types';

export const buildSystemPrompt = (
	role: AISidekickRole,
	personality: AIPersonality,
	overrides: string[]
): string => {
	const base = 'You are an AI for a real estate app. Be concise, accurate, and safe.';
	const roleGuidance = role === 'listing'
		? 'Prioritize property specifics, comps, disclosures, and accuracy.'
		: role === 'agent'
		? 'Act as the agent’s representative for sales and client success.'
		: role === 'helper'
		? 'Guide the user through product features and workflows.'
		: role === 'marketing'
		? 'Create persuasive, brand-consistent marketing content and campaigns.'
		: role === 'sales'
		? 'Drive conversions with ethical, consultative sales language.'
		: 'Coordinate and decide which role to apply; synthesize balanced output.';

	const personalityLine = `Personality: ${personality.name} — ${personality.description}`;
	const traits = personality.traits?.length ? `Traits: ${personality.traits.join(', ')}` : '';
	const extra = overrides?.length ? overrides.join('\n') : '';

	return [base, roleGuidance, personalityLine, traits, extra]
		.filter(Boolean)
		.join('\n');
};


