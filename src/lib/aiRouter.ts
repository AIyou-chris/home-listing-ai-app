import { useAISidekicks, AISidekickRole } from '../context/AISidekickContext';
import { buildSystemPrompt } from './promptBuilder';
import { continueConversation as callLocal } from '../services/localAIService';
import { addUsage } from '../services/usageService';
import { resolveUserId } from '../services/userId';

type Msg = { sender: 'user' | 'assistant'; text: string };

export const useAiRouter = () => {
	const { roleMap, getPersonality } = useAISidekicks();

	const ask = async (
		params: { role?: AISidekickRole; messages: Msg[] }
	) => {
		const role = params.role ?? roleMap.defaultRole;
		const personality = getPersonality(role);
		const system = buildSystemPrompt(role, personality, roleMap.customOverrides);
		const payload = [...params.messages];
		const text = await callLocal(payload, { role, personalityId: personality.id, systemPrompt: system });
		// usage tracking (best-effort)
		try {
			const uid = resolveUserId();
			if (uid) {
				// In local mode we don't have token metrics; estimate minimal usage
				await addUsage(uid, role, { prompt: system.length / 4, completion: text.length / 4, total: (system.length + text.length) / 4, costUsd: 0.0005 });
			}
		} catch (error) {
			console.error('[aiRouter] Failed to record usage:', error);
		}
		return text;
	};

	return { ask };
};


