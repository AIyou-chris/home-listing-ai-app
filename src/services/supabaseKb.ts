// Supabase Knowledge Base service
import { supabase } from './supabase'

export type SidekickId = 'main' | 'sales' | 'listing' | 'agent' | 'helper' | 'marketing' | 'support'

export interface KbEntry {
	id: string
	title: string
	type: 'file' | 'text' | 'url'
	sidekick: SidekickId
	content?: string
	file_path?: string
	created_at: string
	property_id?: string
}

const bucket = 'ai-kb'

export const listKb = async (userId: string, sidekick?: SidekickId, propertyId?: string): Promise<KbEntry[]> => {
	let q = supabase.from('ai_kb').select('*').eq('user_id', userId).order('created_at', { ascending: false })

	if (sidekick) {
		q = q.eq('sidekick', sidekick)
	}

	if (propertyId) {
		q = q.eq('property_id', propertyId)
	}

	const { data, error } = await q
	if (error) throw error
	return (data || []) as unknown as KbEntry[]
}

export const getEntry = async (id: string): Promise<KbEntry | null> => {
	const { data, error } = await supabase.from('ai_kb').select('*').eq('id', id).single()
	if (error) return null
	return data as unknown as KbEntry
}

export const getPublicUrl = (path?: string | null): string | null => {
	if (!path) return null
	const { data } = supabase.storage.from(bucket).getPublicUrl(path)
	return data?.publicUrl || null
}

export const addTextKb = async (userId: string, sidekick: SidekickId, title: string, content: string, propertyId?: string): Promise<KbEntry> => {
	const { data, error } = await supabase.from('ai_kb').insert({
		user_id: userId,
		sidekick,
		title,
		type: 'text',
		content,
		property_id: propertyId
	}).select('*').single()
	if (error) throw error
	return data as unknown as KbEntry
}

export const addUrlKb = async (userId: string, sidekick: SidekickId, title: string, url: string, scrapedContent?: string, propertyId?: string): Promise<KbEntry> => {
	const content = scrapedContent ? `Source: ${url}\n\n${scrapedContent}` : url;
	const { data, error } = await supabase.from('ai_kb').insert({
		user_id: userId,
		sidekick,
		title,
		type: 'url',
		content,
		property_id: propertyId
	}).select('*').single()
	if (error) throw error
	return data as unknown as KbEntry
}

export const uploadFileKb = async (userId: string, sidekick: SidekickId, file: File, propertyId?: string): Promise<KbEntry> => {
	const path = `${userId}/${Date.now()}-${file.name}`
	const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
	if (upErr) throw upErr
	const { data, error } = await supabase.from('ai_kb').insert({
		user_id: userId,
		sidekick,
		title: file.name,
		type: 'file',
		file_path: path,
		property_id: propertyId
	}).select('*').single()
	if (error) throw error
	return data as unknown as KbEntry
}

export const deleteKb = async (entry: KbEntry): Promise<void> => {
	if (entry.type === 'file' && entry.file_path) {
		await supabase.storage.from(bucket).remove([entry.file_path])
	}
	const { error } = await supabase.from('ai_kb').delete().eq('id', entry.id)
	if (error) throw error
}
