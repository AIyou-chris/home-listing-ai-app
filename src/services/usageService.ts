import { supabase } from './supabase';

export interface UsageRecord {
	user_id: string;
	role: string;
	date: string; // YYYY-MM
	requests: number;
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	cost_usd: number;
}

const TABLE = 'ai_usage_monthly';

export const addUsage = async (
	userId: string,
	role: string,
	usage: { prompt: number; completion: number; total: number; costUsd: number }
) => {
	const date = new Date();
	const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	const { data, error } = await supabase
		  .from(TABLE)
		.select('*')
		.eq('user_id', userId)
		.eq('role', role)
		.eq('date', month)
		.single();
	if (error && error.code !== 'PGRST116') {
		console.warn('usage select error', error.message);
	}
	const rec: UsageRecord = data || {
		user_id: userId,
		role,
		date: month,
		requests: 0,
		prompt_tokens: 0,
		completion_tokens: 0,
		total_tokens: 0,
		cost_usd: 0
	};
	const updated: UsageRecord = {
		...rec,
		requests: rec.requests + 1,
		prompt_tokens: rec.prompt_tokens + usage.prompt,
		completion_tokens: rec.completion_tokens + usage.completion,
		total_tokens: rec.total_tokens + usage.total,
		cost_usd: +(rec.cost_usd + usage.costUsd).toFixed(4)
	};
	const upsert = await supabase.from(TABLE).upsert(updated, { onConflict: 'user_id,role,date' });
	if (upsert.error) console.warn('usage upsert error', upsert.error.message);
	return updated;
};

export const isOverBudget = async (
	userId: string,
	role: string,
	budgetUsd: number
) => {
	const date = new Date();
	const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	const { data } = await supabase
		  .from(TABLE)
		.select('cost_usd')
		.eq('user_id', userId)
		.eq('role', role)
		.eq('date', month)
		.single();
	return (data?.cost_usd || 0) >= budgetUsd;
};


