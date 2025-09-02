import React, { useState, useEffect } from 'react';
import QRCodeService from '../services/qrCodeService';
import { supabase } from '../services/supabase';

interface QRCode {
	id: string;
	title: string;
	description: string;
	destination: string;
	totalScans: number;
	createdAt: any;
	isActive: boolean;
}

interface QRStats {
	totalScans: number;
	uniqueUsers: number;
	totalQRCodes: number;
	topQRCodes: QRCode[];
	scansByDate: Record<string, number>;
}

const QRCodeManagementPage: React.FC = () => {
	const [user, setUser] = useState<any>(null);
	const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
	const [stats, setStats] = useState<QRStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newQRCode, setNewQRCode] = useState({
		title: '',
		description: '',
		destination: ''
	});

	useEffect(() => {
		let mounted = true
		supabase.auth.getUser().then(({ data }) => {
			if (!mounted) return
			setUser(data.user || null)
			if (data.user) loadQRData()
		})
		const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
			setUser(session?.user || null)
			if (session?.user) loadQRData()
		})
		return () => {
			mounted = false
			sub.subscription.unsubscribe()
		}
	}, [])

	const loadQRData = async () => {
		if (!user) return;
		
		try {
			setLoading(true);
			const dashboardStats = await QRCodeService.getDashboardStats(user.id);
			setStats(dashboardStats as QRStats);
			// Note: In a real app, you'd fetch QR codes from Firestore
			// For now, we'll use the top QR codes from analytics
			setQrCodes(dashboardStats.topQRCodes || []);
		} catch (error) {
			console.error('Error loading QR data:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateQRCode = async () => {
		if (!user || !newQRCode.title || !newQRCode.destination) return;

		try {
			const result = await QRCodeService.generateQRCode(
				newQRCode.destination,
				newQRCode.title,
				newQRCode.description,
				user.id
			);

			if (result.success) {
				setShowCreateModal(false);
				setNewQRCode({ title: '', description: '', destination: '' });
				loadQRData(); // Reload data
			}
		} catch (error) {
			console.error('Error creating QR code:', error);
		}
	};

	const handleUpdateDestination = async (qrCodeId: string, newDestination: string) => {
		if (!user) return;

		try {
			await QRCodeService.updateDestination(qrCodeId, newDestination, user.id);
			loadQRData(); // Reload data
		} catch (error) {
			console.error('Error updating destination:', error);
		}
	};

	const downloadQRCode = (qrCodeId: string, title: string) => {
		const qrImageUrl = QRCodeService.generateQRImageUrl(qrCodeId, 300);
		const link = document.createElement('a');
		link.href = qrImageUrl;
		link.download = `${title}-qr-code.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading QR Code Management...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">QR Code Management</h1>
					<p className="text-gray-600 mt-2">Create, track, and manage your QR codes</p>
				</div>

				{/* Stats Cards */}
				{stats && (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
						<div className="bg-white rounded-lg shadow p-6">
							<h3 className="text-sm font-medium text-gray-500">Total Scans</h3>
							<p className="text-3xl font-bold text-blue-600">{stats.totalScans}</p>
						</div>
						<div className="bg-white rounded-lg shadow p-6">
							<h3 className="text-sm font-medium text-gray-500">Unique Users</h3>
							<p className="text-3xl font-bold text-green-600">{stats.uniqueUsers}</p>
						</div>
						<div className="bg-white rounded-lg shadow p-6">
							<h3 className="text-sm font-medium text-gray-500">Total QR Codes</h3>
							<p className="text-3xl font-bold text-purple-600">{stats.totalQRCodes}</p>
						</div>
						<div className="bg-white rounded-lg shadow p-6">
							<h3 className="text-sm font-medium text-gray-500">Active QR Codes</h3>
							<p className="text-3xl font-bold text-orange-600">
								{qrCodes.filter(qr => qr.isActive).length}
							</p>
						</div>
					</div>
				)}

				{/* Create QR Code Button */}
				<div className="mb-6">
					<button
						onClick={() => setShowCreateModal(true)}
						className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
					>
						+ Create New QR Code
					</button>
				</div>

				{/* QR Codes List */}
				<div className="bg-white rounded-lg shadow">
					<div className="px-6 py-4 border-b border-gray-200">
						<h2 className="text-xl font-semibold text-gray-900">Your QR Codes</h2>
					</div>
					<div className="divide-y divide-gray-200">
						{qrCodes.length === 0 ? (
							<div className="px-6 py-12 text-center">
								<p className="text-gray-500">No QR codes created yet. Create your first one!</p>
							</div>
						) : (
							qrCodes.map((qrCode) => (
								<div key={qrCode.id} className="px-6 py-4">
									<div className="flex items-center justify-between">
										<div className="flex-1">
											<h3 className="text-lg font-medium text-gray-900">{qrCode.title}</h3>
											<p className="text-sm text-gray-500 mt-1">{qrCode.description}</p>
											<p className="text-sm text-blue-600 mt-1">{qrCode.destination}</p>
											<div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
												<span>Scans: {qrCode.totalScans}</span>
												<span>Created: {qrCode.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</span>
												<span className={`px-2 py-1 rounded-full text-xs ${
													qrCode.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
												}` }>
													{qrCode.isActive ? 'Active' : 'Inactive'}
												</span>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<button
												onClick={() => downloadQRCode(qrCode.id, qrCode.title)}
												className="text-blue-600 hover:text-blue-800 text-sm font-medium"
											>
												Download
											</button>
											<button
												onClick={() => {
													const newUrl = prompt('Enter new destination URL:', qrCode.destination);
													if (newUrl) {
														handleUpdateDestination(qrCode.id, newUrl);
													}
												}}
												className="text-green-600 hover:text-green-800 text-sm font-medium"
											>
												Edit
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{/* Create QR Code Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<h2 className="text-xl font-semibold mb-4">Create New QR Code</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Title
								</label>
								<input
									type="text"
									value={newQRCode.title}
									onChange={(e) => setNewQRCode({ ...newQRCode, title: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Enter QR code title"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<textarea
									value={newQRCode.description}
									onChange={(e) => setNewQRCode({ ...newQRCode, description: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									rows={3}
									placeholder="Enter description (optional)"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Destination URL
								</label>
								<input
									type="url"
									value={newQRCode.destination}
									onChange={(e) => setNewQRCode({ ...newQRCode, destination: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="https://example.com"
								/>
							</div>
						</div>
						<div className="flex justify-end space-x-3 mt-6">
							<button
								onClick={() => setShowCreateModal(false)}
								className="px-4 py-2 text-gray-600 hover:text-gray-800"
							>
								Cancel
							</button>
							<button
								onClick={handleCreateQRCode}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
							>
								Create QR Code
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default QRCodeManagementPage;
