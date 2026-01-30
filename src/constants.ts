import { School, Lead, Appointment, Interaction, Conversation, SocialPost, AgentProfile, AIVoice, KnowledgeBasePriority, PersonalityTest, AIAssignment } from './types';
import type { AgentTask, AIPersonality } from './types';

export const EMPTY_AGENT: AgentProfile = {
    name: '',
    slug: '',
    title: '',
    company: '',
    phone: '',
    email: '',
    headshotUrl: undefined,
    socials: [],
    brandColor: '#0ea5e9',
    language: 'en',
    logoUrl: undefined,
    website: '',
    bio: ''
};

export const SAMPLE_AGENT: AgentProfile = {
    name: 'Sarah Johnson',
    slug: 'sarah-johnson',
    title: 'Luxury Real Estate Specialist',
    company: 'Prestige Properties',
    phone: '(305) 555-1234',
    email: 'sarah.j@prestigeprop.com',
    headshotUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop',
    socials: [
        { platform: 'Twitter', url: 'https://twitter.com' },
        { platform: 'LinkedIn', url: 'https://linkedin.com' },
    ],
    brandColor: '#0ea5e9', // a nice sky blue
    language: 'en',
    logoUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=200&h=80&auto=format&fit=crop&crop=center', // Professional real estate logo placeholder
    website: 'https://prestigeproperties.com',
    bio: 'With over 15 years of experience in the luxury market, Sarah Johnson combines deep market knowledge with a passion for client success. Her dedication and expertise make her a trusted advisor for buyers and sellers of distinguished properties.'
};

export const DEMO_AI_CARD_PROFILE = {
    id: 'demo-ai-card',
    fullName: 'Sarah Johnson',
    professionalTitle: 'Luxury Real Estate Specialist',
    company: 'Prestige Properties',
    phone: '(305) 555-1234',
    email: 'sarah.j@prestigeprop.com',
    website: 'https://prestigeproperties.com',
    bio: 'With over 15 years of experience in the luxury market, Sarah Johnson combines deep market knowledge with a passion for client success. Her dedication and expertise make her a trusted advisor for buyers and sellers of distinguished properties.',
    brandColor: '#0ea5e9',
    language: 'en',
    socialMedia: {
        facebook: 'https://facebook.com/sarahjohnsonrealestate',
        instagram: 'https://instagram.com/sarahjohnson_realtor',
        twitter: 'https://twitter.com/sarahjrealtor',
        linkedin: 'https://linkedin.com/in/sarah-johnson-realtor',
        youtube: 'https://youtube.com/@sarahjohnsonhomes'
    },
    headshot: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&h=400&auto=format&fit=crop',
    logo: '/newlogo.png'
};

export const SAMPLE_SCHOOLS: School[] = [
    { name: 'Bayview Elementary School', type: 'Public', grades: 'K-5', rating: 4.5, distance: 1.2 },
    { name: 'Sunset Middle School', type: 'Public', grades: '6-8', rating: 4.2, distance: 2.5 },
    { name: 'Oceanfront High School', type: 'Public', grades: '9-12', rating: 4.8, distance: 3.1 },
    { name: 'St. Mary\'s Preparatory', type: 'Private', grades: 'K-12', rating: 4.9, distance: 4.5 },
];


export const SAMPLE_LEADS: Lead[] = [];

export const SAMPLE_APPOINTMENTS: Appointment[] = [
    { id: 'appt1', type: 'Showing', date: '08/16/2025', time: '10:00 AM', leadId: 'lead1', propertyId: 'prop1', notes: 'Client interested in seeing the master suite and backyard.' },
    { id: 'appt2', type: 'Consultation', date: '08/17/2025', time: '2:00 PM', leadId: 'lead2', propertyId: 'prop2', notes: 'Initial meeting to discuss property requirements.' },
    { id: 'appt3', type: 'Open House', date: '08/18/2025', time: '1:00 PM', leadId: 'lead3', propertyId: 'prop3', notes: 'Multiple parties expected.' },
    { id: 'appt4', type: 'Virtual Tour', date: '08/19/2025', time: '11:30 AM', leadId: 'lead4', propertyId: 'prop4', notes: 'Client is currently overseas, will conduct tour via video call.' },
    { id: 'appt5', type: 'Follow-up', date: '08/20/2025', time: '3:00 PM', leadId: 'lead5', propertyId: 'prop5', notes: 'Discuss offer terms and next steps.' },
];

