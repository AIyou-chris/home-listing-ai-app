// Simple production-safe logger
const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  info: (...args) => {
    console.log('[INFO]', ...args);
  },
  
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
  
  debug: (...args) => {
    if (!isProduction) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  // Only log in development
  dev: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  }
};

module.exports = logger;
