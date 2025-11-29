import React, { useCallback, useMemo, useState } from 'react';
import type { AICardData } from '../types/ai-card-builder';
import Modal from './Modal';
import { createShortLink } from '../services/linkShortenerService';

interface AICardProps {
	card: AICardData;
	onLaunch: (card: AICardData) => void;
}

const placeholderHeadshot =
	'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop';
const fallbackLogoSrc = '/newlogo.png';

const SocialLink: React.FC<{ href: string; label: string; icon: string }> = ({ href, label, icon }) => {
	if (!href.trim()) return null;
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-primary-50 hover:text-primary-700"
		>
			<span className="material-symbols-outlined text-sm">{icon}</span>
			<span>{label}</span>
		</a>
	);
};

const ActionButton: React.FC<{
	icon: string;
	label: string;
	href?: string;
	onClick?: () => void;
}> = ({ icon, label, href, onClick }) => {
	const baseClasses =
		'flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40';

	if (href && href.trim()) {
		return (
			<a href={href} className={baseClasses} aria-label={label}>
				<span className="material-symbols-outlined text-lg">{icon}</span>
				<span>{label}</span>
			</a>
		);
	}

	return (
		<button type="button" onClick={onClick} className={baseClasses} aria-label={label}>
			<span className="material-symbols-outlined text-lg">{icon}</span>
			<span>{label}</span>
		</button>
	);
};

const ensureProtocol = (url: string): string => {
	if (!url) return url;
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url;
	}
	return `https://${url}`;
};

