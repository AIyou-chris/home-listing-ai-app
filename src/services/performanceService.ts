// SessionService removed

interface PerformanceMemoryEntry {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

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
          const lastEntry = entries.at(-1) as PerformanceEntry | undefined;

          if (lastEntry) {
            console.debug('PerformanceService:LCP', lastEntry.startTime);
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      }

      // First Input Delay (FID)
      if ('PerformanceObserver' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceEventTiming[];
          entries.forEach((entry) => {
            console.debug('PerformanceService:FID', entry.processingStart - entry.startTime);
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      }

      // Cumulative Layout Shift (CLS)
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as LayoutShift[];
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });

          console.debug('PerformanceService:CLS', clsValue);
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
          const entries = list.getEntries() as PerformanceResourceTiming[];

          entries.forEach((entry) => {
            // Track slow resources (> 1 second)
            if (entry.duration > 1000) {
              console.debug('PerformanceService:slow resource', entry.name, entry.duration);
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

          entries.forEach((entry) => {
            console.debug('PerformanceService:long task', entry.startTime, entry.duration);
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
          const entries = list.getEntries() as PerformanceNavigationTiming[];

          entries.forEach((entry) => {
            const metrics: Record<string, number> = {
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
                console.debug(`PerformanceService:navigation ${key}`, value);
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
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

        if (navigationEntry) {
          const navStart = navigationEntry.startTime ?? 0;
          const metrics: Record<string, number> = {
            ttfb: navigationEntry.responseStart - navigationEntry.requestStart,
            domContentLoaded: navigationEntry.domContentLoadedEventEnd - navStart,
            windowLoad: navigationEntry.loadEventEnd - navStart,
            domInteractive: navigationEntry.domInteractive - navStart
          };

          Object.entries(metrics).forEach(([key, value]) => {
            console.debug(`PerformanceService:page load ${key}`, value);
          });
        }
      }, 0);
    });
  }

  // Track custom performance metrics
  static trackCustomMetric(name: string, value: number, unit: string = 'ms'): void {
    console.debug('PerformanceService:custom metric', { name, value, unit });
  }

  // Track API response times
  static trackApiCall(endpoint: string, duration: number, status: number): void {
    console.debug('PerformanceService:api call', { endpoint, duration, status });

    if (duration > 2000) {
      console.warn('PerformanceService:slow api call detected', { endpoint, duration, status });
    }
  }

  // Track component render times
  static trackComponentRender(componentName: string, renderTime: number): void {
    console.debug('PerformanceService:component render', { componentName, renderTime });
  }

  // Track memory usage
  static trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memoryInfo = (performance as unknown as { memory: PerformanceMemoryEntry }).memory;

      console.debug('PerformanceService:memory usage', memoryInfo.usedJSHeapSize);
    }
  }

  // Get current performance metrics
  static getCurrentMetrics(): Record<string, number> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

    if (!navigation) return {};

    const navStart = navigation.startTime ?? 0;
    return {
      ttfb: Math.round(navigation.responseStart - navigation.requestStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navStart),
      windowLoad: Math.round(navigation.loadEventEnd - navStart),
      domInteractive: Math.round(navigation.domInteractive - navStart)
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