import React, { useState } from 'react';
import ShareService from '../services/shareService';

interface ShareModalProps {
	isOpen: boolean;
	onClose: () => void;
	content: {
		title: string;
		text: string;
		url?: string;
		type: 'property' | 'proposal' | 'report' | 'marketing';
	};
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, content }) => {
	const [isSharing, setIsSharing] = useState(false);
	const [shareMethod, setShareMethod] = useState<string>('');
	const [showSuccess, setShowSuccess] = useState(false);

	const shareOptions = ShareService.getShareOptions();

	const handleShare = async (method: string) => {
		setIsSharing(true);
		setShareMethod(method);

		try {
			let result;

			switch (method) {
				case 'native':
					result = await ShareService.shareContent(content);
					break;
				case 'email':
					result = ShareService.shareViaEmail(content);
					break;
				case 'sms':
					result = ShareService.shareViaText(content);
					break;
				case 'copy': {
					const success = await ShareService.copyToClipboard(content.url || window.location.href);
					result = { success, method: 'copy' };
					break;
				}
				default:
					result = await ShareService.shareContent(content);
			}

			if (result.success) {
				setShowSuccess(true);
				setTimeout(() => {
					setShowSuccess(false);
					onClose();
				}, 2000);
			}
		} catch (error) {
			console.error('Share failed:', error);
		} finally {
			setIsSharing(false);
			setShareMethod('');
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-200">
					<h2 className="text-xl font-bold text-slate-900">Share Content</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 transition-colors"
					>
						<span className="material-symbols-outlined text-2xl">close</span>
					</button>
				</div>

				{/* Content Preview */}
				<div className="p-6 border-b border-slate-200">
					<h3 className="font-semibold text-slate-900 mb-2">{content.title}</h3>
					<p className="text-slate-600 text-sm line-clamp-3">
						{content.text.substring(0, 150)}...
					</p>
				</div>

				{/* Share Options */}
				<div className="p-6">
					<div className="grid grid-cols-2 gap-4">
						{shareOptions.map((option) => (
							<button
								key={option.id}
								onClick={() => handleShare(option.id)}
								disabled={isSharing}
								className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
									isSharing && shareMethod === option.id
										? 'border-blue-500 bg-blue-50'
										: 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
								} disabled:opacity-50 disabled:cursor-not-allowed`}
							>
								<span className="material-symbols-outlined text-2xl text-slate-600 mb-2">
									{option.icon}
								</span>
								<span className="text-sm font-medium text-slate-700">
									{isSharing && shareMethod === option.id ? 'Sharing...' : option.label}
								</span>
							</button>
						))}
					</div>

					{/* Success Message */}
					{showSuccess && (
						<div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
							<div className="flex items-center">
								<span className="material-symbols-outlined text-green-600 mr-2">
									check_circle
								</span>
								<span className="text-green-800 text-sm">
									{shareMethod === 'copy' ? 'Link copied to clipboard!' : 'Content shared successfully!'}
								</span>
							</div>
						</div>
					)}

					{/* Additional Info */}
					<div className="mt-6 text-center">
						<p className="text-xs text-slate-500">
							{shareMethod === 'native' 
								? 'Opens your device\'s native share menu'
								: shareMethod === 'email'
								? 'Opens your default email app'
								: shareMethod === 'sms'
								? 'Opens your default messaging app'
								: 'Choose how you\'d like to share this content'
							}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ShareModal;
