import React, { useMemo } from 'react';
import type { AICardData, AICardDraft } from '../types/ai-card-builder';
import AICard from './AICard';

export interface AICardSidekickOption {
	id: string;
	label: string;
}

type EditorMode = 'overlay' | 'page';

interface AICardEditorProps {
	value: AICardDraft;
	onChange: (update: Partial<AICardDraft>) => void;
	onCancel: () => void;
	onSave: () => void;
	sidekickOptions: AICardSidekickOption[];
	title?: string;
	subtitle?: string;
	mode?: EditorMode;
	onUploadAsset?: (field: 'headshot' | 'logo', file: File) => Promise<void>;
	uploading?: Partial<Record<'headshot' | 'logo', boolean>>;
	isSaving?: boolean;
}

const AICardEditor: React.FC<AICardEditorProps> = ({
	value,
	onChange,
	onCancel,
	onSave,
	sidekickOptions,
	title = 'Build your AI Card',
	subtitle = 'Craft your concierge profile and watch the preview update live.',
	mode = 'overlay',
	onUploadAsset,
	uploading,
	isSaving = false
}) => {
	const previewCard: AICardData = useMemo(
		() => ({
			id: 'preview',
			name: value.name || 'Your AI Concierge',
			title: value.title || 'Trusted AI Assistant',
			bio: value.bio,
			email: value.email,
			phone: value.phone,
			headshot: value.headshot,
			logo: value.logo,
			sidekickId: value.sidekickId,
			socials: value.socials,
			chatButtonText: value.chatButtonText,
			chatHelperText: value.chatHelperText,
			customLinks: value.customLinks ?? [],
			badgePrimary: value.badgePrimary,
			badgeSecondary: value.badgeSecondary,
			qrCode: value.qrCode
		}),
		[value]
	);

	const linkInputs = useMemo(() => {
		const base = value.customLinks ?? [];
		if (base.length >= 2) return base;
		const fillers = Array.from({ length: 2 - base.length }, () => ({ label: '', url: '' }));
		return [...base, ...fillers];
	}, [value.customLinks]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSave();
	};

	const handleImageChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
		field: 'headshot' | 'logo'
	) => {
		const file = event.target.files?.[0];
		if (!file) {
			onChange(
				{
					[field]: '',
					[field === 'headshot' ? 'headshotStoragePath' : 'logoStoragePath']: undefined
				} as Partial<AICardDraft>
			);
			return;
		}

		if (onUploadAsset) {
			const previewUrl = URL.createObjectURL(file);
			onChange({
				[field]: previewUrl,
				[(field === 'headshot' ? 'headshot' : 'logo') + 'MimeType' as 'headshotMimeType' | 'logoMimeType']: file.type
			} as Partial<AICardDraft>);
			try {
				await onUploadAsset(field, file);
			} finally {
				URL.revokeObjectURL(previewUrl);
			}
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const result = typeof reader.result === 'string' ? reader.result : '';
			onChange({
				[field]: result,
				[(field === 'headshot' ? 'headshot' : 'logo') + 'MimeType' as 'headshotMimeType' | 'logoMimeType']: file.type
			} as Partial<AICardDraft>);
		};
		reader.readAsDataURL(file);
	};

	const isOverlay = mode === 'overlay';

	return (
		<div
			className={
				isOverlay
					? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8'
					: 'w-full'
			}
		>
			<div
				className={`relative flex w-full flex-col gap-6 rounded-3xl ${
					isOverlay
						? 'max-w-6xl bg-white p-6 shadow-2xl md:p-8'
						: 'border border-slate-200 bg-white p-6 shadow-xl md:p-8'
				}`}
			>
				{isOverlay ? (
					<button
						type="button"
						onClick={onCancel}
						className="absolute right-5 top-5 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
						aria-label="Close AI card editor"
					>
						<span className="material-symbols-outlined">close</span>
					</button>
				) : (
					<button
						type="button"
						onClick={onCancel}
						className="inline-flex w-max items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
					>
						<span className="material-symbols-outlined text-base">arrow_back</span>
						Back to cards
					</button>
				)}

				<header className="space-y-2">
					<h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
					<p className="text-sm text-slate-500">{subtitle}</p>
				</header>

				<div className="grid gap-6 md:grid-cols-2 lg:gap-8">
					<form className="space-y-5" onSubmit={handleSubmit}>
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
							Core Details
						</div>

						<div className="space-y-4">
							<div>
								<label htmlFor="ai-card-name" className="block text-sm font-semibold text-slate-700">
									Agent Name
								</label>
								<input
									id="ai-card-name"
									type="text"
									value={value.name}
									onChange={(event) => onChange({ name: event.target.value })}
									className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
									placeholder="Chris Potter"
								/>
							</div>
							<div>
								<label htmlFor="ai-card-title" className="block text-sm font-semibold text-slate-700">
									Role / Title
								</label>
								<input
									id="ai-card-title"
									type="text"
									value={value.title}
									onChange={(event) => onChange({ title: event.target.value })}
									className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
									placeholder="Sales Concierge"
								/>
							</div>
							<div>
								<label htmlFor="ai-card-bio" className="block text-sm font-semibold text-slate-700">
									Short Bio
								</label>
								<textarea
									id="ai-card-bio"
									value={value.bio}
									onChange={(event) => onChange({ bio: event.target.value })}
									className="mt-1 h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
									placeholder="Describe how this AI concierge supports your clients..."
								/>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label htmlFor="ai-card-badge-primary" className="block text-sm font-semibold text-slate-700">
										Badge Label #1
									</label>
									<input
										id="ai-card-badge-primary"
										type="text"
										value={value.badgePrimary}
										onChange={(event) => onChange({ badgePrimary: event.target.value })}
										className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
										placeholder="AI Concierge"
									/>
								</div>
								<div>
									<label htmlFor="ai-card-badge-secondary" className="block text-sm font-semibold text-slate-700">
										Badge Label #2
									</label>
									<input
										id="ai-card-badge-secondary"
										type="text"
										value={value.badgeSecondary}
										onChange={(event) => onChange({ badgeSecondary: event.target.value })}
										className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
										placeholder="Sales Sidekick"
									/>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
							Chat Launch Copy
						</div>
						<div className="space-y-4">
							<div>
								<label htmlFor="ai-card-chat-helper" className="block text-sm font-semibold text-slate-700">
									Helper Text
								</label>
								<input
									id="ai-card-chat-helper"
									type="text"
									value={value.chatHelperText}
									onChange={(event) => onChange({ chatHelperText: event.target.value })}
									className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
									placeholder="Instantly launch a tailored AI conversation"
								/>
							</div>
							<div>
								<label htmlFor="ai-card-chat-button" className="block text-sm font-semibold text-slate-700">
									Button Text
								</label>
								<input
									id="ai-card-chat-button"
									type="text"
									value={value.chatButtonText}
									onChange={(event) => onChange({ chatButtonText: event.target.value })}
									className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
									placeholder="Launch AI Chat"
								/>
							</div>
						</div>

						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
							Custom Links
						</div>
						<div className="space-y-4">
							{linkInputs.map((link, index) => (
								<div key={index} className="grid gap-4 md:grid-cols-2">
									<div>
										<label
											htmlFor={`ai-card-custom-link-label-${index}`}
											className="block text-sm font-semibold text-slate-700"
										>
											Link Label #{index + 1}
										</label>
										<input
											id={`ai-card-custom-link-label-${index}`}
											type="text"
											value={link.label}
											onChange={(event) => {
												const customLinks = [...(value.customLinks ?? [])];
												customLinks[index] = {
													...(customLinks[index] ?? { label: '', url: '' }),
													label: event.target.value
												};
												onChange({ customLinks });
											}}
											className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
											placeholder="See My Listings"
										/>
									</div>
									<div>
										<label
											htmlFor={`ai-card-custom-link-url-${index}`}
											className="block text-sm font-semibold text-slate-700"
										>
											URL #{index + 1}
										</label>
										<input
											id={`ai-card-custom-link-url-${index}`}
											type="url"
											value={link.url}
											onChange={(event) => {
												const customLinks = [...(value.customLinks ?? [])];
												customLinks[index] = {
													...(customLinks[index] ?? { label: '', url: '' }),
													url: event.target.value
												};
												onChange({ customLinks });
											}}
											className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
											placeholder="https://example.com/..."
										/>
									</div>
								</div>
							))}
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label htmlFor="ai-card-email" className="block text-sm font-semibold text-slate-700">
									Email Address
								</label>
								<input
									id="ai-card-email"
									type="email"
									value={value.email}
									onChange={(event) => onChange({ email: event.target.value })}
									className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
									placeholder="you@email.com"
								/>
							</div>
							<div>
								<label htmlFor="ai-card-phone" className="block text-sm font-semibold text-slate-700">
									Phone
								</label>
								<input
									id="ai-card-phone"
									type="tel"
									value={value.phone}
									onChange={(event) => onChange({ phone: event.target.value })}
									className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
									placeholder="(555) 123-4567"
								/>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="block text-sm font-semibold text-slate-700">Headshot</label>
								<div className="mt-1 flex items-center gap-3">
									<div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
										{value.headshot ? (
											<img src={value.headshot} alt="Headshot preview" className="h-full w-full object-cover" />
										) : (
											<div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Upload</div>
										)}
									</div>
									<label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700">
										<input
											type="file"
											accept="image/*"
											className="hidden"
											onChange={(event) => handleImageChange(event, 'headshot')}
											disabled={Boolean(uploading?.headshot)}
										/>
										<span className="material-symbols-outlined text-base">upload</span>
										<span>{uploading?.headshot ? 'Uploading…' : 'Upload'}</span>
									</label>
								</div>
							</div>
							<div>
								<label className="block text-sm font-semibold text-slate-700">Logo</label>
								<div className="mt-1 flex items-center gap-3">
									<div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
										{value.logo ? (
											<img src={value.logo} alt="Logo preview" className="h-full w-full object-cover" />
										) : (
											<div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Upload</div>
										)}
									</div>
									<label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700">
										<input
											type="file"
											accept="image/*"
											className="hidden"
											onChange={(event) => handleImageChange(event, 'logo')}
											disabled={Boolean(uploading?.logo)}
										/>
										<span className="material-symbols-outlined text-base">upload</span>
										<span>{uploading?.logo ? 'Uploading…' : 'Upload'}</span>
									</label>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<label htmlFor="ai-card-sidekick" className="block text-sm font-semibold text-slate-700">
									Assign AI Sidekick
								</label>
								<select
									id="ai-card-sidekick"
									value={value.sidekickId}
									onChange={(event) => onChange({ sidekickId: event.target.value })}
									className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
								>
									{sidekickOptions.map((option) => (
										<option key={option.id} value={option.id}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							<div className="grid gap-4 md:grid-cols-3">
								<div>
									<label htmlFor="ai-card-linkedin" className="block text-sm font-semibold text-slate-700">
										LinkedIn
									</label>
									<input
										id="ai-card-linkedin"
										type="url"
										value={value.socials.linkedin}
										onChange={(event) =>
											onChange({ socials: { ...value.socials, linkedin: event.target.value } })
										}
										className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
										placeholder="https://linkedin.com/in/..."
									/>
								</div>
								<div>
									<label htmlFor="ai-card-instagram" className="block text-sm font-semibold text-slate-700">
										Instagram
									</label>
									<input
										id="ai-card-instagram"
										type="url"
										value={value.socials.instagram}
										onChange={(event) =>
											onChange({ socials: { ...value.socials, instagram: event.target.value } })
										}
										className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
										placeholder="https://instagram.com/..."
									/>
								</div>
								<div>
									<label htmlFor="ai-card-x" className="block text-sm font-semibold text-slate-700">
										X / Twitter
									</label>
									<input
										id="ai-card-x"
										type="url"
										value={value.socials.x}
										onChange={(event) => onChange({ socials: { ...value.socials, x: event.target.value } })}
										className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
										placeholder="https://x.com/..."
									/>
								</div>
							</div>
						</div>
						<div className="flex items-center justify-end gap-3 pt-2">
							<button
								type="button"
								onClick={onCancel}
								className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={isSaving}
							>
								{isSaving ? (
									<span className="inline-flex items-center gap-2">
										<span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
										Saving…
									</span>
								) : (
									'Save AI Card'
								)}
							</button>
						</div>
					</form>

					<div className="flex flex-col gap-4">
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
							Live Preview
						</div>
						<AICard card={previewCard} onLaunch={() => undefined} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default AICardEditor;

