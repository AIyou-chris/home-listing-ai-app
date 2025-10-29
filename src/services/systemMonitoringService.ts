import AdminService from './adminService';
import { SystemAlert } from '../types';

// Health status types
export interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  timestamp: string;
  responseTime?: number; // milliseconds
  details?: {
    [key: string]: any;
  };
}

// Performance metrics
export interface PerformanceMetrics {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  networkLatency: number; // milliseconds
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number; // percentage
  uptime: number; // seconds
  lastUpdated: string;
}

// Resource usage
export interface ResourceUsage {
  cpu: {
    current: number; // percentage
    average: number; // percentage
    peak: number; // percentage
  };
  memory: {
    used: number; // MB
    total: number; // MB
    available: number; // MB
    percentage: number;
  };
  disk: {
    used: number; // GB
    total: number; // GB
    available: number; // GB
    percentage: number;
  };
  network: {
    bytesIn: number; // bytes per second
    bytesOut: number; // bytes per second
    connections: number;
  };
  lastUpdated: string;
}

// Monitoring configuration
export interface MonitoringConfig {
  checkInterval: number; // milliseconds
  alertThresholds: {
    cpuWarning: number; // percentage
    cpuCritical: number; // percentage
    memoryWarning: number; // percentage
    memoryCritical: number; // percentage
    diskWarning: number; // percentage
    diskCritical: number; // percentage
    responseTimeWarning: number; // milliseconds
    responseTimeCritical: number; // milliseconds
  };
  enabledChecks: {
    database: boolean;
    api: boolean;
    ai: boolean;
    email: boolean;
  };
}

export class SystemMonitoringService {
  private static instance: SystemMonitoringService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private config: MonitoringConfig = {
    checkInterval: 30000, // 30 seconds
    alertThresholds: {
      cpuWarning: 70,
      cpuCritical: 90,
      memoryWarning: 80,
      memoryCritical: 95,
      diskWarning: 85,
      diskCritical: 95,
      responseTimeWarning: 1000,
      responseTimeCritical: 3000
    },
    enabledChecks: {
      database: true,
      api: true,
      ai: true,
      email: true
    }
  };

  private constructor() {}

  static getInstance(): SystemMonitoringService {
    if (!SystemMonitoringService.instance) {
      SystemMonitoringService.instance = new SystemMonitoringService();
    }
    return SystemMonitoringService.instance;
  }

