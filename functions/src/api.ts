import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        [key: string]: any;
      };
    }
  }
}

const db = admin.firestore();
const app = express();
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development';

// Enable CORS for all routes
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://home-listing-ai.web.app',
    'https://home-listing-ai.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Helpers
const toSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Blog API
app.post('/blog', async (req, res) => {
  try {
    const { title, content, excerpt, author, tags, imageUrl } = req.body || {};
    if (!title || !content) {
      res.status(400).json({ error: 'Missing title or content' });
      return;
    }

    let baseSlug = toSlug(title);
    let slug = baseSlug;
    let i = 1;
    while (true) {
      const existing = await db.collection('blogPosts').where('slug', '==', slug).limit(1).get();
      if (existing.empty) break;
      slug = `${baseSlug}-${++i}`;
    }

    const doc = {
      title,
      slug,
      content,
      excerpt: excerpt || String(content).replace(/<[^>]+>/g, '').slice(0, 180) + '...',
      author: author || 'HomeListingAI',
      publishedAt: new Date().toISOString(),
      status: 'published',
      tags: Array.isArray(tags) ? tags : [],
      imageUrl: imageUrl || null,
      readTime: '4 min'
    };

    const ref = await db.collection('blogPosts').add(doc);
    res.json({ id: ref.id, ...doc });
  } catch (error: any) {
    console.error('POST /blog error', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

app.get('/blog', async (req, res) => {
  try {
    const page = parseInt(String(req.query.page || '1')) || 1;
    const limit = parseInt(String(req.query.limit || '6')) || 6;
    const search = String(req.query.search || '').trim().toLowerCase();
    const tag = String(req.query.tag || '').trim().toLowerCase();

    let snap = await db.collection('blogPosts').orderBy('publishedAt', 'desc').get();
    let posts = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    if (search) {
      posts = posts.filter(p =>
        p.title?.toLowerCase().includes(search) ||
        p.excerpt?.toLowerCase().includes(search)
      );
    }
    if (tag) {
      posts = posts.filter(p => Array.isArray(p.tags) && p.tags.map((t: string) => t.toLowerCase()).includes(tag));
    }

    const totalPages = Math.max(1, Math.ceil(posts.length / limit));
    const start = (page - 1) * limit;
    const paged = posts.slice(start, start + limit);
    res.json({ posts: paged, totalPages });
  } catch (error: any) {
    console.error('GET /blog error', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

app.get('/blog/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const snap = await db.collection('blogPosts').where('slug', '==', slug).limit(1).get();
    if (snap.empty) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...(doc.data() as any) });
  } catch (error: any) {
    console.error('GET /blog/:slug error', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

app.use(express.json());

// Middleware to verify admin access
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    // In local dev, bypass strict admin check for localhost origins
    const origin = (req.headers.origin || req.headers.referer || '') as string;
    const isLocalOrigin = origin.includes('http://localhost:') || origin.includes('http://127.0.0.1:');
    if (isEmulator || isLocalOrigin) {
      req.user = { uid: 'dev-admin' } as any;
      next();
      return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user has admin role
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    req.user = { uid: decodedToken.uid, ...userData };
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Admin users endpoints (dev-friendly)
app.get('/admin/users', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (isEmulator) {
      const users: any[] = [];
      res.json({ success: true, users });
      return;
    }

    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/admin/users', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { name, email, role = 'agent', plan = 'Solo Agent' } = req.body || {};
    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    if (isEmulator) {
      const user = {
        id: `${Date.now()}`,
        name,
        email,
        role,
        status: 'Active',
        dateJoined: new Date().toISOString().slice(0,10),
        lastActive: new Date().toISOString(),
        plan,
        propertiesCount: 0,
        leadsCount: 0,
        aiInteractions: 0,
        subscriptionStatus: 'active',
        renewalDate: '2025-01-01'
      };
      res.json(user);
      return;
    }

    const ref = await db.collection('users').add({
      name,
      email,
      role,
      plan,
      status: 'Active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    });
    const snap = await ref.get();
    res.json({ id: ref.id, ...snap.data() });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin leads endpoints
app.get('/admin/leads', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (isEmulator) {
      const leads = [
        {
          id: 'L3',
          name: 'Fred Potter',
          email: 'fred.potter@example.com',
          phone: '+1-555-0103',
          status: 'Qualified',
          source: 'Website',
          notes: 'Interested in 4BR family home',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastMessage: 'Ready to schedule showing for this weekend',
          score: 50,
          tier: 'Warm',
          date: new Date().toISOString().split('T')[0]
        }
      ];
      res.json({ success: true, leads, total: leads.length });
      return;
    }

    const leadsSnapshot = await db.collection('leads')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const leads = leadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ 
      success: true, 
      leads,
      total: leads.length 
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/admin/leads', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { name, email, phone, status, source, notes } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const leadData = {
      name,
      email,
      phone: phone || '',
      status: status || 'New',
      source: source || 'Manual',
      notes: notes || '',
      score: 0,
      tier: 'Cold',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user?.uid
    };

    if (isEmulator) {
      const createdLead = {
        id: `L${Date.now()}`,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        status: leadData.status,
        source: leadData.source,
        notes: leadData.notes,
        score: leadData.score,
        tier: leadData.tier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: leadData.createdBy
      };
      res.json({ success: true, lead: createdLead });
      return;
    }

    const leadRef = await db.collection('leads').add(leadData);
    const createdSnap = await leadRef.get();
    const createdLead = { id: leadRef.id, ...createdSnap.data() };

    res.json({ success: true, lead: createdLead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ 
      error: 'Failed to create lead',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update lead
app.put('/admin/leads/:id', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { status, lastMessage, name, email, phone, source, notes, score, tier } = req.body as {
      status?: string; lastMessage?: string; name?: string; email?: string; phone?: string; source?: string; notes?: string; score?: number; tier?: string;
    };

    const update: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (typeof status === 'string') update.status = status;
    if (typeof lastMessage === 'string') update.lastMessage = lastMessage;
    if (typeof name === 'string') update.name = name;
    if (typeof email === 'string') update.email = email;
    if (typeof phone === 'string') update.phone = phone;
    if (typeof source === 'string') update.source = source;
    if (typeof notes === 'string') update.notes = notes;
    if (typeof score === 'number') update.score = score;
    if (typeof tier === 'string') update.tier = tier;

    if (isEmulator) {
      res.json({ success: true, lead: { id, ...update } });
      return;
    }

    await db.collection('leads').doc(id).set(update, { merge: true });
    const snap = await db.collection('leads').doc(id).get();
    res.json({ success: true, lead: { id, ...snap.data() } });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
app.delete('/admin/leads/:id', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    if (isEmulator) {
      res.json({ success: true });
      return;
    }
    await db.collection('leads').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Marketing endpoints
app.get('/admin/marketing/sequences', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const sequencesSnapshot = await db.collection('marketingSequences')
      .orderBy('createdAt', 'desc')
      .get();

    const sequences = sequencesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ 
      success: true, 
      sequences 
    });
  } catch (error) {
    console.error('Error fetching marketing sequences:', error);
    res.status(500).json({ 
      error: 'Failed to fetch marketing sequences',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/admin/marketing/active-followups', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const followUpsSnapshot = await db.collection('activeFollowUps')
      .where('status', '==', 'active')
      .orderBy('scheduledAt', 'asc')
      .get();

    const followUps = followUpsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ 
      success: true, 
      followUps 
    });
  } catch (error) {
    console.error('Error fetching active follow-ups:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active follow-ups',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/admin/marketing/qr-codes', requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const qrCodesSnapshot = await db.collection('qrCodes')
      .orderBy('createdAt', 'desc')
      .get();

    const qrCodes = qrCodesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ 
      success: true, 
      qrCodes 
    });
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch QR codes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Knowledge Base lightweight endpoints (CORS enabled)
app.post('/kb/list', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { userId, category, limit = 50 } = req.body || {};
    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }
    let q = db.collection('knowledgeBase').where('userId', '==', userId);
    if (category) {
      q = q.where('category', '==', String(category));
    }
    const snap = await q.orderBy('createdAt', 'desc').limit(Number(limit)).get();
    const entries = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    res.json({ entries });
  } catch (error) {
    console.error('POST /kb/list error', error);
    res.status(500).json({ error: 'Failed to list knowledge' });
  }
});

app.post('/kb/delete', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { fileId } = req.body || {};
    if (!fileId) {
      res.status(400).json({ error: 'fileId required' });
      return;
    }
    const fileDoc = await db.collection('files').doc(String(fileId)).get();
    if (!fileDoc.exists) {
      res.json({ status: 'success' });
      return;
    }
    const fileData = fileDoc.data() as any;
    try {
      const bucket = admin.storage().bucket();
      await bucket.file(fileData.filePath).delete({ ignoreNotFound: true });
    } catch (e) {
      console.warn('Storage delete warning:', e);
    }
    if (fileData.knowledgeBaseId) {
      await db.collection('knowledgeBase').doc(fileData.knowledgeBaseId).delete();
    } else {
      // best-effort delete by fileId field
      const q = await db.collection('knowledgeBase').where('fileId', '==', String(fileId)).get();
      await Promise.all(q.docs.map(d => d.ref.delete()));
    }
    await db.collection('files').doc(String(fileId)).delete();
    res.json({ status: 'success' });
  } catch (error) {
    console.error('POST /kb/delete error', error);
    res.status(500).json({ error: 'Failed to delete knowledge' });
  }
});

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response): void => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'home-listing-ai-api'
  });
});

// Test endpoint for development - returns mock data without authentication
app.get('/test/admin/leads', (req: express.Request, res: express.Response): void => {
  const mockLeads = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      status: 'new',
      source: 'website',
      notes: 'Interested in downtown properties',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1-555-0124',
      status: 'contacted',
      source: 'referral',
      notes: 'Looking for family home',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  res.json({ leads: mockLeads });
});

// Test marketing endpoints
app.get('/test/admin/marketing/sequences', (req: express.Request, res: express.Response): void => {
  const mockSequences = [
    {
      id: '1',
      name: 'New Lead Welcome',
      description: 'Welcome sequence for new leads',
      steps: 3,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];
  res.json({ sequences: mockSequences });
});

app.get('/test/admin/marketing/active-followups', (req: express.Request, res: express.Response): void => {
  const mockFollowUps = [
    {
      id: '1',
      leadId: '1',
      leadName: 'John Doe',
      sequenceName: 'New Lead Welcome',
      nextStep: 'Send property recommendations',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  res.json({ followUps: mockFollowUps });
});

app.get('/test/admin/marketing/qr-codes', (req: express.Request, res: express.Response): void => {
  const mockQrCodes = [
    {
      id: '1',
      name: 'Downtown Property QR',
      url: 'https://example.com/property/123',
      scans: 15,
      createdAt: new Date().toISOString()
    }
  ];
  res.json({ qrCodes: mockQrCodes });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response): void => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error('API Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message
  });
});

export const api = functions.https.onRequest(app);