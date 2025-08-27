// Temporary shims for third-party or service return types used across the app
declare module '../services/analyticsService' {
  const analyticsService: any;
  export { analyticsService };
}

declare module '../services/qrCodeService' {
  const qrCodeService: any;
  export { qrCodeService };
}

declare module '../services/securityService' {
  const SecurityService: any;
  export { SecurityService };
}

// Generic shim
declare const __DEV__: boolean;
