import React, { useState } from 'react';
import QRCodeManagementPanel from '../components/QRCodeManagementPanel';
import ChatModal from '../components/ChatModal';

const AICardQRCodePage: React.FC = () => {
	const [showModal, setShowModal] = useState(false);

	const handleCreate = () => {
		setShowModal(true);
	};

	return (
		<section className="flex h-full flex-col space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold text-slate-900">AI Business Card QR Codes</h1>
					<p className="mt-1 text-sm text-slate-500">
						Generate QR codes that open your interactive AI card instantly from signs, postcards, or print collateral.
					</p>
				</div>
			</header>

			<QRCodeManagementPanel onCreate={handleCreate} />

			<ChatModal
				open={showModal}
				onClose={() => setShowModal(false)}
				title="QR code generation coming soon"
				subtitle="You’ll be able to create branded QR codes and route them to custom experiences."
			/>
		</section>
	);
};

export default AICardQRCodePage;

