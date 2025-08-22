// Configuration for Firebase Functions
export const config = {
  // Google AI Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-pro',
    maxTokens: 2048,
    temperature: 0.7
  },

  // PayPal Configuration
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' or 'live'
    webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
  },

  // Stripe Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  },

  // Email Configuration
  email: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || ''
    },
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true'
    },
    fromEmail: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
    fromName: process.env.FROM_NAME || 'Home Listing AI'
  },

  // Google Cloud Services
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    storageBucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || '',
    speechToText: {
      languageCode: 'en-US',
      model: 'default'
    },
    textToSpeech: {
      languageCode: 'en-US',
      voiceName: 'en-US-Standard-A'
    }
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
      }
      return 'dev-jwt-secret-' + Math.random().toString(36);
    })(),
    encryptionKey: process.env.ENCRYPTION_KEY || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY must be set in production');
      }
      return 'dev-encryption-key-' + Math.random().toString(36);
    })(),
    bcryptRounds: 12,
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Rate Limiting
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Data Retention
  retention: {
    auditLogs: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90'),
    userData: parseInt(process.env.USER_DATA_RETENTION_DAYS || '365'),
    backups: parseInt(process.env.BACKUP_RETENTION_DAYS || '30')
  },

  // Feature Flags
  features: {
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    voiceAssistant: process.env.ENABLE_VOICE_ASSISTANT === 'true',
    emailSync: process.env.ENABLE_EMAIL_SYNC === 'true',
    paymentProcessing: process.env.ENABLE_PAYMENT_PROCESSING === 'true',
    aiContentGeneration: process.env.ENABLE_AI_CONTENT_GENERATION === 'true'
  },

  // External APIs
  externalApis: {
    datafiniti: {
      apiKey: process.env.DATAFINITI_API_KEY || ''
    },
    zillow: {
      apiKey: process.env.ZILLOW_API_KEY || ''
    }
  },

  // Monitoring and Logging
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS === 'true'
  },

  // CORS Configuration
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://your-domain.com'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Backup Configuration
  backup: {
    schedule: process.env.BACKUP_SCHEDULE || '0 0 * * *', // Daily at midnight
    collections: [
      'users',
      'properties',
      'auditLogs',
      'encryptedData',
      'securityAlerts',
      'subscriptions',
      'emails',
      'templates',
      'aiPersonalities',
      'knowledgeBase'
    ]
  },

  // Subscription Plans
  subscriptionPlans: {
    'solo-agent': {
      id: 'solo-agent',
      name: 'Solo Agent',
      price: 69,
      features: [
        'Full Dashboard Access',
        'AI Content Studio',
        'Automated Follow-up Sequences',
        'AI Inbox & Lead Management',
        'Standard Support',
        'Up to 5 Active Listings',
        'Email Automation',
        'QR Code Tracking',
        'Basic Analytics'
      ],
      limitations: {
        listings: 5,
        agents: 1
      }
    },
    'pro-team': {
      id: 'pro-team',
      name: 'Pro Team',
      price: 149,
      features: [
        'Everything in Solo Agent',
        'Team Management',
        'Advanced Analytics',
        'Priority Support',
        'Up to 25 Active Listings',
        'Custom Branding',
        'API Access',
        'Advanced Automation'
      ],
      limitations: {
        listings: 25,
        agents: 5
      }
    },
    'brokerage': {
      id: 'brokerage',
      name: 'Brokerage',
      price: 299,
      features: [
        'Everything in Pro Team',
        'Unlimited Listings',
        'Unlimited Agents',
        'White-label Solution',
        'Dedicated Support',
        'Custom Integrations',
        'Advanced Reporting',
        'Multi-location Support'
      ],
      limitations: {
        listings: -1, // unlimited
        agents: -1 // unlimited
      }
    }
  },

  // AI Content Generation
  aiContent: {
    maxTokens: 2048,
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000, // 30 seconds
    contentTypes: {
      email: {
        maxLength: 500,
        tone: 'professional'
      },
      socialMedia: {
        maxLength: 280,
        tone: 'engaging'
      },
      description: {
        maxLength: 1000,
        tone: 'descriptive'
      },
      videoScript: {
        maxLength: 2000,
        tone: 'conversational'
      }
    }
  },

  // File Upload
  fileUpload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    maxFilesPerUpload: 10,
    storagePath: 'uploads'
  },

  // Email Templates
  emailTemplates: {
    defaultFrom: 'noreply@yourdomain.com',
    defaultFromName: 'Home Listing AI',
    replyTo: 'support@yourdomain.com',
    templates: {
      welcome: {
        subject: 'Welcome to Home Listing AI',
        template: 'welcome-email'
      },
      propertyInquiry: {
        subject: 'New Property Inquiry',
        template: 'property-inquiry'
      },
      followUp: {
        subject: 'Follow-up on Your Interest',
        template: 'follow-up'
      }
    }
  }
};

// Validation schemas
export const validationSchemas = {
  user: {
    email: { type: 'string', required: true, email: true },
    name: { type: 'string', required: true, min: 2, max: 100 },
    phone: { type: 'string', optional: true, pattern: /^\+?[\d\s\-\(\)]+$/ }
  },
  property: {
    title: { type: 'string', required: true, min: 5, max: 200 },
    address: { type: 'string', required: true, min: 10, max: 500 },
    price: { type: 'number', required: true, min: 0 },
    bedrooms: { type: 'number', required: true, min: 0 },
    bathrooms: { type: 'number', required: true, min: 0 },
    squareFeet: { type: 'number', optional: true, min: 0 }
  },
  subscription: {
    planId: { type: 'string', required: true },
    userId: { type: 'string', required: true }
  }
};

// Error messages
export const errorMessages = {
  validation: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    min: 'Value must be at least {min}',
    max: 'Value must be at most {max}',
    pattern: 'Value does not match the required pattern'
  },
  auth: {
    unauthenticated: 'You must be logged in to perform this action',
    unauthorized: 'You do not have permission to perform this action',
    invalidCredentials: 'Invalid email or password'
  },
  subscription: {
    planNotFound: 'Subscription plan not found',
    alreadySubscribed: 'User already has an active subscription',
    paymentFailed: 'Payment processing failed'
  },
  file: {
    tooLarge: 'File size exceeds the maximum limit',
    invalidType: 'File type not supported',
    uploadFailed: 'File upload failed'
  }
};

// Success messages
export const successMessages = {
  subscription: {
    created: 'Subscription created successfully',
    cancelled: 'Subscription cancelled successfully',
    upgraded: 'Subscription upgraded successfully'
  },
  file: {
    uploaded: 'File uploaded successfully',
    processed: 'File processed successfully',
    deleted: 'File deleted successfully'
  },
  content: {
    generated: 'Content generated successfully',
    saved: 'Content saved successfully'
  }
};
