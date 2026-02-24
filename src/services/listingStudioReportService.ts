import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { AgentProfile, Property } from '../types';

export interface ListingStudioTheme {
  primary: string;
  accent: string;
}

export interface ListingStudioMarketSnapshot {
  avgPricePerSqft: number;
  medianDom: number;
  activeListings: number;
  listToCloseRatio: number;
}

export interface ListingStudioReportInput {
  property: Property;
  agentProfile: AgentProfile;
  theme: ListingStudioTheme;
  qrDestinationUrl: string;
  executiveSummary: string;
  actionPlan: string[];
  marketSnapshot: ListingStudioMarketSnapshot;
  disclaimer?: string;
  agentHeadshotUrl?: string;
  showMockBadge?: boolean;
}

export const DEFAULT_LISTING_REPORT_DISCLAIMER =
  'This report is for marketing and educational use only. Market metrics are estimated from public and user-provided inputs and are not an appraisal, legal advice, or a guarantee of performance. Verify material facts, fair-housing compliance, and all pricing decisions with licensed professionals and MLS/local regulations.';

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { r: 35, g: 48, b: 116 };
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const safeMoney = (value: number) =>
  Number.isFinite(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) : '$0';

const safePercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;

const getImageType = (dataUrl: string): 'PNG' | 'JPEG' => (dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG');

const toDataUrl = async (url: string): Promise<string | null> => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (_error) {
    return null;
  }
};

const makeCircleImage = async (sourceDataUrl: string, size = 256): Promise<string | null> => {
  if (!sourceDataUrl) return null;
  return await new Promise<string | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const scale = Math.max(size / img.width, size / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = (size - drawWidth) / 2;
      const y = (size - drawHeight) / 2;
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      ctx.restore();
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = sourceDataUrl;
  });
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const drawBar = (pdf: jsPDF, x: number, y: number, width: number, height: number, progress: number, color: { r: number; g: number; b: number }) => {
  const pct = clamp(progress, 0, 100);
  pdf.setFillColor(226, 232, 240);
  pdf.roundedRect(x, y, width, height, 2, 2, 'F');
  pdf.setFillColor(color.r, color.g, color.b);
  pdf.roundedRect(x, y, (width * pct) / 100, height, 2, 2, 'F');
};

