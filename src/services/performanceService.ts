import { SessionService } from './sessionService';

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
          
          SessionService.trackPerformance('LCP', Math.round(lastEntry.startTime), 'ms');
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      }

      // First Input Delay (FID)
      if ('PerformanceObserver' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            SessionService.trackPerformance('FID', Math.round(entry.processingStart - entry.startTime), 'ms');
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
          
          SessionService.trackPerformance('CLS', Math.round(clsValue * 1000) / 1000, 'score');
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
              SessionService.trackEvent('slow_resource', {
                name: entry.name,
                duration: Math.round(entry.duration),
                type: entry.initiatorType,
                size: entry.transferSize || 0
              });
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
            SessionService.trackEvent('long_task', {
              duration: Math.round(entry.duration),
              startTime: Math.round(entry.startTime),
              attribution: entry.attribution?.[0]?.name || 'unknown'
            });
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
              total: Math.round(entry.loadEventEnd - entry.navigationStart)
            };
            
            Object.entries(metrics).forEach(([key, value]) => {
              if (value > 0) {
                SessionService.trackPerformance(`navigation_${key}`, value, 'ms');
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
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            ttfb: navigation.responseStart - navigation.requestStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            windowLoad: navigation.loadEventEnd - navigation.navigationStart,
            domInteractive: navigation.domInteractive - navigation.navigationStart
          };
          
          Object.entries(metrics).forEach(([key, value]) => {
            SessionService.trackPerformance(key, Math.round(value), 'ms');
          });
        }
      }, 0);
    });
  }

  // Track custom performance metrics
  static trackCustomMetric(name: string, value: number, unit: string = 'ms'): void {
    SessionService.trackPerformance(`custom_${name}`, value, unit);
  }

  // Track API response times
  static trackApiCall(endpoint: string, duration: number, status: number): void {
    SessionService.trackEvent('api_call', {
      endpoint,
      duration: Math.round(duration),
      status,
      timestamp: Date.now()
    });

    // Track slow API calls
    if (duration > 2000) {
      SessionService.trackEvent('slow_api_call', {
        endpoint,
        duration: Math.round(duration),
        status
      });
    }
  }

  // Track component render times
  static trackComponentRender(componentName: string, renderTime: number): void {
    SessionService.trackPerformance(`component_${componentName}`, renderTime, 'ms');
  }

  // Track memory usage
  static trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      SessionService.trackEvent('memory_usage', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        timestamp: Date.now()
      });
    }
  }

  // Get current performance metrics
  static getCurrentMetrics(): Record<string, any> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (!navigation) return {};
    
    return {
      ttfb: Math.round(navigation.responseStart - navigation.requestStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
      windowLoad: Math.round(navigation.loadEventEnd - navigation.navigationStart),
      domInteractive: Math.round(navigation.domInteractive - navigation.navigationStart),
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