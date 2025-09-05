interface AICardProfile {
  id: string;
  fullName: string;
  professionalTitle: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  bio: string;
  brandColor: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    youtube: string;
  };
  headshot: string | null;
  logo: string | null;
  created_at?: string;
  updated_at?: string;
}

interface QRCodeResponse {
  qrCode: string;
  url: string;
  profileId: string;
}

interface ShareResponse {
  url: string;
  text: string;
  method: string;
  recipient?: string;
  timestamp: string;
}

// Get AI Card profile
export const getAICardProfile = async (userId?: string): Promise<AICardProfile> => {
  try {
    const queryParams = userId ? `?userId=${userId}` : '';
    const response = await fetch(`/api/ai-card/profile${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const profile = await response.json();
    console.log('✅ Retrieved AI Card profile');
    return profile;
  } catch (error) {
    console.error('Error getting AI Card profile:', error);
    throw error;
  }
};

// Create new AI Card profile
export const createAICardProfile = async (profileData: Omit<AICardProfile, 'id' | 'created_at' | 'updated_at'>, userId?: string): Promise<AICardProfile> => {
  try {
    const response = await fetch('/api/ai-card/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        ...profileData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const profile = await response.json();
    console.log('✅ Created AI Card profile');
    return profile;
  } catch (error) {
    console.error('Error creating AI Card profile:', error);
    throw error;
  }
};

// Update AI Card profile
export const updateAICardProfile = async (profileData: Partial<AICardProfile>, userId?: string): Promise<AICardProfile> => {
  try {
    const response = await fetch('/api/ai-card/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        ...profileData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const profile = await response.json();
    console.log('✅ Updated AI Card profile');
    return profile;
  } catch (error) {
    console.error('Error updating AI Card profile:', error);
    throw error;
  }
};

// Generate QR Code for AI Card
export const generateQRCode = async (userId?: string, cardUrl?: string): Promise<QRCodeResponse> => {
  try {
    const response = await fetch('/api/ai-card/generate-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        cardUrl
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const qrData = await response.json();
    console.log('✅ Generated QR code for AI Card');
    return qrData;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Share AI Card
export const shareAICard = async (method: string, userId?: string, recipient?: string): Promise<ShareResponse> => {
  try {
    const response = await fetch('/api/ai-card/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        method,
        recipient
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const shareData = await response.json();
    console.log('✅ Shared AI Card');
    return shareData;
  } catch (error) {
    console.error('Error sharing AI Card:', error);
    throw error;
  }
};

// Download AI Card as image (using html2canvas)
export const downloadAICard = async (elementId: string, filename?: string): Promise<void> => {
  try {
    // Dynamic import to avoid bundling html2canvas if not needed
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('AI Card element not found');
    }
    
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true
    });
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `ai-card-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Downloaded AI Card as image');
      }
    }, 'image/png');
  } catch (error) {
    console.error('Error downloading AI Card:', error);
    throw error;
  }
};

export type { AICardProfile, QRCodeResponse, ShareResponse };
