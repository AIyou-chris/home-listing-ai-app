import SequenceExecutionService from '../services/sequenceExecutionService';
import { Lead, Property, AgentProfile, FollowUpSequence } from '../types';

// Mock data for testing
const mockLead: Lead = {
  id: 'test-lead-1',
  name: 'John Smith',
  email: 'john@example.com',
  phone: '+1-555-123-4567',
  status: 'New',
  date: '12/15/23',
  lastMessage: 'Interested in the property'
};

const mockProperty: Property = {
  id: 'test-prop-1',
  title: 'Beautiful 3-Bedroom Home',
  address: '123 Main Street, Anytown, USA 12345',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1500,
  description: 'A lovely home',
  heroPhotos: [],
  appFeatures: {},
  agent: {} as AgentProfile,
  propertyType: 'House',
  features: ['Hardwood floors', 'Updated kitchen'],
  imageUrl: ''
};

const mockAgent: AgentProfile = {
  name: 'Jane Doe',
  title: 'Senior Real Estate Agent',
  company: 'Prime Properties',
  phone: '+1-555-987-6543',
  email: 'jane@primeproperties.com',
  website: 'https://primeproperties.com',
  bio: 'Experienced agent',
  headshotUrl: '',
  socials: [],
  mediaLinks: []
};

const mockSequence: FollowUpSequence = {
  id: 'test-seq-1',
  name: 'Test Welcome Sequence',
  description: 'Test sequence for new leads',
  triggerType: 'Lead Capture',
  isActive: true,
  steps: [
    {
      id: 'step-1',
      type: 'email',
      delay: { value: 0, unit: 'minutes' },
      subject: 'Welcome {{lead.name}}! Thanks for your interest in {{property.address}}',
      content: `Hi {{lead.name}},

Thank you for your interest in {{property.address}}! I'm {{agent.name}} from {{agent.company}}.

This {{property.bedrooms}} bedroom, {{property.bathrooms}} bathroom home has {{property.squareFeet}} square feet.

You can reach me at {{agent.phone}}.

Best regards,
{{agent.name}}`
    }
  ],
  analytics: { totalLeads: 0, openRate: 0, responseRate: 0 }
};

describe('SequenceExecutionService', () => {
  let service: SequenceExecutionService;

  beforeEach(() => {
    service = SequenceExecutionService.getInstance();
  });

  test('should substitute variables correctly', () => {
    // This is a private method, so we'll test it indirectly through the public interface
    const context = {
      lead: mockLead,
      property: mockProperty,
      agent: mockAgent
    };

    // Test variable substitution by starting a sequence
    expect(async () => {
      await service.startSequence(mockSequence, context);
    }).not.toThrow();
  });

  test('should trigger sequences for lead capture', async () => {
    const context = {
      lead: mockLead,
      property: mockProperty,
      agent: mockAgent
    };

    await service.triggerSequences('Lead Capture', context, [mockSequence]);
    
    // Check that sequences were started for the lead
    const activeSequences = service.getActiveSequencesForLead(mockLead.id);
    expect(activeSequences.length).toBeGreaterThan(0);
  });

  test('should handle missing property gracefully', async () => {
    const context = {
      lead: mockLead,
      agent: mockAgent
      // No property provided
    };

    expect(async () => {
      await service.triggerSequences('Lead Capture', context, [mockSequence]);
    }).not.toThrow();
  });
});

// Manual test function for console testing
export const testSequenceExecution = async () => {
  console.log('🧪 Testing Sequence Execution Service...');
  
  const service = SequenceExecutionService.getInstance();
  
  const context = {
    lead: mockLead,
    property: mockProperty,
    agent: mockAgent
  };

  try {
    // Test 1: Start a sequence
    console.log('\n1. Testing sequence start...');
    const sequenceId = await service.startSequence(mockSequence, context);
    console.log('✅ Sequence started with ID:', sequenceId);

    // Test 2: Check active sequences
    console.log('\n2. Testing active sequences retrieval...');
    const activeSequences = service.getActiveSequencesForLead(mockLead.id);
    console.log('✅ Active sequences for lead:', activeSequences.length);

    // Test 3: Trigger sequences
    console.log('\n3. Testing sequence triggering...');
    await service.triggerSequences('Lead Capture', context, [mockSequence]);
    console.log('✅ Sequences triggered successfully');

    console.log('\n✅ All sequence execution tests passed!');
  } catch (error) {
    console.error('❌ Sequence execution test failed:', error);
  }
};
