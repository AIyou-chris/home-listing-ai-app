import React from 'react';

interface ChatModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	subtitle?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ open, onClose, title, subtitle }) => {
	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8"
			aria-modal="true"
			role="dialog"
			aria-labelledby="chat-modal-title"
		>
			<div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
				<div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
					<div>
						<h2 id="chat-modal-title" className="text-lg font-semibold text-slate-900">
							{title}
						</h2>
						<p className="text-sm text-slate-500">{subtitle ?? 'Interactive AI conversation (coming soon)'}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
						aria-label="Close chat modal"
					>
						<span className="material-symbols-outlined">close</span>
					</button>
				</div>

				<div className="px-6 py-6">
					<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
							<span className="material-symbols-outlined text-3xl">smart_toy</span>
						</div>
						<h3 className="mt-4 text-base font-semibold text-slate-900">
							Live AI Chat Launches from here
						</h3>
						<p className="mt-2 text-sm text-slate-500">
							This is a preview placeholder. In the next phase we&apos;ll connect the full chat + voice
							experience so you can talk to your AI concierge directly from the card.
						</p>
					</div>
				</div>

				<div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
					>
						Close
					</button>
					<button
						type="button"
						className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700"
					>
						Start Chat (soon)
					</button>
				</div>
			</div>
		</div>
	);
};

export default ChatModal;


