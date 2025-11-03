import { buildSystemPrompt } from '../lib/promptBuilder';
import type { AIPersonality } from '../types';

describe('promptBuilder', () => {
	it('includes role guidance and personality', () => {
		const personality: AIPersonality = {
			id: 'pers-1',
			name: 'Professional Real Estate Expert',
			description: 'A knowledgeable and authoritative voice with deep market expertise',
			traits: ['Professional'],
			sampleResponses: []
		};
		const prompt = buildSystemPrompt('marketing', personality, ['Extra']);
		expect(prompt).toContain('marketing');
		expect(prompt).toContain('Professional Real Estate Expert');
		expect(prompt).toContain('Extra');
	});
});