export const SAMPLE_CONVERSATIONS: Conversation[] = [
    { id: 'convo1', title: 'Generate report for Miami Villa', messages: [{ sender: 'user', text: 'Generate a market analysis report for the property at 742 Ocean Drive.' }], lastUpdated: '5m ago' },
    { id: 'convo2', title: 'Blog post ideas', messages: [{ sender: 'user', text: 'Give me 5 blog post ideas for first-time homebuyers.' }], lastUpdated: '1h ago' },
    { id: 'convo3', title: 'Draft social media post', messages: [{ sender: 'user', text: 'Draft an exciting instagram post for the new listing in Miami.' }], lastUpdated: '3h ago' },
];

export const DEMO_AI_CONVERSATIONS = [
    {
        id: 'demo-conv-1',
        contactName: 'Emily Rodriguez Follow-up',
        contactEmail: 'emily.r@email.com',
        contactPhone: '(555) 123-4567',
        type: 'chat' as const,
        lastMessage: 'Draft a personalized follow-up email highlighting the pool and architectural features',
        timestamp: '2025-11-25T10:30:00Z',
        status: 'active' as const,
        messageCount: 4,
        property: '2847 Sunset Boulevard',
        tags: ['follow-up', 'qualified-lead'],
        intent: 'Buyer',
        messages: [
            { role: 'user', content: 'Help me write a follow-up email to Emily Rodriguez about the Sunset Blvd property. She loved the pool during her showing.' },
            { role: 'assistant', content: 'I\'ll draft a personalized email for Emily. Based on her interest in the pool and architectural details:\n\nSubject: The Perfect Sunset Boulevard Oasis 🏊‍♀️\n\nHi Emily,\n\nIt was wonderful showing you 2847 Sunset Boulevard yesterday! I could see how much you loved the sparkling pool and those stunning mid-century architectural details.\n\nI wanted to follow up with a few highlights we discussed:\n• The saltwater pool system (low maintenance & eco-friendly)\n• Original terrazzo flooring throughout\n• Floor-to-ceiling windows capturing those city views\n• Recent pool equipment upgrade (2024)\n\nThe seller is motivated and open to offers. Given the recent comparable sales in Silver Lake, this is priced competitively for the area.\n\nWould you like to schedule a second showing? I\'d be happy to bring our pool inspector to give you peace of mind about the condition.\n\nBest regards,\nSarah Johnson' },
            { role: 'user', content: 'Great! Can you also suggest some talking points for our next conversation?' },
            { role: 'assistant', content: 'Perfect! Here are key talking points for your next call with Emily:\n\n**Property Strengths:**\n1. Pool maintenance costs (~$100/month for saltwater system)\n2. Architectural preservation - original 1965 features maintained\n3. School district ratings (if she mentioned family)\n4. Walkability score to trendy Silver Lake cafes\n\n**Financial Discussion:**\n• Pre-approval status confirmation\n• Closing cost estimates for this price point\n• Homeowners insurance quotes (I can connect her with our preferred agent)\n• Property tax breakdown\n\n**Next Steps:**\n• Schedule pool inspection ($300-400)\n• Second showing with partner/family?\n• Review recent comps I\'ll send over\n• Discuss offer strategy if she\'s ready\n\n**Potential Concerns to Address:**\n• Annual maintenance on mid-century homes\n• Pool safety if she has kids\n• Parking situation (2-car garage + street)\n\nWant me to send her the comps analysis now?' }
        ]
    },
    {
        id: 'demo-conv-2',
        contactName: 'Market Analysis: Austin Properties',
        contactEmail: '',
        contactPhone: '',
        type: 'chat' as const,
        lastMessage: 'Comparative market analysis for Maple Grove Lane showing strong appreciation potential',
        timestamp: '2025-11-24T15:45:00Z',
        status: 'active' as const,
        messageCount: 3,
        property: '156 Maple Grove Lane',
        tags: ['market-analysis', 'pricing'],
        intent: 'Research',
        messages: [
            { role: 'user', content: 'Generate a market analysis for 156 Maple Grove Lane in Austin. I need comps and pricing strategy.' },
            { role: 'assistant', content: '**Comparative Market Analysis: 156 Maple Grove Lane, Austin TX 78704**\n\n**Subject Property:**\n• 4 bed, 3 bath, 2,650 sq ft\n• List Price: $875,000\n• $/sq ft: $330\n• Built: 2018\n• Lot: 0.32 acres\n\n**Comparable Sales (Last 90 Days):**\n\n1. **142 Oak Terrace** - SOLD $862,000 (Oct 2025)\n   • 4 bed, 2.5 bath, 2,580 sq ft\n   • $/sq ft: $334\n   • 0.28 acres, similar finishes\n   • Days on market: 18\n\n2. **89 Elm Ridge** - SOLD $895,000 (Sept 2025)\n   • 4 bed, 3 bath, 2,720 sq ft  \n   • $/sq ft: $329\n   • 0.35 acres, premium lot\n   • Days on market: 12\n\n3. **203 Cedar Lane** - SOLD $851,000 (Nov 2025)\n   • 3 bed, 3 bath, 2,600 sq ft\n   • $/sq ft: $327\n   • 0.29 acres, older construction (2015)\n   • Days on market: 24\n\n**Market Insights:**\n• Average $/sq ft in area: $330\n• Your listing is competitively priced\n• South Austin market appreciation: +8.2% YoY\n• Average DOM: 18 days\n\n**Pricing Recommendation:**\n• List at $875,000 (current)\n• Expected range: $860K - $890K\n• Optimal strategy: Price firm, highlight recent updates' },
            { role: 'user', content: 'What are the key selling points I should emphasize?' },
            { role: 'assistant', content: '**Top Selling Points for 156 Maple Grove Lane:**\n\n**1. Location & Lifestyle**\n• Highly-rated Bowie High School district (9/10)\n• Walking distance to South Congress (SoCo) shops\n• 15 min to downtown Austin\n• Family-friendly neighborhood with parks\n\n**2. Property Features**\n• Modern open-concept floor plan\n• Gourmet kitchen with quartz countertops\n• Master suite with spa bathroom\n• Covered patio - perfect for Texas entertaining\n• Mature oak trees (rare for newer construction)\n\n**3. Financial Benefits**\n• Energy-efficient construction (lower utility bills)\n• Recent build = less immediate maintenance\n• Strong appreciation area (+8.2% annually)\n• Lower property taxes than comparable areas\n\n**4. Competitive Advantages**\n• Extra half-bath vs most comps\n• Larger lot (0.32 acres)\n• Premium chef\'s kitchen upgrades\n• 2-car garage + additional parking\n\n**Marketing Angle:**\n"Modern family oasis in South Austin\'s most desirable school district - where contemporary living meets Hill Country charm"\n\nWant me to draft listing copy using these points?' }
        ]
    },
    {
        id: 'demo-conv-3',
        contactName: 'Social Media Content: New Listing',
        contactEmail: '',
        contactPhone: '',
        type: 'chat' as const,
        lastMessage: 'Instagram and Facebook posts created for Sunset Boulevard listing launch',
        timestamp: '2025-11-23T09:20:00Z',
        status: 'active' as const,
        messageCount: 5,
        property: '2847 Sunset Boulevard',
        tags: ['marketing', 'social-media'],
        intent: 'Marketing',
        messages: [
            { role: 'user', content: 'Create social media posts for the new Sunset Boulevard listing. I need content for Instagram and Facebook.' },
            { role: 'assistant', content: '**Instagram Post:**\n\n✨ JUST LISTED ✨\n\nMid-Century Magic in Silver Lake 🌅\n\n3 bed | 2.5 bath | 2,100 sq ft | $1.25M\n\nSwipe to fall in love ➡️ with this architectural gem featuring:\n🏊‍♀️ Sparkling saltwater pool\n🏔️ Breathtaking city views  \n☀️ Floor-to-ceiling windows\n🎨 Restored original hardwood floors\n👨‍🍳 Gourmet chef\'s kitchen\n\nNestled in the heart of Silver Lake, minutes from trendy cafes and the vibrant arts scene. This isn\'t just a house - it\'s a lifestyle.\n\nDM for private showing 📩\nLink in bio for virtual tour 🎥\n\n#JustListed #SilverLakeLiving #MidCenturyModern #LArealestate #DreamHome #LuxuryListing #PoolHouse #ArchitecturalGem #LosAngelesHomes #RealEstateGoals\n\n---\n\n**Facebook Post:**\n\n🏡 NEW LISTING ALERT! 🏡\n\n2847 Sunset Boulevard, Silver Lake\n$1,250,000 | 3 BD | 2.5 BA | 2,100 SF\n\nStep into this stunning mid-century modern masterpiece! Perched in coveted Silver Lake, this architectural gem seamlessly blends vintage charm with contemporary luxury.\n\n✨ HIGHLIGHTS:\n• Sparkling saltwater pool with city views\n• Original hardwood floors meticulously restored\n• Chef\'s kitchen with custom walnut cabinetry  \n• Floor-to-ceiling windows flooding the home with natural light\n• Private oasis with mature landscaping\n• Walk to Silver Lake\'s best cafes and boutiques\n\nPerfect for the discerning buyer who appreciates timeless design and modern amenities.\n\n📅 Open House: This Sunday 1-4pm\n📞 Call for private showing: (305) 555-1234\n🔗 Virtual tour: [link]\n\nShare with someone who needs to see this! 💫' },
            { role: 'user', content: 'Perfect! Can you also write a short video script for a walkthrough reel?' },
            { role: 'assistant', content: '**Instagram Reel Script (60 seconds)**\n\n**[OPENING SHOT: Exterior of home with pool visible]**\n"When Silver Lake luxury meets mid-century charm... ✨"\n\n**[Walking through front door]**\n"Welcome to 2847 Sunset Boulevard. Let me show you why this one\'s special."\n\n**[Pan across living room windows]**\n"Floor-to-ceiling windows that frame the city like art 🎨"\n\n**[Walking into kitchen]**\n"Custom walnut cabinetry, quartz countertops... a chef\'s dream 👨‍🍳"\n\n**[Master bedroom reveal]**\n"Three bedrooms, but this master suite? *Chef\'s kiss* 💋"\n\n**[Open bathroom door]**\n"Spa-worthy ensuite with double vanity and walk-in shower 🚿"\n\n**[Walk to back door]**\n"But wait... the best part..."\n\n**[Reveal pool and view]**\n"Your own private oasis 🏊‍♀️ with THOSE views 🌅"\n\n**[Sunset time-lapse over pool]**\n"Imagine your evenings here..."\n\n**[Final shot: Agent in front of property]**\n"$1.25M | Open Sunday 1-4pm"\n"DM me for a private tour 📩"\n\n**Music:** Upbeat, modern (licensed track)\n\n**Text Overlays:**\n• "Just Listed"\n• "$1.25M"\n• "Silver Lake"\n• "Link in bio"\n\n**Duration:** 45-60 seconds\n**Format:** Vertical (9:16) for Reels/Stories' }
        ]
    },
    {
        id: 'demo-conv-4',
        contactName: 'Thompson Family - Objection Handling',
        contactEmail: 'thompson.family@gmail.com',
        contactPhone: '(555) 234-8901',
        type: 'chat' as const,
        lastMessage: 'Strategies for addressing school district and pricing concerns',
        timestamp: '2025-11-22T14:15:00Z',
        status: 'follow-up' as const,
        messageCount: 3,
        property: '156 Maple Grove Lane',
        tags: ['objection-handling', 'negotiation'],
        intent: 'Buyer',
        messages: [
            { role: 'user', content: 'The Thompson family loves the Maple Grove property but they\'re concerned about the price and want to know more about the schools. How should I handle this?' },
            { role: 'assistant', content: '**Addressing the Thompson Family\'s Concerns**\n\n**SCHOOL DISTRICT (Lead with this - it\'s a strength!):**\n\n"I completely understand - schools are crucial for your family. Let me share some exciting details:\n\n**Bowie High School District (9/10 rating)**\n• Top 5% of Texas public schools\n• 95% graduation rate\n• Average SAT: 1240 (well above state average)\n• Award-winning STEM and arts programs\n• Student-teacher ratio: 16:1\n\n**Elementary: Zilker Elementary (8/10)**\n• Walking distance (0.4 miles)\n• Dual language immersion program\n• After-school enrichment activities\n\n**Safety & Community:**\n• Active PTA with 200+ families\n• Neighborhood watch program\n• Multiple parks within walking distance"\n\n**PRICING STRATEGY:**\n\n"Regarding the $875K price point, let me share the data:\n\n**Value Proposition:**\n1. Recent comps show we\'re actually $20-30K below market\n   • 142 Oak Terrace sold for $862K (smaller, fewer baths)\n   • 89 Elm Ridge sold for $895K (comparable features)\n\n2. This area has appreciated 8.2% annually\n   • Your investment grows while you live here\n   • South Austin continues trending upward\n\n3. Cost comparison breakdown:\n   • $875K ÷ 2,650 sq ft = $330/sq ft\n   • Area average: $332/sq ft\n   • You\'re getting premium features at market rate\n\n**Negotiation Path:**\n• Seller may contribute to closing costs ($8-10K)\n• Home warranty included ($500 value)\n• Recent updates mean minimal maintenance costs\n\nWould they consider an offer at $860K with seller concessions? This positions you competitively while respecting their budget concerns."' },
            { role: 'user', content: 'Great! They also want to know about the neighborhood safety and future development plans.' },
            { role: 'assistant', content: '**Neighborhood Safety & Development Intel:**\n\n**SAFETY STATISTICS:**\n\n"South Austin (78704) Safety Profile:\n• Crime rate: 45% below Austin average\n• Violent crime: Minimal (residential area)\n• Active Neighborhood Watch since 2019\n• Well-lit streets with regular police patrols\n• Family-oriented community\n\n**Community Features:**\n• Ring doorbell network (most homes participate)\n• NextDoor app very active\n• Annual National Night Out events\n• Dedicated community liaison officer"\n\n---\n\n**FUTURE DEVELOPMENT (Positive Growth!):**\n\n"Here\'s the exciting part about buying now:\n\n**Upcoming Improvements:**\n\n1. **Zilker Park Master Plan** (2025-2027)\n   • $60M investment in nearby Zilker Park\n   • New playgrounds and sports facilities\n   • Enhanced green spaces\n   • Increases nearby property values\n\n2. **South Congress Expansion**\n   • New boutique shops opening Q1 2026\n   • Farm-to-table restaurants\n   • Walkability improvements\n   • Property value catalyst\n\n3. **School District Investment**\n   • $15M bond approved for Bowie HS upgrades\n   • New STEM lab opening 2026\n   • Athletic facility renovations\n\n4. **Infrastructure Updates**\n   • Street improvements planned\n   • Bike lane expansion\n   • Community garden project\n\n**What This Means:**\n• Area values projected to rise 10-12% over next 3 years\n• Getting in now = appreciation upside\n• Family-friendly amenities increasing\n• No commercial/industrial zoning changes planned\n\n**Zoning Protection:**\n• Residential zoning locked in\n• Strict building codes maintain character\n• No high-density development approved for this pocket\n\nThis is a mature, stable neighborhood that\'s only getting better. Perfect timing for the Thompsons!"' }
        ]
    },
    {
        id: 'demo-conv-5',
        contactName: 'Email Template: Open House Invitation',
        contactEmail: '',
        contactPhone: '',
        type: 'chat' as const,
        lastMessage: 'Professional open house invitation email with RSVP tracking',
        timestamp: '2025-11-21T11:00:00Z',
        status: 'active' as const,
        messageCount: 2,
        property: '2847 Sunset Boulevard',
        tags: ['email-template', 'open-house'],
        intent: 'Marketing',
        messages: [
            { role: 'user', content: 'Create an email invitation for the Sunset Boulevard open house this Sunday. I want to send it to my warm leads and sphere.' },
            { role: 'assistant', content: '**Subject Line Options:**\n1. "You\'re Invited: Exclusive Open House this Sunday 🏡"\n2. "Private Preview: Mid-Century Dream Home in Silver Lake"\n3. "[FIRST NAME], Save Your Spot - Limited Showing Sunday"\n\n**Email Body:**\n\n---\n\nHi [FIRST NAME],\n\nI wanted to personally invite you to an exclusive open house this Sunday for one of the most stunning properties I\'ve listed this year.\n\n**📍 2847 Sunset Boulevard, Silver Lake**\n**📅 Sunday, November 28th | 1:00 PM - 4:00 PM**\n**💰 $1,250,000 | 3 BD | 2.5 BA | 2,100 SF**\n\n**Why You Should Come:**\n\n🏊‍♀️ **Sparkling Saltwater Pool** with panoramic city views\n🎨 **Architectural Masterpiece** - authentic mid-century modern design\n☀️ **Flooded with Light** - floor-to-ceiling windows throughout  \n👨‍🍳 **Chef\'s Kitchen** - custom walnut cabinetry & high-end appliances\n🌳 **Private Oasis** - mature landscaping in the heart of Silver Lake\n\n**Perfect For:**\n• Design enthusiasts who appreciate timeless architecture\n• Anyone seeking indoor-outdoor California living\n• Families wanting walkability to cafes, shops & arts scene\n\n**📲 RSVP Here:** [RSVP Link]\n\n*Space is limited to ensure a personalized experience*\n\n**Can\'t Make It?**\nNo problem! Reply to this email and I\'ll arrange a private showing at your convenience.\n\n**Preview the Property:**\n🎥 [Virtual Tour Link]\n📸 [Photo Gallery Link]\n📋 [Property Details PDF]\n\n**What to Expect:**\n• Light refreshments provided\n• Property information packets\n• Market insights & comps analysis\n• Relaxed, pressure-free viewing\n\nI truly believe this home offers incredible value in one of LA\'s most desirable neighborhoods. Whether you\'re looking for yourself or know someone who might be interested, I\'d love to show you around.\n\nSee you Sunday!\n\nWarm regards,\n\nSarah Johnson\nLuxury Real Estate Specialist\nPrestige Properties\n📱 (305) 555-1234\n📧 sarah.j@prestigeprop.com\n🌐 www.prestigeproperties.com\n\n---\n\nP.S. Parking is available on Sunset Boulevard and the adjacent side street. The property is the mid-century home with the prominent pool visible from the street.\n\n---\n\n**Follow-Up Sequence:**\n• Day before: Reminder email with parking details\n• Day of: Text reminder 2 hours before\n• Day after: Thank you + feedback request\n• 2 days after: "Did you decide?" follow-up\n\n**Tracking:**\n• RSVP link tracks who\'s interested\n• Virtual tour link shows engagement\n• Tag attendees in CRM for follow-up' }
        ]
    }
];