const truncateLines = (lines: string[], maxLines: number) => {
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  const last = clipped[maxLines - 1] || '';
  clipped[maxLines - 1] = last.length > 2 ? `${last.slice(0, -2)}...` : `${last}...`;
  return clipped;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export const generateListingStudioPdf = async (input: ListingStudioReportInput): Promise<void> => {
  const { property, agentProfile, theme, qrDestinationUrl, executiveSummary, actionPlan, marketSnapshot } = input;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();

  const primary = hexToRgb(theme.primary);
  const accent = hexToRgb(theme.accent);
  const heroUrl = (Array.isArray(property.heroPhotos) ? property.heroPhotos.find((item): item is string => typeof item === 'string') : null) || '';
  const heroData = heroUrl ? await toDataUrl(heroUrl) : null;
  const headshotUrl = input.agentHeadshotUrl || agentProfile.headshotUrl || '/demo-headshot.png';
  const headshotRaw = await toDataUrl(headshotUrl);
  const headshotCircle = headshotRaw ? await makeCircleImage(headshotRaw, 240) : null;
  const qrData = await QRCode.toDataURL(qrDestinationUrl, {
    width: 320,
    margin: 1,
    color: {
      dark: theme.primary,
      light: '#FFFFFF'
    }
  });

  pdf.setFillColor(primary.r, primary.g, primary.b);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.text('HomeListingAI • Market Intelligence Report', 14, 12);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 14, 19);
  pdf.text(agentProfile.name || 'Listing Agent', pageWidth - 14, 19, { align: 'right' });

  pdf.setFillColor(accent.r, accent.g, accent.b);
  pdf.rect(0, 30, pageWidth, 4, 'F');

  if (heroData) {
    pdf.addImage(heroData, getImageType(heroData), 14, 38, pageWidth - 28, 60);
  } else {
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(14, 38, pageWidth - 28, 60, 3, 3, 'F');
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Property Photo Preview', pageWidth / 2, 69, { align: 'center' });
  }

  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(20, 90, pageWidth - 40, 32, 4, 4, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(20, 90, pageWidth - 40, 32, 4, 4, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(14);
  pdf.text(property.title || 'Listing Overview', 24, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const addressLine = pdf.splitTextToSize(property.address || 'Address pending', 92);
  pdf.text(addressLine, 24, 106);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(safeMoney(property.price), pageWidth - 24, 101, { align: 'right' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${property.bedrooms} bed • ${property.bathrooms} bath • ${property.squareFeet.toLocaleString()} sq ft`, pageWidth - 24, 107, { align: 'right' });

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, 128, 118, 60, 3, 3, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(8);
  pdf.text('EXECUTIVE SUMMARY', 18, 135);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10);
  const summaryLines = truncateLines(pdf.splitTextToSize(executiveSummary, 110), 11);
  pdf.text(summaryLines, 18, 141);

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(136, 128, 60, 58, 3, 3, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(136, 128, 60, 58, 3, 3, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primary.r, primary.g, primary.b);
  pdf.setFontSize(11);
  pdf.text('Market Snapshot', 140, 136);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Avg $/sqft: ${safeMoney(marketSnapshot.avgPricePerSqft)}`, 140, 143);
  pdf.text(`Median DOM: ${marketSnapshot.medianDom} days`, 140, 149);
  pdf.text(`Active Listings: ${marketSnapshot.activeListings}`, 140, 155);
  pdf.text(`List-to-Close: ${safePercent(marketSnapshot.listToCloseRatio)}`, 140, 161);

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(136, 188, 60, 34, 3, 3, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(136, 188, 60, 34, 3, 3, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primary.r, primary.g, primary.b);
  pdf.setFontSize(9);
  pdf.text('Market Momentum', 140, 194);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  const demand = clamp((marketSnapshot.activeListings / 250) * 100, 0, 100);
  const velocity = clamp(100 - marketSnapshot.medianDom * 1.8, 0, 100);
  const conversion = clamp(marketSnapshot.listToCloseRatio, 0, 100);
  pdf.text('Demand', 140, 199);
  drawBar(pdf, 153, 196.5, 39, 3.5, demand, accent);
  pdf.text('Velocity', 140, 206);
  drawBar(pdf, 153, 203.5, 39, 3.5, velocity, primary);
  pdf.text('Conversion', 140, 213);
  drawBar(pdf, 153, 210.5, 39, 3.5, conversion, accent);

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, 192, 118, 74, 3, 3, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(8);
  pdf.text('AGENT ACTION PLAN', 18, 199);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10);
  let actionY = 206;
  actionPlan.slice(0, 5).forEach((item) => {
    const text = truncateLines(pdf.splitTextToSize(`• ${item}`, 110), 3);
    pdf.text(text, 18, actionY);
    actionY += text.length * 5;
  });

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(136, 224, 60, 42, 3, 3, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(136, 224, 60, 42, 3, 3, 'S');

  if (headshotCircle) {
    pdf.addImage(headshotCircle, 'PNG', 141, 229, 14, 14);
  } else {
    pdf.setDrawColor(203, 213, 225);
    pdf.circle(148, 236, 7, 'S');
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(agentProfile.name || 'Listing Agent', 170, 232);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(agentProfile.title || 'Real Estate Advisor', 170, 236);

  pdf.addImage(qrData, 'PNG', 170, 228, 22, 22);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(primary.r, primary.g, primary.b);
  pdf.text('Scan for Lead Capture', 181, 254, { align: 'center' });

  if (input.showMockBadge) {
    pdf.setFillColor(accent.r, accent.g, accent.b);
    pdf.roundedRect(pageWidth - 52, 10, 38, 9, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('DEMO DATA', pageWidth - 33, 15.7, { align: 'center' });
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  const disclaimer = pdf.splitTextToSize(input.disclaimer || DEFAULT_LISTING_REPORT_DISCLAIMER, pageWidth - 28);
  pdf.text(disclaimer, 14, 274);

  const nameSeed = slugify(property.title || property.address || 'listing-report');
  pdf.save(`${nameSeed}-market-report.pdf`);
};
