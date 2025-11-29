// Share Service for sharing content via text, email, and other methods

interface ShareableDescription {
	paragraphs?: string[]
}

export interface ShareableProperty {
	id: string
	address: string
	description?: string | ShareableDescription
	price?: number
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
}

export interface MarketingProposalSummary {
	id: string
	propertyAddress: string
	executiveSummary?: string
	marketAnalysis?: string
	pricingStrategy?: string
	marketingPlan?: string
}

export class ShareService {
	// Share content using native Web Share API (mobile-friendly)
	static async shareContent(data: {
		title: string;
		text: string;
		url?: string;
		type: 'property' | 'proposal' | 'report' | 'marketing';
	}) {
		try {
			// Check if Web Share API is supported
			if (navigator.share) {
				const shareData = {
					title: data.title,
					text: data.text,
					url: data.url || window.location.href
				};

				await navigator.share(shareData);
				return { success: true, method: 'native' };
			} else {
				// Fallback to email sharing
				return this.shareViaEmail(data);
			}
		} catch (error) {
			console.error('Share failed:', error);
			// Fallback to email sharing
			return this.shareViaEmail(data);
		}
	}

	// Share via email
	static shareViaEmail(data: {
		title: string;
		text: string;
		url?: string;
		type: 'property' | 'proposal' | 'report' | 'marketing';
	}) {
		const subject = encodeURIComponent(data.title);
		const body = encodeURIComponent(`${data.text}\n\n${data.url || window.location.href}`);
		const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

		window.open(mailtoUrl, '_blank');
		return { success: true, method: 'email' };
	}

	// Share via SMS/Text
	static shareViaText(data: {
		title: string;
		text: string;
		url?: string;
		type: 'property' | 'proposal' | 'report' | 'marketing';
	}) {
		const message = encodeURIComponent(`${data.title}\n\n${data.text}\n\n${data.url || window.location.href}`);
		const smsUrl = `sms:?body=${message}`;

		window.open(smsUrl, '_blank');
		return { success: true, method: 'sms' };
	}

	// Generate shareable content for property reports
	static generatePropertyShareContent(property: ShareableProperty, reportType: 'description' | 'analysis' | 'proposal') {
		const baseText = `Check out this amazing property at ${property.address}!`;
		const descriptionText = typeof property.description === 'string'
			? property.description
			: property.description?.paragraphs?.join('\n\n') ?? 'Beautiful property with great features.'
		
		switch (reportType) {
			case 'description':
				return {
					title: `Property Description - ${property.address}`,
					text: `${baseText}\n\n${descriptionText}`,
					url: `${window.location.origin}/property/${property.id}`,
					type: 'property' as const
				};
			case 'analysis':
				return {
					title: `Market Analysis - ${property.address}`,
					text: `${baseText}\n\nMarket Analysis:\n• Price: $${property.price?.toLocaleString()}\n• Bedrooms: ${property.bedrooms}\n• Bathrooms: ${property.bathrooms}\n• Square Feet: ${property.squareFeet?.toLocaleString()}`,
					url: `${window.location.origin}/property/${property.id}/analysis`,
					type: 'report' as const
				};
			case 'proposal':
				return {
					title: `Marketing Proposal - ${property.address}`,
					text: `${baseText}\n\nMarketing Proposal:\n• Professional marketing strategy\n• Market positioning\n• Pricing recommendations\n• Timeline and next steps`,
					url: `${window.location.origin}/property/${property.id}/proposal`,
					type: 'proposal' as const
				};
			default:
				return {
					title: `Property - ${property.address}`,
					text: baseText,
					url: `${window.location.origin}/property/${property.id}`,
					type: 'property' as const
				};
		}
	}

	// Generate shareable content for marketing proposals
	static generateMarketingProposalShareContent(proposal: MarketingProposalSummary) {
		return {
			title: `Marketing Proposal - ${proposal.propertyAddress}`,
			text: `Marketing Proposal for ${proposal.propertyAddress}\n\nExecutive Summary:\n${proposal.executiveSummary}\n\nKey Highlights:\n• Market Analysis: ${proposal.marketAnalysis}\n• Pricing Strategy: ${proposal.pricingStrategy}\n• Marketing Plan: ${proposal.marketingPlan}`,
			url: `${window.location.origin}/proposal/${proposal.id}`,
			type: 'marketing' as const
		};
	}

	// Copy to clipboard
	static async copyToClipboard(text: string): Promise<boolean> {
		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(text);
				return true;
			} else {
				// Fallback for older browsers
				const textArea = document.createElement('textarea');
				textArea.value = text;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
				return true;
			}
		} catch (error) {
			console.error('Copy to clipboard failed:', error);
			return false;
		}
	}

	// Get share options based on device capabilities
	static getShareOptions() {
		const options = [
			{ id: 'native', label: 'Share', icon: 'share', available: !!navigator.share },
			{ id: 'email', label: 'Email', icon: 'email', available: true },
			{ id: 'sms', label: 'Text', icon: 'sms', available: true },
			{ id: 'copy', label: 'Copy Link', icon: 'content_copy', available: true }
		];

		return options.filter(option => option.available);
	}
}

export default ShareService;