export const SAMPLE_INTERACTIONS: Interaction[] = [
    {
        id: 'inter1', sourceType: 'listing-inquiry', sourceName: '742 Ocean Drive',
        contact: { name: 'John Doe', avatarUrl: 'https://i.pravatar.cc/150?img=1' },
        message: "Is the price on the Miami villa negotiable? Also, what are the annual taxes?",
        timestamp: "15m ago", isRead: false, relatedPropertyId: 'prop-demo-1'
    },
    {
        id: 'inter2', sourceType: 'chat-bot-session', sourceName: 'Website Chatbot',
        contact: { name: 'Emily White' }, message: "Hi, I'd like to know more about the amenities at the Chicago loft.",
        timestamp: "1h ago", isRead: false, relatedPropertyId: 'prop-demo-3'
    },
    {
        id: 'inter3', sourceType: 'marketing-reply', sourceName: 'Facebook Ad - Aspen',
        contact: { name: 'Chris Green', avatarUrl: 'https://i.pravatar.cc/150?img=5' },
        message: "Replied to your ad: 'Is the Aspen cabin available for ski season rentals?'",
        timestamp: "8h ago", isRead: true, relatedPropertyId: 'prop-demo-4'
    },
];

export const SAMPLE_SOCIAL_POSTS: SocialPost[] = [
    { id: 'sp1', propertyId: 'prop-demo-1', propertyAddress: '742 Ocean Drive, Miami Beach, FL', platforms: ['instagram', 'facebook'], content: 'Dreaming of ocean views? Your dream is now a reality. ✨ Presenting 742 Ocean Drive, a modern masterpiece in Miami Beach. #miamirealestate #luxuryhomes #oceanfront', imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=800&auto=format&fit=crop', status: 'scheduled', postAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'sp2', propertyId: 'prop-demo-2', propertyAddress: '101 Chestnut Street, San Francisco, CA', platforms: ['linkedin'], content: 'A unique investment opportunity in San Francisco\'s historic district. 101 Chestnut Street combines timeless elegance with modern amenities, offering significant value appreciation potential for discerning buyers.', imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop', status: 'posted', postAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

export const SAMPLE_TASKS: AgentTask[] = [
    { id: 'task1', text: 'Follow up with Emily Rodriguez about pool maintenance questions', isCompleted: false, dueDate: '2025-11-25', priority: 'High' },
    { id: 'task2', text: 'Prepare investment analysis for David Park', isCompleted: false, dueDate: '2025-11-26', priority: 'High' },
    { id: 'task3', text: 'Send school district info to Thompson family', isCompleted: false, dueDate: '2025-11-27', priority: 'Medium' },
    { id: 'task4', text: 'Update listing photos for Silver Lake property', isCompleted: true, dueDate: '2025-11-24', priority: 'Medium' },
    { id: 'task5', text: 'Send Marcus Chen commute time analysis', isCompleted: true, dueDate: '2025-11-23', priority: 'High' },
    { id: 'task6', text: 'Create curated property list for Jennifer Martinez', isCompleted: false, dueDate: '2025-11-28', priority: 'Medium' },
    { id: 'task7', text: 'Schedule home inspection for Austin property', isCompleted: false, dueDate: '2025-11-29', priority: 'Medium' },
    { id: 'task8', text: 'Send market update newsletter to all leads', isCompleted: false, dueDate: '2025-11-30', priority: 'Low' }
];

export const AI_PERSONALITIES: AIPersonality[] = [
    {
        id: 'pers-1',
        name: 'Professional Real Estate Expert',
        description: 'A knowledgeable and authoritative voice with deep market expertise',
        traits: ['Professional', 'Knowledgeable', 'Authoritative', 'Trustworthy', 'Detail-oriented'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'This property offers exceptional value with its prime location, recent upgrades, and strong rental potential. The current market conditions and projected appreciation make it an excellent investment opportunity.'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'Based on recent comparable sales in this neighborhood, this property is priced competitively at 5% below market value. The unique features and upgrades provide additional value not found in similar listings.'
            }
        ]
    },
    {
        id: 'pers-2',
        name: 'Friendly Guide',
        description: 'A warm and approachable assistant who makes clients feel comfortable',
        traits: ['Friendly', 'Approachable', 'Patient', 'Encouraging', 'Supportive'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'I\'m excited to share why this property is such a great find! It\'s in a wonderful neighborhood with excellent schools, and the recent renovations really make it shine. Plus, the investment potential is fantastic!'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'Great question! I\'ve looked at similar homes in the area, and this one really stands out. It\'s priced very competitively, and you\'re getting so much more value for your money. Would you like me to show you the details?'
            }
        ]
    },
    {
        id: 'pers-3',
        name: 'Marketing Specialist',
        description: 'A creative and enthusiastic voice focused on highlighting property benefits',
        traits: ['Creative', 'Enthusiastic', 'Persuasive', 'Innovative', 'Results-driven'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'This property is an absolute GEM! 🏠✨ With its stunning curb appeal, premium finishes, and unbeatable location, it\'s a dream investment that practically sells itself. The ROI potential is off the charts!'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'This property is in a league of its own! 💎 While other homes in the area are just houses, this is a lifestyle upgrade. The attention to detail and premium features make it the clear winner in its price range.'
            }
        ]
    },
    {
        id: 'pers-4',
        name: 'Analytical Advisor',
        description: 'A data-driven expert who provides detailed market insights',
        traits: ['Analytical', 'Data-driven', 'Precise', 'Thorough', 'Objective'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'Based on my analysis of market data, this property shows a 12.3% annual appreciation rate, 8.7% rental yield potential, and is located in a high-growth corridor. The numbers clearly indicate strong investment viability.'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'My comparative market analysis shows this property is priced 7.2% below the median for comparable homes in this area. The price per square foot is $247 vs. the neighborhood average of $267, representing significant value.'
            }
        ]
    },
    {
        id: 'pers-5',
        name: 'Luxury Concierge',
        description: 'A sophisticated and premium service-oriented assistant',
        traits: ['Sophisticated', 'Premium', 'Service-oriented', 'Discrete', 'Exclusive'],
        sampleResponses: [
            {
                question: 'What makes this property a good investment?',
                response: 'This exceptional property represents the pinnacle of luxury real estate investment. Its prestigious address, unparalleled amenities, and exclusive features create a truly distinguished investment opportunity for discerning clients.'
            },
            {
                question: 'How does this compare to similar properties?',
                response: 'This property transcends typical market comparisons. While other properties may offer similar square footage, none can match the level of sophistication, privacy, and exclusivity that this residence provides to its fortunate owners.'
            }
        ]
    }
];

