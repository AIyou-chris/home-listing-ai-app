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

// Firebase ambient shims (temporary until all files are migrated)
declare type Timestamp = any;
declare const Timestamp: any;

declare const collection: any;
declare const addDoc: any;
declare const serverTimestamp: any;
declare const deleteDoc: any;
declare const doc: any;
declare const query: any;
declare const where: any;
declare const orderBy: any;
declare const getDocs: any;
declare const getDoc: any;
declare const setDoc: any;
declare const updateDoc: any;
declare const writeBatch: any;
declare const onSnapshot: any;
declare type QuerySnapshot<T = any> = any;
declare type DocumentData = any;
declare const limit: any;

declare const ref: any;
declare const storage: any;
declare const uploadBytes: any;
declare const getDownloadURL: any;
declare const deleteObject: any;

declare function httpsCallable(...args: any[]): any;
declare function getFunctions(...args: any[]): any;
declare function getAuth(...args: any[]): any;

declare interface User { getIdToken?: (...args: any[]) => Promise<string> }

declare const db: any;
declare const functions: any;
