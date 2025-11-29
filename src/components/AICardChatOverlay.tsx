import React, { useCallback, useEffect, useRef, useState } from 'react';
import HelpSalesChatBotComponent, {
	type LeadPayload,
	type SupportTicketPayload
} from './HelpSalesChatBot';
import { VoiceBubble } from './voice/VoiceBubble';
import type { ChatBotContext } from '../services/helpSalesChatBot';
import { appendMessage, createConversation } from '../services/chatService';

interface AICardChatOverlayProps {
	open: boolean;
	onClose: () => void;
	assistantName: string;
	sidekickId?: string;
	context: ChatBotContext;
	voicePrompt?: string;
	className?: string;
	onLeadGenerated?: (lead: LeadPayload) => void;
	onSupportTicket?: (ticket: SupportTicketPayload) => void;
}

const AICardChatOverlay: React.FC<AICardChatOverlayProps> = ({
	open,
	onClose,
	assistantName,
	sidekickId,
	context,
	voicePrompt,
	className = '',
	onLeadGenerated,
	onSupportTicket
}) => {
	const [isVoiceView, setIsVoiceView] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const createConversationPromiseRef = useRef<Promise<string | null> | null>(null);
	const createNewConversation = useCallback(async () => {
		if (createConversationPromiseRef.current) {
			return createConversationPromiseRef.current;
		}
		const promise = (async () => {
			try {
				const conversation = await createConversation({
					scope: 'agent',
					type: 'chat',
					contactName: context.userInfo?.name ?? '',
					contactEmail: context.userInfo?.email ?? '',
					contactPhone: context.userInfo?.phone ?? '',
					intent: context.currentPage ?? undefined,
					language: context.userInfo?.language ?? 'English',
					tags: ['ai-card'],
					metadata: {
						source: context.currentPage ?? 'ai-card',
						userType: context.userType,
						modalities: ['chat', 'voice']
					}
				});
				setConversationId(conversation.id);
				return conversation.id;
			} catch (error) {
				console.error('[AICardChatOverlay] Failed to seed conversation', error);
				return null;
			} finally {
				createConversationPromiseRef.current = null;
			}
		})();
		createConversationPromiseRef.current = promise;
		return promise;
	}, [context.currentPage, context.userInfo, context.userType]);

	const logMessage = useCallback(
		async (role: 'user' | 'ai', content: string, channel: 'chat' | 'voice') => {
			const trimmed = content.trim();
			if (!trimmed) return;
			const id = conversationId ?? (await createNewConversation());
			if (!id) return;
			try {
				await appendMessage({
					conversationId: id,
					role: role,
					content: trimmed,
					channel
				});
			} catch (error) {
				console.error('[AICardChatOverlay] Failed to append message', error);
			}
		},
		[conversationId, createNewConversation]
	);

	useEffect(() => {
		if (!open) {
			setConversationId(null);
			createConversationPromiseRef.current = null;
			return;
		}
		if (conversationId) return;
		let cancelled = false;
		void createNewConversation().then((id) => {
			if (cancelled) return;
			if (id) {
				setConversationId(id);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [open, conversationId, createNewConversation]);

	if (!open) return null;

	const handleClose = () => {
		setIsVoiceView(false);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center">
			<button
				type="button"
				onClick={handleClose}
				className="absolute inset-0 h-full w-full cursor-default bg-transparent"
				aria-label="Close chat overlay"
			/>
			<div
				className={`relative z-[81] w-full max-w-lg px-3 pb-4 sm:max-w-md sm:px-0 ${className}`}
			>
				<div className="mx-auto flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
					<header className="flex items-center justify-between bg-primary-600 px-5 py-4 text-white">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
								<span className="material-symbols-outlined text-lg">robot_2</span>
							</div>
							<div>
								<h2 className="text-base font-semibold">{assistantName}</h2>
								<p className="text-xs text-white/80">Chat or speak with your AI concierge</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setIsVoiceView((previous) => !previous)}
								className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
								aria-label={isVoiceView ? 'Show chat view' : 'Show voice view'}
							>
								<span className="material-symbols-outlined text-lg">
									{isVoiceView ? 'chat' : 'mic'}
								</span>
							</button>
							<button
								type="button"
								onClick={handleClose}
								className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
								aria-label="Close chat"
							>
								<span className="material-symbols-outlined text-xl">close</span>
							</button>
						</div>
					</header>

					<div className="relative flex h-[520px] w-full flex-col bg-white sm:h-[560px]">
						<div className="relative h-full w-full" style={{ perspective: '2000px' }}>
							<div
								className="absolute inset-0 transition-transform duration-500"
								style={{
									transformStyle: 'preserve-3d',
									transform: isVoiceView ? 'rotateY(180deg)' : 'rotateY(0deg)'
								}}
							>
								<div
									className="absolute inset-0 bg-white"
									style={{ backfaceVisibility: 'hidden' }}
								>
									<HelpSalesChatBotComponent
										context={context}
										className="h-full rounded-none border-none shadow-none"
										onLeadGenerated={onLeadGenerated}
										onSupportTicket={onSupportTicket}
										onUserMessage={(message) => void logMessage('user', message, 'chat')}
										onAssistantMessage={(message) => void logMessage('ai', message, 'chat')}
									/>
								</div>
								<div
									className="absolute inset-0"
									style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
								>
									<VoiceBubble
										assistantName={assistantName}
										sidekickId={sidekickId}
										systemPrompt={voicePrompt}
										autoConnect={isVoiceView}
										showHeader={false}
										className="h-full rounded-none"
										onUserSpeechFinal={(message) => void logMessage('user', message, 'voice')}
										onFinalResponse={(message) => void logMessage('ai', message, 'voice')}
										onClose={() => setIsVoiceView(false)}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AICardChatOverlay;

