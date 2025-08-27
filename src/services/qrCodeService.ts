import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Typed request/response shapes
type TrackScanReq = { qrCodeId: string; userId?: string; userAgent?: string; location?: any; timestamp: string };
type TrackScanRes = { success: boolean; message?: string };

type GenerateQRCodeReq = { destination: string; title: string; description: string; userId: string; customData?: any };
export type GenerateQRCodeRes = { success: boolean; qrCode?: { id: string; url: string; title: string; description?: string; destination: string; createdAt?: string; isActive?: boolean }; message?: string };

type GetQRAnalyticsReq = { userId: string; qrCodeId?: string; timeRange?: string };
export type GetQRAnalyticsRes = { success?: boolean; analytics: { totalScans: number; uniqueUsers: number; totalQRCodes: number; topQRCodes: any[]; scansByDate: Record<string, number> } };

type UpdateQRDestinationReq = { qrCodeId: string; newDestination: string; userId: string };
type UpdateQRDestinationRes = { success: boolean; message?: string };

// QR Code Tracking Service
export class QRCodeService {
  // Track QR code scan
  static async trackScan(qrCodeId: string, userId?: string, userAgent?: string, location?: any): Promise<TrackScanRes> {
    try {
      const trackQRScan = httpsCallable<TrackScanReq, TrackScanRes>(functions, 'trackQRScan');
      const { data } = await trackQRScan({
        qrCodeId,
        userId,
        userAgent,
        location,
        timestamp: new Date().toISOString(),
      });
      return data;
    } catch (error) {
      console.error('Error tracking QR scan:', error);
      throw error;
    }
  }

  // Generate custom QR code
  static async generateQRCode(destination: string, title: string, description: string, userId: string, customData?: any): Promise<GenerateQRCodeRes> {
    try {
      const generateQRCode = httpsCallable<GenerateQRCodeReq, GenerateQRCodeRes>(functions, 'generateQRCode');
      const { data } = await generateQRCode({ destination, title, description, userId, customData });
      return data;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Get QR code analytics
  static async getAnalytics(userId: string, qrCodeId?: string, timeRange?: string): Promise<GetQRAnalyticsRes> {
    try {
      const getQRAnalytics = httpsCallable<GetQRAnalyticsReq, GetQRAnalyticsRes>(functions, 'getQRAnalytics');
      const { data } = await getQRAnalytics({ userId, qrCodeId, timeRange });
      return data;
    } catch (error) {
      console.error('Error getting QR analytics:', error);
      throw error;
    }
  }

  // Update QR code destination
  static async updateDestination(qrCodeId: string, newDestination: string, userId: string): Promise<UpdateQRDestinationRes> {
    try {
      const updateQRDestination = httpsCallable<UpdateQRDestinationReq, UpdateQRDestinationRes>(functions, 'updateQRDestination');
      const { data } = await updateQRDestination({ qrCodeId, newDestination, userId });
      return data;
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
        scansByDate: analytics.analytics.scansByDate,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return { totalScans: 0, uniqueUsers: 0, totalQRCodes: 0, topQRCodes: [], scansByDate: {} };
    }
  }
}

export default QRCodeService;
