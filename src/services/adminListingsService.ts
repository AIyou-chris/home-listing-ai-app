import { AuthService } from './authService';

const auth = AuthService.getInstance();

export type AdminListing = {
  listing_id: string;
  property_type?: string;
  address?: string;
  price?: number;
  status?: string;
  ai_summary?: string;
  ai_recommendation_score?: number;
  hero_image?: string | null;
  public_slug?: string | null;
  published?: boolean;
  owner_id?: string | null;
  agent?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  created_at?: string;
  updated_at?: string;
};

export const adminListingsService = {
  async list(): Promise<AdminListing[]> {
    const response = await auth.makeAuthenticatedRequest('/api/admin/listings');
    if (!response.ok) {
      throw new Error(`Failed to load listings (${response.status})`);
    }
    const data = await response.json();
    return Array.isArray(data?.listings) ? (data.listings as AdminListing[]) : (Array.isArray(data) ? data as AdminListing[] : []);
  },

  async remove(listingId: string): Promise<void> {
    const response = await auth.makeAuthenticatedRequest(`/api/admin/listings/${listingId}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Failed to delete listing (${response.status})`);
    }
  },

  async create(payload: Partial<AdminListing>): Promise<AdminListing> {
    const response = await auth.makeAuthenticatedRequest('/api/admin/listings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to create listing (${response.status})`);
    }
    const data = await response.json();
    return (data?.listing as AdminListing) ?? (data as AdminListing);
  }
};

export type { AdminListing as AdminListingModel };