export const AI_VOICES: AIVoice[] = [
    {
        id: 'jordan',
        name: 'Jordan (Professional)',
        description: 'Clear, confident, and authoritative voice perfect for business interactions',
        gender: 'male',
        accent: 'American',
        sampleUrl: '/samples/jordan-sample.mp3'
    },
    {
        id: 'morgan',
        name: 'Morgan (Friendly)',
        description: 'Warm, approachable voice that puts clients at ease',
        gender: 'female',
        accent: 'American',
        sampleUrl: '/samples/morgan-sample.mp3'
    },
    {
        id: 'cameron',
        name: 'Cameron (Casual)',
        description: 'Relaxed and conversational tone for informal interactions',
        gender: 'neutral',
        accent: 'American',
        sampleUrl: '/samples/cameron-sample.mp3'
    },
    {
        id: 'alex',
        name: 'Alex (Energetic)',
        description: 'Dynamic and enthusiastic voice for engaging presentations',
        gender: 'male',
        accent: 'American',
        sampleUrl: '/samples/alex-sample.mp3'
    },
    {
        id: 'taylor',
        name: 'Taylor (Warm)',
        description: 'Gentle and reassuring voice for sensitive conversations',
        gender: 'female',
        accent: 'American',
        sampleUrl: '/samples/taylor-sample.mp3'
    },
    {
        id: 'sophia',
        name: 'Sophia (Luxury)',
        description: 'Sophisticated and refined voice for premium properties',
        gender: 'female',
        accent: 'British',
        sampleUrl: '/samples/sophia-sample.mp3'
    },
    {
        id: 'marcus',
        name: 'Marcus (Analytical)',
        description: 'Clear and precise voice for data-driven discussions',
        gender: 'male',
        accent: 'American',
        sampleUrl: '/samples/marcus-sample.mp3'
    }
];

