export interface AICardSocials {
	linkedin: string;
	instagram: string;
	x: string;
}

export interface AICardData {
	id: string;
	name: string;
	title: string;
	bio: string;
	email: string;
	phone: string;
	headshot: string;
	logo: string;
	company?: string;
	sidekickId: string;
	socials: AICardSocials;
	chatButtonText: string;
	chatHelperText: string;
	customLinks: Array<{ label: string; url: string }>;
	badgePrimary: string;
	badgeSecondary: string;
	qrCode?: string;
}

export type AICardDraft = Omit<AICardData, 'id'> & {
	headshotMimeType?: string;
	logoMimeType?: string;
	headshotStoragePath?: string;
	logoStoragePath?: string;
};