  // Real-time monitoring
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('System monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting system monitoring...');

    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.checkInterval);

    // Perform initial health check
    this.performHealthChecks();
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.warn('System monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('System monitoring stopped');
  }

  // Health checks
  async checkDatabaseHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity by attempting to read admin settings
      await AdminService.getSystemSettings();
      
      const responseTime = Date.now() - startTime;
      const status: HealthStatus = {
        status: 'healthy',
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          connectionType: 'firestore',
          responseTime
        }
      };

      // Check response time thresholds
      if (responseTime > this.config.alertThresholds.responseTimeCritical) {
        status.status = 'error';
        status.message = `Database response time critical: ${responseTime}ms`;
      } else if (responseTime > this.config.alertThresholds.responseTimeWarning) {
        status.status = 'warning';
        status.message = `Database response time slow: ${responseTime}ms`;
      }

      return status;
    } catch (error) {
      return {
        status: 'error',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async checkAPIHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Simulate API health check (replace with actual API endpoint)
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          status: 'error',
          message: `API health check failed: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
          responseTime,
          details: {
            statusCode: response.status,
            statusText: response.statusText
          }
        };
      }

      const status: HealthStatus = {
        status: 'healthy',
        message: 'API health check successful',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          statusCode: response.status
        }
      };

      // Check response time thresholds
      if (responseTime > this.config.alertThresholds.responseTimeCritical) {
        status.status = 'error';
        status.message = `API response time critical: ${responseTime}ms`;
      } else if (responseTime > this.config.alertThresholds.responseTimeWarning) {
        status.status = 'warning';
        status.message = `API response time slow: ${responseTime}ms`;
      }

      return status;
    } catch (error) {
      return {
        status: 'error',
        message: `API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async checkAIHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Simulate AI service health check (replace with actual AI service endpoint)
      const response = await fetch('/api/ai/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          status: 'error',
          message: `AI service health check failed: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
          responseTime,
          details: {
            statusCode: response.status,
            statusText: response.statusText
          }
        };
      }

      const status: HealthStatus = {
        status: 'healthy',
        message: 'AI service health check successful',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          statusCode: response.status
        }
      };

      // Check response time thresholds
      if (responseTime > this.config.alertThresholds.responseTimeCritical) {
        status.status = 'error';
        status.message = `AI service response time critical: ${responseTime}ms`;
      } else if (responseTime > this.config.alertThresholds.responseTimeWarning) {
        status.status = 'warning';
        status.message = `AI service response time slow: ${responseTime}ms`;
      }

      return status;
    } catch (error) {
      return {
        status: 'error',
        message: `AI service health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async checkEmailHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Simulate email service health check (replace with actual email service endpoint)
      const response = await fetch('/api/email/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          status: 'error',
          message: `Email service health check failed: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
          responseTime,
          details: {
            statusCode: response.status,
            statusText: response.statusText
          }
        };
      }

      const status: HealthStatus = {
        status: 'healthy',
        message: 'Email service health check successful',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          statusCode: response.status
        }
      };

      // Check response time thresholds
      if (responseTime > this.config.alertThresholds.responseTimeCritical) {
        status.status = 'error';
        status.message = `Email service response time critical: ${responseTime}ms`;
      } else if (responseTime > this.config.alertThresholds.responseTimeWarning) {
        status.status = 'warning';
        status.message = `Email service response time slow: ${responseTime}ms`;
      }

      return status;
    } catch (error) {
      return {
        status: 'error',
        message: `Email service health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async checkSystemHealth(): Promise<HealthStatus> {
    if (!this.config.enabledChecks.api) {
      return {
        status: 'warning',
        message: 'API health check disabled in monitoring configuration',
        timestamp: new Date().toISOString()
      };
    }
    return this.checkAPIHealth();
  }

  async checkAIServicesHealth(): Promise<HealthStatus> {
    if (!this.config.enabledChecks.ai) {
      return {
        status: 'warning',
        message: 'AI health check disabled in monitoring configuration',
        timestamp: new Date().toISOString()
      };
    }
    return this.checkAIHealth();
  }

  // Performance metrics
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // Simulate performance metrics (replace with actual system monitoring)
    const now = Date.now();
    
    return {
      cpuUsage: Math.random() * 100, // Simulate CPU usage
      memoryUsage: Math.random() * 100, // Simulate memory usage
      diskUsage: Math.random() * 100, // Simulate disk usage
      networkLatency: Math.random() * 1000, // Simulate network latency
      activeConnections: Math.floor(Math.random() * 1000), // Simulate active connections
      requestsPerSecond: Math.random() * 100, // Simulate RPS
      errorRate: Math.random() * 5, // Simulate error rate
      uptime: (now - (now - 86400000)) / 1000, // Simulate uptime (24 hours)
      lastUpdated: new Date().toISOString()
    };
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    // Simulate resource usage (replace with actual system monitoring)
    const cpuUsage = Math.random() * 100;
    const memoryUsage = Math.random() * 100;
    const diskUsage = Math.random() * 100;
    
    return {
      cpu: {
        current: cpuUsage,
        average: cpuUsage * 0.8,
        peak: cpuUsage * 1.2
      },
      memory: {
        used: Math.random() * 8192, // MB
        total: 16384, // MB
        available: Math.random() * 8192, // MB
        percentage: memoryUsage
      },
      disk: {
        used: Math.random() * 500, // GB
        total: 1000, // GB
        available: Math.random() * 500, // GB
        percentage: diskUsage
      },
      network: {
        bytesIn: Math.random() * 1000000, // bytes per second
        bytesOut: Math.random() * 1000000, // bytes per second
        connections: Math.floor(Math.random() * 1000)
      },
      lastUpdated: new Date().toISOString()
    };
  }

  // Alert management
  async createAlert(alert: Omit<SystemAlert, 'id'>): Promise<void> {
    try {
      await AdminService.createSystemAlert(
        alert.type,
        alert.title,
        alert.description,
        alert.severity,
        alert.component
      );
    } catch (error) {
      console.error('Failed to create system alert:', error);
      throw error;
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      await AdminService.resolveSystemAlert(alertId);
    } catch (error) {
      console.error('Failed to resolve system alert:', error);
      throw error;
    }
  }

  // Private methods
  private async performHealthChecks(): Promise<void> {
    const checks = [];

    if (this.config.enabledChecks.database) {
      checks.push(this.checkDatabaseHealth());
    }
    if (this.config.enabledChecks.api) {
      checks.push(this.checkAPIHealth());
    }
    if (this.config.enabledChecks.ai) {
      checks.push(this.checkAIHealth());
    }
    if (this.config.enabledChecks.email) {
      checks.push(this.checkEmailHealth());
    }

    try {
      const results = await Promise.allSettled(checks);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const healthStatus = result.value;
          if (healthStatus.status === 'error') {
            this.handleHealthCheckError(healthStatus);
          } else if (healthStatus.status === 'warning') {
            this.handleHealthCheckWarning(healthStatus);
          }
        } else {
          console.error(`Health check ${index} failed:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Error performing health checks:', error);
    }
  }

  private async handleHealthCheckError(healthStatus: HealthStatus): Promise<void> {
    console.error('Health check error:', healthStatus);
    
    await this.createAlert({
      type: 'error',
      title: `System Health Error: ${healthStatus.message}`,
      description: healthStatus.message,
      severity: 'high',
      component: 'system-monitoring',
      status: 'active',
      createdAt: new Date().toISOString()
    } as any);
  }

  private async handleHealthCheckWarning(healthStatus: HealthStatus): Promise<void> {
    console.warn('Health check warning:', healthStatus);
    
    await this.createAlert({
      type: 'warning',
      title: `System Health Warning: ${healthStatus.message}`,
      description: healthStatus.message,
      severity: 'medium',
      component: 'system-monitoring',
      status: 'open',
      createdAt: new Date().toISOString()
    } as any);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Monitoring configuration updated:', this.config);
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

export default SystemMonitoringService;