export const KNOWLEDGE_BASE_PRIORITIES: KnowledgeBasePriority[] = [
    {
        id: 'agent-priority',
        name: 'Agent Knowledge Base',
        description: 'Company policies, scripts, expertise',
        weights: { agent: 0.8, listing: 0.1, marketing: 0.1 }
    },
    {
        id: 'listing-priority',
        name: 'Listing Knowledge Base',
        description: 'Property details, floor plans, features',
        weights: { agent: 0.1, listing: 0.8, marketing: 0.1 }
    },
    {
        id: 'marketing-priority',
        name: 'Market Knowledge Base',
        description: 'Market data, comps, trends',
        weights: { agent: 0.1, listing: 0.1, marketing: 0.8 }
    },
    {
        id: 'balanced-priority',
        name: 'Balanced',
        description: 'Equal weight to all knowledge bases',
        weights: { agent: 0.33, listing: 0.33, marketing: 0.34 }
    },
    {
        id: 'dynamic-priority',
        name: 'Dynamic',
        description: 'Adapts based on conversation context',
        weights: { agent: 0.4, listing: 0.3, marketing: 0.3 }
    }
];

export const PERSONALITY_TEST_QUESTIONS: PersonalityTest[] = [
    {
        id: 'test-1',
        question: 'How would you describe your ideal client interaction?',
        responses: [
            { id: 'resp-1-1', text: 'Professional and data-driven', personalityId: 'pers-1' },
            { id: 'resp-1-2', text: 'Warm and personal', personalityId: 'pers-2' },
            { id: 'resp-1-3', text: 'Creative and exciting', personalityId: 'pers-3' },
            { id: 'resp-1-4', text: 'Analytical and thorough', personalityId: 'pers-4' },
            { id: 'resp-1-5', text: 'Sophisticated and exclusive', personalityId: 'pers-5' }
        ]
    },
    {
        id: 'test-2',
        question: 'What tone should your AI assistant use when discussing properties?',
        responses: [
            { id: 'resp-2-1', text: 'Authoritative and knowledgeable', personalityId: 'pers-1' },
            { id: 'resp-2-2', text: 'Friendly and encouraging', personalityId: 'pers-2' },
            { id: 'resp-2-3', text: 'Enthusiastic and persuasive', personalityId: 'pers-3' },
            { id: 'resp-2-4', text: 'Precise and objective', personalityId: 'pers-4' },
            { id: 'resp-2-5', text: 'Premium and sophisticated', personalityId: 'pers-5' }
        ]
    },
    {
        id: 'test-3',
        question: 'How should your AI handle client objections?',
        responses: [
            { id: 'resp-3-1', text: 'Provide detailed explanations with facts', personalityId: 'pers-1' },
            { id: 'resp-3-2', text: 'Listen empathetically and offer reassurance', personalityId: 'pers-2' },
            { id: 'resp-3-3', text: 'Highlight benefits and create excitement', personalityId: 'pers-3' },
            { id: 'resp-3-4', text: 'Present data and comparative analysis', personalityId: 'pers-4' },
            { id: 'resp-3-5', text: 'Address concerns with discretion and class', personalityId: 'pers-5' }
        ]
    }
];

