import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

// QR Code Tracking Service
export class QRCodeService {
	// Track QR code scan
	static async trackScan(qrCodeId: string, userId?: string, userAgent?: string, location?: any) {
		try {
			const trackQRScan = httpsCallable(functions, 'trackQRScan');
			const result = await trackQRScan({
				qrCodeId,
				userId,
				userAgent,
				location,
				timestamp: new Date()
			});
			return result.data;
		} catch (error) {
			console.error('Error tracking QR scan:', error);
			throw error;
		}
	}

	// Generate custom QR code
	static async generateQRCode(destination: string, title: string, description: string, userId: string, customData?: any) {
		try {
			const generateQRCode = httpsCallable(functions, 'generateQRCode');
			const result = await generateQRCode({
				destination,
				title,
				description,
				userId,
				customData
			});
			return result.data;
		} catch (error) {
			console.error('Error generating QR code:', error);
			throw error;
		}
	}

	// Get QR code analytics
	static async getAnalytics(userId: string, qrCodeId?: string, timeRange?: string) {
		try {
			const getQRAnalytics = httpsCallable(functions, 'getQRAnalytics');
			const result = await getQRAnalytics({
				userId,
				qrCodeId,
				timeRange
			});
			return result.data;
		} catch (error) {
			console.error('Error getting QR analytics:', error);
			throw error;
		}
	}

	// Update QR code destination
	static async updateDestination(qrCodeId: string, newDestination: string, userId: string) {
		try {
			const updateQRDestination = httpsCallable(functions, 'updateQRDestination');
			const result = await updateQRDestination({
				qrCodeId,
				newDestination,
				userId
			});
			return result.data;
		} catch (error) {
			console.error('Error updating QR destination:', error);
			throw error;
		}
	}

	// Generate QR code image URL (using external service)
	static generateQRImageUrl(qrCodeId: string, size: number = 200): string {
		const baseUrl = `https://your-domain.com/qr/${qrCodeId}`;
		return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(baseUrl)}`;
	}

	// Get QR code statistics for dashboard
	static async getDashboardStats(userId: string) {
		try {
			const analytics = await this.getAnalytics(userId, undefined, '30d');
			return {
				totalScans: analytics.analytics.totalScans,
				uniqueUsers: analytics.analytics.uniqueUsers,
				totalQRCodes: analytics.analytics.totalQRCodes,
				topQRCodes: analytics.analytics.topQRCodes,
				scansByDate: analytics.analytics.scansByDate
			};
		} catch (error) {
			console.error('Error getting dashboard stats:', error);
			return {
				totalScans: 0,
				uniqueUsers: 0,
				totalQRCodes: 0,
				topQRCodes: [],
				scansByDate: {}
			};
		}
	}
}

export default QRCodeService;
