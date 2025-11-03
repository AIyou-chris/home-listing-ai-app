import { supabase } from './supabase';

export type TranscriptMetadata = Record<string, unknown> | null;

export interface AITranscriptRow {
	id: string;
	user_id: string;
	sidekick: string;
	title: string | null;
	content: string;
	created_at: string;
	meta?: TranscriptMetadata;
}

const TABLE = 'ai_transcripts';

export const saveTranscript = async (
	userId: string,
	sidekick: string,
	content: string,
	title?: string,
	meta?: TranscriptMetadata
): Promise<AITranscriptRow | null> => {
	if (!content.trim()) return null;
	const { data, error } = await supabase
		.from(TABLE)
		.insert({
			user_id: userId,
			sidekick,
			title: title || null,
			content,
			meta
		})
		.select('*')
		.single();
	if (error) {
		console.warn('saveTranscript error', error.message);
		return null;
	}
	return data as AITranscriptRow;
};

export const listTranscripts = async (
	userId: string,
	limit = 20
): Promise<AITranscriptRow[]> => {
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) {
		console.warn('listTranscripts error', error.message);
		return [];
	}
	return (data || []) as AITranscriptRow[];
};

export const deleteTranscript = async (id: string): Promise<boolean> => {
	const { error } = await supabase
		.from(TABLE)
		.delete()
		.eq('id', id);
	if (error) {
		console.warn('deleteTranscript error', error.message);
		return false;
	}
	return true;
};