const AICard: React.FC<AICardProps> = ({ card, onLaunch }) => {
	const headshotSrc = card.headshot || placeholderHeadshot;
	const logoSrc = card.logo && card.logo.trim().length > 0 ? card.logo.trim() : fallbackLogoSrc;
	const badgePrimary = (card.badgePrimary ?? '').trim() || card.title || 'AI Concierge';
	const helperText =
		card.chatHelperText || 'Instantly launch a tailored AI conversation';
	const chatButtonText = card.chatButtonText || 'Launch AI Chat';
	const customLinks = useMemo(() => card.customLinks ?? [], [card.customLinks]);
	const phoneHref = card.phone ? `tel:${card.phone.replace(/[^0-9+]/g, '')}` : undefined;
	const emailHref = card.email ? `mailto:${card.email}` : undefined;
	const [isShareOpen, setIsShareOpen] = useState(false);
	const [isInstallOpen, setIsInstallOpen] = useState(false);
	const [shareLink, setShareLink] = useState<string | null>(null);
	const [isGeneratingShare, setIsGeneratingShare] = useState(false);
	const [shareError, setShareError] = useState<string | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);

	const shareDestination = useMemo(() => {
		const firstLink = customLinks.find((link) => link.url && link.url.trim().length > 0);
		if (firstLink?.url) {
			return ensureProtocol(firstLink.url.trim());
		}
		if (typeof window !== 'undefined') {
			const { origin, pathname, search } = window.location;
			return ensureProtocol(`${origin}${pathname}${search}`);
		}
		return 'https://homelistingai.com';
	}, [customLinks]);

	const resolveShareLink = useCallback(async () => {
		setIsGeneratingShare(true);
		setShareError(null);
		try {
			const short = await createShortLink({
				destination: shareDestination,
				title: `${card.name || 'AI Concierge'} AI Card`,
				tags: ['ai-card', 'homelistingai']
			});
			const normalized = ensureProtocol(short.shortUrl);
			setShareLink(normalized);
		} catch (error) {
			console.error('[AICard] Failed to generate Rebrandly link', error);
			setShareError(error instanceof Error ? error.message : 'Unable to generate share link right now.');
			setShareLink(shareDestination);
		} finally {
			setIsGeneratingShare(false);
		}
	}, [card.name, shareDestination]);

	const handleOpenShare = useCallback(() => {
		setIsShareOpen(true);
		if (!shareLink) {
			void resolveShareLink();
		}
	}, [resolveShareLink, shareLink]);

	const linkForSharing = shareLink ?? shareDestination;

	const handleCopyShareLink = useCallback(async () => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(linkForSharing);
			} else {
				const textarea = document.createElement('textarea');
				textarea.value = linkForSharing;
				textarea.setAttribute('readonly', '');
				textarea.style.position = 'absolute';
				textarea.style.left = '-9999px';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			}
			setCopySuccess(true);
			window.setTimeout(() => setCopySuccess(false), 2000);
		} catch (error) {
			console.error('[AICard] Failed to copy share link', error);
			setShareError('Unable to copy link. Please try again.');
		}
	}, [linkForSharing]);

	const openShareWindow = useCallback(
		(platform: 'linkedin' | 'facebook' | 'twitter' | 'email') => {
			const encodedLink = encodeURIComponent(linkForSharing);
			const text = encodeURIComponent(
				`Meet ${card.name || 'my AI concierge'} – tap to connect instantly.`
			);

			let url = '';
			switch (platform) {
				case 'linkedin':
					url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedLink}&title=${text}`;
					break;
				case 'facebook':
					url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
					break;
				case 'twitter':
					url = `https://twitter.com/intent/tweet?url=${encodedLink}&text=${text}`;
					break;
				case 'email': {
					const subject = encodeURIComponent(`Let's connect with my AI concierge`);
					const body = encodeURIComponent(
						`Hi!\n\nHere’s my AI concierge card so you can reach me anytime: ${linkForSharing}\n\nTalk soon!`
					);
					url = `mailto:?subject=${subject}&body=${body}`;
					break;
				}
				default:
					break;
			}

			if (!url) return;

			if (platform === 'email') {
				window.location.href = url;
			} else {
				window.open(url, '_blank', 'noopener,noreferrer,width=600,height=700');
			}
		},
		[card.name, linkForSharing]
	);

	const handleSaveContact = () => {
		if (typeof document === 'undefined') return;
		const vcardLines = [
			'BEGIN:VCARD',
			'VERSION:3.0',
			`FN:${card.name || 'AI Concierge'}`,
			card.company ? `ORG:${card.company}` : undefined,
			card.email ? `EMAIL;TYPE=INTERNET:${card.email}` : undefined,
			card.phone ? `TEL;TYPE=CELL:${card.phone}` : undefined,
			card.socials.linkedin ? `URL:${card.socials.linkedin}` : undefined,
			'END:VCARD'
		].filter(Boolean) as string[];

		const blob = new Blob([vcardLines.join('\n')], { type: 'text/vcard;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${(card.name || 'ai-contact').replace(/\s+/g, '-').toLowerCase()}.vcf`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
			<div className="relative overflow-hidden bg-gradient-to-br from-[#F4F7FF] via-white to-[#FFF8EE] px-6 pb-8 pt-8 text-center">
				<div className="absolute right-6 top-6 hidden h-12 w-12 overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow md:flex md:items-center md:justify-center">
					<img
						src={logoSrc}
						alt="HomeListingAI brand mark"
						className="h-full w-full object-contain p-1.5"
						onError={(event) => {
							(event.target as HTMLImageElement).src = fallbackLogoSrc;
						}}
					/>
				</div>

				<div className="flex flex-col items-center gap-4">
					<div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg ring-4 ring-[#C7D8FF]/80">
						<img
							src={headshotSrc}
							alt={`${card.name || 'AI Concierge'} headshot`}
							className="h-full w-full object-cover"
							onError={(event) => {
								(event.target as HTMLImageElement).src = placeholderHeadshot;
							}}
						/>
					</div>
				</div>
			</div>

			<div className="mt-4 flex flex-col gap-5 px-6 pb-6">
				<div className="flex flex-col items-center gap-2 text-center">
					<h3 className="text-lg font-semibold text-slate-900">
						{card.name || 'Your AI Concierge'}
					</h3>
					<div className="flex flex-wrap justify-center gap-2">
						{badgePrimary && (
							<span className="rounded-full bg-primary-100 px-3 py-0.5 text-[11px] font-semibold text-primary-600">
								{badgePrimary}
							</span>
						)}
					</div>
					<p className="mx-auto max-w-md text-sm text-slate-600">
						{card.bio ||
							'I qualify leads, nurture relationships, and deliver high-converting follow ups while you focus on the close.'}
					</p>
				</div>

				<div
					className="rounded-2xl px-6 py-5 text-center text-white shadow-lg"
					style={{
						background: 'linear-gradient(135deg, rgba(55,126,245,0.9), rgba(142,55,245,0.9))',
						boxShadow: '0 18px 30px -18px rgba(55,126,245,0.6)'
					}}
				>
					<p className="text-xs font-semibold uppercase tracking-wide text-white/80">
						{helperText}
					</p>
					<button
						type="button"
						onClick={() => onLaunch(card)}
						className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2 text-sm font-semibold text-primary-600 shadow-lg transition hover:scale-[1.02] hover:bg-slate-100"
					>
						<span className="material-symbols-outlined text-base">rocket_launch</span>
						{chatButtonText}
					</button>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center shadow-inner">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Social</p>
					<div className="mt-3 flex flex-wrap justify-center gap-3">
						<SocialLink href={card.socials.linkedin ?? ''} label="LinkedIn" icon="business_center" />
						<SocialLink href={card.socials.instagram ?? ''} label="Instagram" icon="photo_camera" />
						<SocialLink href={card.socials.x ?? ''} label="X / Twitter" icon="flutter_dash" />
					</div>

					{customLinks.some((link) => link.label || link.url) && (
						<>
							<div className="mt-4 h-px bg-slate-200/80" />
							<p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
								Additional Links
							</p>
							<div className="mt-3 flex flex-wrap justify-center gap-3">
								{customLinks.map((link, index) => {
									if (!link.label.trim() && !link.url.trim()) return null;
									const href = link.url.trim();
									if (!href) {
										return (
											<div
												key={index}
												className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200"
											>
												{link.label.trim() || 'Custom Link'}
											</div>
										);
									}
									return (
										<a
											key={index}
											href={href}
											target="_blank"
											rel="noreferrer"
											className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary-600 shadow-sm ring-1 ring-primary-100 transition hover:bg-primary-50 hover:text-primary-700"
										>
											{link.label.trim() || href}
										</a>
									);
								})}
							</div>
						</>
					)}
				</div>
			</div>

			<div className="border-t border-slate-100 bg-gradient-to-r from-primary-600 via-primary-500 to-purple-500 px-6 py-5">
				<div className="mx-auto grid w-full max-w-md grid-cols-4 gap-3 text-white">
					<ActionButton icon="call" label="Call" href={phoneHref} />
					<ActionButton icon="mail" label="Email" href={emailHref} />
					<ActionButton icon="share" label="Share" onClick={handleOpenShare} />
					<ActionButton icon="save" label="Save" onClick={() => setIsInstallOpen(true)} />
				</div>
			</div>
			{isInstallOpen && (
				<Modal title="Save to Your Home Screen" onClose={() => setIsInstallOpen(false)}>
					<div className="flex flex-col gap-5 px-6 py-6 text-sm text-slate-600">
						<p className="text-slate-500">
							Give clients a one-tap shortcut to your AI concierge. Follow the steps below on their device.
						</p>
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-inner">
							<h3 className="text-base font-semibold text-slate-900">iPhone / iPad (Safari)</h3>
							<ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
								<li>Open this card in Safari.</li>
								<li>Tap the <span className="font-medium">Share</span> icon in the toolbar.</li>
								<li>Scroll and choose <span className="font-medium">Add to Home Screen</span>.</li>
								<li>Update the shortcut name if desired, then tap <span className="font-medium">Add</span>.</li>
							</ol>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-inner">
							<h3 className="text-base font-semibold text-slate-900">Android (Chrome)</h3>
							<ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
								<li>Open this card in Chrome.</li>
								<li>Tap the <span className="font-medium">⋮</span> menu button in the top right.</li>
								<li>Select <span className="font-medium">Add to Home screen</span>.</li>
								<li>Tap <span className="font-medium">Add</span>, then drag the icon where you want it.</li>
							</ol>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-inner">
							<h3 className="text-base font-semibold text-slate-900">Bonus: Save Contact Card</h3>
							<p className="mt-2 text-slate-600">
								Download a vCard so the concierge is saved under your contact list as well.
							</p>
							<button
								type="button"
								onClick={handleSaveContact}
								className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
							>
								<span className="material-symbols-outlined text-base">contact_page</span>
								Download Contact Card
							</button>
						</div>
					</div>
				</Modal>
			)}
			{isShareOpen && (
				<Modal title="Share Your AI Card" onClose={() => setIsShareOpen(false)}>
					<div className="flex flex-col gap-4 px-6 py-6">
						<p className="text-sm text-slate-600">
							Share your AI concierge with clients and prospects. Choose a channel below or copy the link.
						</p>
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-inner">
							<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Smart link</label>
							<div className="mt-2 flex items-center gap-2">
								<input
									type="text"
									className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
									value={isGeneratingShare ? 'Generating short link…' : linkForSharing}
									readOnly
								/>
								<button
									type="button"
									onClick={handleCopyShareLink}
									className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 disabled:opacity-60"
									disabled={isGeneratingShare}
								>
									<span className="material-symbols-outlined text-base">
										{copySuccess ? 'check_small' : 'content_copy'}
									</span>
									{copySuccess ? 'Copied' : 'Copy'}
								</button>
							</div>
							{shareError && <p className="mt-2 text-xs text-rose-600">{shareError}</p>}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => openShareWindow('linkedin')}
								className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
							>
								<span className="material-symbols-outlined text-base text-[#0A66C2]">business_center</span>
								LinkedIn
							</button>
							<button
								type="button"
								onClick={() => openShareWindow('facebook')}
								className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
							>
								<span className="material-symbols-outlined text-base text-[#1877F2]">groups</span>
								Facebook
							</button>
							<button
								type="button"
								onClick={() => openShareWindow('twitter')}
								className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
							>
								<span className="material-symbols-outlined text-base text-black">ink_pen</span>
								X / Twitter
							</button>
							<button
								type="button"
								onClick={() => openShareWindow('email')}
								className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
							>
								<span className="material-symbols-outlined text-base text-primary-500">mail</span>
								Email
							</button>
						</div>
						{typeof navigator !== 'undefined' && 'share' in navigator && (
							<button
								type="button"
								onClick={async () => {
									try {
										await navigator.share({
											title: card.name || 'AI Concierge',
											text: helperText,
											url: linkForSharing
										});
									} catch (error) {
										console.warn('[AICard] Native share cancelled or failed', error);
									}
								}}
								className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1"
							>
								<span className="material-symbols-outlined text-base">ios_share</span>
								Share with device menu
							</button>
						)}
					</div>
				</Modal>
			)}
		</div>
	);
};

export default AICard;

