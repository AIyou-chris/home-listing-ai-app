// SessionService removed

export class PerformanceService {
  private static observers: PerformanceObserver[] = [];
  private static isInitialized = false;

  // Initialize performance monitoring
  static initialize(): void {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Monitor long tasks
    this.observeLongTasks();
    
    // Monitor navigation timing
    this.observeNavigationTiming();
    
    // Track initial page load performance
    this.trackPageLoadPerformance();
  }

  // Observe Core Web Vitals (LCP, FID, CLS)
  private static observeWebVitals(): void {
    try {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          // SessionService removed - no-op
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      }

      // First Input Delay (FID)
      if ('PerformanceObserver' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            // SessionService removed - no-op
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      }

      // Cumulative Layout Shift (CLS)
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          // SessionService removed - no-op
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      }
    } catch (error) {
      console.error('Error setting up Web Vitals monitoring:', error);
    }
  }

  // Monitor resource loading performance
  private static observeResourceTiming(): void {
    try {
      if ('PerformanceObserver' in window) {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry: any) => {
            // Track slow resources (> 1 second)
            if (entry.duration > 1000) {
              // SessionService removed - no-op
            }
          });
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      }
    } catch (error) {
      console.error('Error setting up resource timing monitoring:', error);
    }
  }

  // Monitor long tasks that block the main thread
  private static observeLongTasks(): void {
    try {
      if ('PerformanceObserver' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry: any) => {
            // SessionService removed - no-op
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      }
    } catch (error) {
      console.error('Error setting up long task monitoring:', error);
    }
  }

  // Monitor navigation timing
  private static observeNavigationTiming(): void {
    try {
      if ('PerformanceObserver' in window) {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry: any) => {
            const metrics = {
              dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
              tcp: Math.round(entry.connectEnd - entry.connectStart),
              request: Math.round(entry.responseStart - entry.requestStart),
              response: Math.round(entry.responseEnd - entry.responseStart),
              dom: Math.round(entry.domContentLoadedEventEnd - entry.responseEnd),
              load: Math.round(entry.loadEventEnd - entry.loadEventStart),
              total: Math.round(entry.loadEventEnd - entry.startTime)
            };
            
            Object.entries(metrics).forEach(([key, value]) => {
              if (value > 0) {
                // SessionService removed - no-op
              }
            });
          });
        });
        
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      }
    } catch (error) {
      console.error('Error setting up navigation timing monitoring:', error);
    }
  }

  // Track page load performance
  private static trackPageLoadPerformance(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        
        if (navigation) {
          const navStart = navigation.startTime ?? 0
          const metrics = {
            ttfb: navigation.responseStart - navigation.requestStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navStart,
            windowLoad: navigation.loadEventEnd - navStart,
            domInteractive: navigation.domInteractive - navStart
          } as any;
          
          Object.entries(metrics).forEach(([key, value]) => {
            // SessionService removed - no-op
          });
        }
      }, 0);
    });
  }

  // Track custom performance metrics
  static trackCustomMetric(name: string, value: number, unit: string = 'ms'): void {
    // SessionService removed - no-op
  }

  // Track API response times
  static trackApiCall(endpoint: string, duration: number, status: number): void {
    // SessionService removed - no-op

    // Track slow API calls
    if (duration > 2000) {
      // SessionService removed - no-op
    }
  }

  // Track component render times
  static trackComponentRender(componentName: string, renderTime: number): void {
    // SessionService removed - no-op
  }

  // Track memory usage
  static trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      // SessionService removed - no-op
    }
  }

  // Get current performance metrics
  static getCurrentMetrics(): Record<string, any> {
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    
    if (!navigation) return {};
    
    const navStart = navigation.startTime ?? 0
    return {
      ttfb: Math.round(navigation.responseStart - navigation.requestStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navStart),
      windowLoad: Math.round(navigation.loadEventEnd - navStart),
      domInteractive: Math.round(navigation.domInteractive - navStart),
      timestamp: Date.now()
    };
  }

  // Clean up observers
  static cleanup(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
    this.isInitialized = false;
  }
}