export const DEFAULT_AI_ASSIGNMENTS: AIAssignment[] = [
    {
        id: 'listing-sidekick',
        name: 'Listing Sidekick',
        type: 'listing',
        description: 'Specializes in home listings and property-specific information',
        knowledgePriority: 'listing',
        status: 'active'
    },
    {
        id: 'agent-sidekick',
        name: 'Agent Sidekick',
        type: 'agent',
        description: 'Represents the real estate agent and handles sales conversations',
        knowledgePriority: 'agent',
        status: 'active'
    },
    {
        id: 'helper-sidekick',
        name: 'Helper Sidekick',
        type: 'helper',
        description: 'Helps agents navigate the dashboard and maximize ROI',
        knowledgePriority: 'balanced',
        status: 'active'
    },
    {
        id: 'marketing-sidekick',
        name: 'Marketing Sidekick',
        type: 'marketing',
        description: 'Creates blogs, social posts, email copy, and campaigns',
        knowledgePriority: 'marketing',
        status: 'active'
    },
    {
        id: 'sales-sidekick',
        name: 'Sales Sidekick',
        type: 'sales',
        description: 'Handles sales scripts, objections, and follow-ups',
        knowledgePriority: 'agent',
        status: 'active'
    },
    {
        id: 'god-sidekick',
        name: 'God Mode Sidekick',
        type: 'god',
        description: 'Meta assistant that coordinates other sidekicks when needed',
        knowledgePriority: 'dynamic',
        status: 'active'
    }
];

