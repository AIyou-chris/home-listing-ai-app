/**
 * Datafiniti Property API Service
 * Provides property data lookup and analysis functionality
 */

export interface DatafinitiProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  stories?: number;
  parking?: string;
  heating?: string;
  cooling?: string;
  fireplace?: boolean;
  pool?: boolean;
  garage?: boolean;
  basement?: boolean;
  attic?: boolean;
  priceHistory?: PriceHistory[];
  estimatedValue?: number;
  rentEstimate?: number;
  neighborhood?: string;
  schoolDistrict?: string;
  walkScore?: number;
  crimeScore?: number;
  photos?: string[];
  description?: string;
  features?: string[];
  lastUpdated: string;
}

export interface PriceHistory {
  date: string;
  price: number;
  event: string; // 'sale', 'listing', 'price_change'
}

export interface PropertySearchParams {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
  minPrice?: number;
  maxPrice?: number;
  radius?: number; // miles from lat/lng
  latitude?: number;
  longitude?: number;
}

export interface PropertyComparable {
  property: DatafinitiProperty;
  distance: number; // miles
  similarityScore: number; // 0-100
  priceDifference: number;
}

class DatafinitiService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.datafiniti.co/v4';

  constructor() {
    this.apiKey = import.meta.env.VITE_DATAFINITI_API_KEY || '';
    console.log('🔧 Datafiniti Service initialized');
    console.log('🔑 API Key status:', this.apiKey ? `Present (${this.apiKey.substring(0, 20)}...)` : 'Missing');
    if (!this.apiKey) {
      console.warn('⚠️ Datafiniti API key not found. Using mock data for demonstrations.');
    }
  }

  /**
   * Search for properties based on various criteria
   */
  async searchProperties(params: PropertySearchParams): Promise<DatafinitiProperty[]> {
    try {
      const query = this.buildSearchQuery(params);
      const response = await this.makeRequest('/properties/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          num_records: 50,
          format: 'JSON'
        })
      });

      return this.transformProperties(response.records || []);
    } catch (error) {
      console.error('Error searching properties:', error);
      throw new Error('Failed to search properties');
    }
  }

  /**
   * Get detailed property information by address
   */
  async getPropertyByAddress(address: string): Promise<DatafinitiProperty | null> {
    try {
      // If no API key or demo mode, return mock data for testing
      if (!this.apiKey || address.toLowerCase().includes('demo') || address.toLowerCase().includes('test')) {
        return this.getMockProperty(address);
      }
      
      console.log('🔍 Attempting real API search for:', address);
      
      // Try different search formats for better results
      const searchVariations = [
        { address: address }, // Full address
        { address: address.split(',')[0] }, // Just street address
      ];

      for (const searchParams of searchVariations) {
        console.log('🎯 Trying search params:', searchParams);
        const results = await this.searchProperties(searchParams);
        if (results.length > 0) {
          console.log('✅ Found results with params:', searchParams);
          return results[0];
        }
      }
      
      console.log('❌ No results found, falling back to mock data');
      return this.getMockProperty(address);
    } catch (error) {
      console.error('❌ Error getting property by address:', error);
      // Fallback to mock data if API fails
      return this.getMockProperty(address);
    }
  }

  /**
   * Generate mock property data for demo purposes
   */
  private getMockProperty(address: string): DatafinitiProperty {
    console.log('🏠 Generating mock property data for:', address);
    return {
      id: `demo_${Date.now()}`,
      address: address.includes('demo') ? '123 Demo Street' : address,
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'US',
      latitude: 39.7817,
      longitude: -89.6501,
      propertyType: 'single-family',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1850,
      lotSize: 8712,
      yearBuilt: 2015,
      stories: 2,
      parking: 'Attached Garage',
      heating: 'Forced Air',
      cooling: 'Central Air',
      fireplace: true,
      pool: false,
      garage: true,
      basement: false,
      attic: true,
      priceHistory: [
        { date: '2023-06-15', price: 385000, event: 'sale' },
        { date: '2023-05-20', price: 399000, event: 'listing' },
        { date: '2021-03-10', price: 350000, event: 'sale' }
      ],
      estimatedValue: 425000,
      rentEstimate: 2850,
      neighborhood: 'Lincoln Park',
      schoolDistrict: 'Springfield District 186',
      walkScore: 78,
      crimeScore: 85,
      photos: [
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop'
      ],
      description: 'Beautiful modern home in desirable Lincoln Park neighborhood. Features an open floor plan, updated kitchen with granite countertops, and spacious master suite.',
      features: ['Open Floor Plan', 'Granite Countertops', 'Master Suite', 'Hardwood Floors', 'Updated Kitchen'],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get comparable properties (comps) for a given property
   */
  async getComparables(
    property: DatafinitiProperty, 
    radius: number = 1, 
    limit: number = 10
  ): Promise<PropertyComparable[]> {
    try {
      // If no API key or demo mode, return mock comparables
      if (!this.apiKey || property.id.includes('demo')) {
        return this.getMockComparables(property, limit);
      }

      const params: PropertySearchParams = {
        latitude: property.latitude,
        longitude: property.longitude,
        radius,
        propertyType: property.propertyType,
        minBedrooms: Math.max(1, (property.bedrooms || 0) - 1),
        maxBedrooms: (property.bedrooms || 0) + 1,
        minBathrooms: Math.max(1, (property.bathrooms || 0) - 1),
        maxBathrooms: (property.bathrooms || 0) + 1,
        minSquareFeet: property.squareFeet ? Math.floor(property.squareFeet * 0.8) : undefined,
        maxSquareFeet: property.squareFeet ? Math.ceil(property.squareFeet * 1.2) : undefined
      };

      const comparables = await this.searchProperties(params);
      
      return comparables
        .filter(comp => comp.id !== property.id && comp.estimatedValue)
        .map(comp => ({
          property: comp,
          distance: this.calculateDistance(
            property.latitude, property.longitude,
            comp.latitude, comp.longitude
          ),
          similarityScore: this.calculateSimilarityScore(property, comp),
          priceDifference: (comp.estimatedValue || 0) - (property.estimatedValue || 0)
        }))
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting comparables:', error);
      return this.getMockComparables(property, limit);
    }
  }

  /**
   * Generate mock comparable properties for demo purposes
   */
  private getMockComparables(property: DatafinitiProperty, limit: number): PropertyComparable[] {
    const mockComps = [
      {
        id: 'comp_1',
        address: '456 Oak Avenue',
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        country: property.country,
        latitude: property.latitude + 0.002,
        longitude: property.longitude + 0.001,
        propertyType: property.propertyType,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: (property.squareFeet || 1800) + 50,
        estimatedValue: (property.estimatedValue || 400000) + 15000,
        features: ['Updated Kitchen', 'Hardwood Floors'],
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'comp_2',
        address: '789 Pine Street',
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        country: property.country,
        latitude: property.latitude - 0.001,
        longitude: property.longitude + 0.002,
        propertyType: property.propertyType,
        bedrooms: (property.bedrooms || 3) - 1,
        bathrooms: property.bathrooms,
        squareFeet: (property.squareFeet || 1800) - 100,
        estimatedValue: (property.estimatedValue || 400000) - 25000,
        features: ['Granite Countertops', 'Fireplace'],
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'comp_3',
        address: '321 Maple Drive',
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        country: property.country,
        latitude: property.latitude + 0.001,
        longitude: property.longitude - 0.001,
        propertyType: property.propertyType,
        bedrooms: (property.bedrooms || 3) + 1,
        bathrooms: (property.bathrooms || 2) + 1,
        squareFeet: (property.squareFeet || 1800) + 200,
        estimatedValue: (property.estimatedValue || 400000) + 35000,
        features: ['Master Suite', 'Pool', 'Updated Kitchen'],
        lastUpdated: new Date().toISOString()
      }
    ];

    return mockComps.slice(0, limit).map(comp => ({
      property: comp as DatafinitiProperty,
      distance: this.calculateDistance(
        property.latitude, property.longitude,
        comp.latitude, comp.longitude
      ),
      similarityScore: Math.floor(Math.random() * 25) + 75, // 75-100% similarity
      priceDifference: (comp.estimatedValue || 0) - (property.estimatedValue || 0)
    }));
  }

  /**
   * Get market trends for a specific area
   */
  async getMarketTrends(zipCode: string): Promise<{
    averagePrice: number;
    priceChange: number;
    averageDaysOnMarket: number;
    inventoryLevel: number;
    absorption: number;
  }> {
    try {
      const properties = await this.searchProperties({ zipCode });
      
      // Calculate basic market metrics
      const prices = properties
        .map(p => p.estimatedValue)
        .filter(p => p && p > 0) as number[];
      
      const averagePrice = prices.length > 0 
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
        : 0;

      // Mock trend data for now (in real implementation, would use historical data)
      return {
        averagePrice,
        priceChange: Math.random() * 20 - 10, // -10% to +10%
        averageDaysOnMarket: Math.floor(Math.random() * 60) + 30, // 30-90 days
        inventoryLevel: Math.floor(Math.random() * 100) + 50, // 50-150 properties
        absorption: Math.random() * 0.5 + 0.25 // 25-75% absorption rate
      };
    } catch (error) {
      console.error('Error getting market trends:', error);
      throw new Error('Failed to get market trends');
    }
  }

  /**
   * Make HTTP request to Datafiniti API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Datafiniti API key not configured');
    }

    console.log('🌐 Making API request to:', `${this.baseUrl}${endpoint}`);
    console.log('📤 Request options:', { ...options, headers: { ...options.headers, 'Authorization': 'Bearer [HIDDEN]' } });

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Datafiniti API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ API Response data:', data);
    return data;
  }

  /**
   * Build search query from parameters
   */
  private buildSearchQuery(params: PropertySearchParams): string {
    const conditions: string[] = [];

    if (params.address) conditions.push(`address:"${params.address}"`);
    if (params.city) conditions.push(`city:"${params.city}"`);
    if (params.state) conditions.push(`state:"${params.state}"`);
    if (params.zipCode) conditions.push(`zipCode:"${params.zipCode}"`);
    if (params.propertyType) conditions.push(`propertyType:"${params.propertyType}"`);
    
    if (params.minBedrooms) conditions.push(`bedrooms:[${params.minBedrooms} TO *]`);
    if (params.maxBedrooms) conditions.push(`bedrooms:[* TO ${params.maxBedrooms}]`);
    if (params.minBathrooms) conditions.push(`bathrooms:[${params.minBathrooms} TO *]`);
    if (params.maxBathrooms) conditions.push(`bathrooms:[* TO ${params.maxBathrooms}]`);
    if (params.minSquareFeet) conditions.push(`squareFeet:[${params.minSquareFeet} TO *]`);
    if (params.maxSquareFeet) conditions.push(`squareFeet:[* TO ${params.maxSquareFeet}]`);

    return conditions.length > 0 ? conditions.join(' AND ') : '*';
  }

  /**
   * Transform API response to our property interface
   */
  private transformProperties(records: any[]): DatafinitiProperty[] {
    return records.map(record => ({
      id: record.id || `${record.address}_${record.zipCode}`,
      address: record.address || '',
      city: record.city || '',
      state: record.state || '',
      zipCode: record.zipCode || '',
      country: record.country || 'US',
      latitude: record.latitude || 0,
      longitude: record.longitude || 0,
      propertyType: record.propertyType || 'residential',
      bedrooms: record.bedrooms,
      bathrooms: record.bathrooms,
      squareFeet: record.squareFeet,
      lotSize: record.lotSize,
      yearBuilt: record.yearBuilt,
      stories: record.stories,
      parking: record.parking,
      heating: record.heating,
      cooling: record.cooling,
      fireplace: record.fireplace,
      pool: record.pool,
      garage: record.garage,
      basement: record.basement,
      attic: record.attic,
      priceHistory: record.priceHistory || [],
      estimatedValue: record.estimatedValue,
      rentEstimate: record.rentEstimate,
      neighborhood: record.neighborhood,
      schoolDistrict: record.schoolDistrict,
      walkScore: record.walkScore,
      crimeScore: record.crimeScore,
      photos: record.photos || [],
      description: record.description,
      features: record.features || [],
      lastUpdated: record.lastUpdated || new Date().toISOString()
    }));
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculate similarity score between two properties
   */
  private calculateSimilarityScore(prop1: DatafinitiProperty, prop2: DatafinitiProperty): number {
    let score = 0;
    let factors = 0;

    // Bedroom similarity
    if (prop1.bedrooms && prop2.bedrooms) {
      const bedroomDiff = Math.abs(prop1.bedrooms - prop2.bedrooms);
      score += Math.max(0, 20 - bedroomDiff * 5);
      factors += 20;
    }

    // Bathroom similarity
    if (prop1.bathrooms && prop2.bathrooms) {
      const bathroomDiff = Math.abs(prop1.bathrooms - prop2.bathrooms);
      score += Math.max(0, 20 - bathroomDiff * 5);
      factors += 20;
    }

    // Square feet similarity
    if (prop1.squareFeet && prop2.squareFeet) {
      const sizeDiff = Math.abs(prop1.squareFeet - prop2.squareFeet) / prop1.squareFeet;
      score += Math.max(0, 20 - sizeDiff * 100);
      factors += 20;
    }

    // Year built similarity
    if (prop1.yearBuilt && prop2.yearBuilt) {
      const yearDiff = Math.abs(prop1.yearBuilt - prop2.yearBuilt);
      score += Math.max(0, 20 - yearDiff / 2);
      factors += 20;
    }

    // Property type match
    if (prop1.propertyType === prop2.propertyType) {
      score += 20;
    }
    factors += 20;

    return factors > 0 ? Math.round(score / factors * 100) : 0;
  }
}

export const datafiniti = new DatafinitiService();
export default datafiniti;
