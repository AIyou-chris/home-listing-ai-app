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

const drawLabelValue = (pdf: jsPDF, label: string, value: string, x: number, y: number, width: number) => {
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(8);
  pdf.text(label.toUpperCase(), x, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  const lines = pdf.splitTextToSize(value, width);
  pdf.text(lines, x, y + 5);
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
    pdf.addImage(heroData, 'JPEG', 14, 38, pageWidth - 28, 60);
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
  pdf.text(property.address || 'Address pending', 24, 106);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(safeMoney(property.price), pageWidth - 24, 101, { align: 'right' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${property.bedrooms} bed • ${property.bathrooms} bath • ${property.squareFeet.toLocaleString()} sq ft`, pageWidth - 24, 107, { align: 'right' });

  drawLabelValue(pdf, 'Executive Summary', executiveSummary, 14, 132, 118);

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(136, 128, 60, 52, 3, 3, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(136, 128, 60, 52, 3, 3, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primary.r, primary.g, primary.b);
  pdf.setFontSize(11);
  pdf.text('Market Snapshot', 140, 136);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Avg $/sqft: ${safeMoney(marketSnapshot.avgPricePerSqft)}`, 140, 144);
  pdf.text(`Median DOM: ${marketSnapshot.medianDom} days`, 140, 150);
  pdf.text(`Active Listings: ${marketSnapshot.activeListings}`, 140, 156);
  pdf.text(`List-to-Close: ${safePercent(marketSnapshot.listToCloseRatio)}`, 140, 162);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(8);
  pdf.text('Agent Action Plan', 14, 188);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10);
  let actionY = 194;
  actionPlan.slice(0, 5).forEach((item) => {
    const text = pdf.splitTextToSize(`• ${item}`, 116);
    pdf.text(text, 14, actionY);
    actionY += text.length * 5;
  });

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(136, 184, 60, 78, 3, 3, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(136, 184, 60, 78, 3, 3, 'S');

  if (headshotCircle) {
    pdf.addImage(headshotCircle, 'PNG', 156, 190, 20, 20);
  } else {
    pdf.setDrawColor(203, 213, 225);
    pdf.circle(166, 200, 10, 'S');
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(agentProfile.name || 'Listing Agent', 166, 214, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(agentProfile.title || 'Real Estate Advisor', 166, 219, { align: 'center' });

  pdf.addImage(qrData, 'PNG', 148, 224, 36, 36);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(primary.r, primary.g, primary.b);
  pdf.text('Scan for Listing + Lead Capture', 166, 263, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  const disclaimer = pdf.splitTextToSize(input.disclaimer || DEFAULT_LISTING_REPORT_DISCLAIMER, pageWidth - 28);
  pdf.text(disclaimer, 14, 275);

  const nameSeed = slugify(property.title || property.address || 'listing-report');
  pdf.save(`${nameSeed}-market-report.pdf`);
};
