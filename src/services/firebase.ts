// Firebase no-op shim to allow the app to compile while we migrate to Supabase.
// Any code importing these should gracefully no-op during the migration.

// Minimal stubs
export const app = {} as any;
export const auth = {
	currentUser: null,
	onAuthStateChanged: (_cb: any) => () => {}
} as any;
export const db = {} as any;
export const functions = {} as any;
export const storage = {} as any;

// Prevent accidental usage (silenced per request)
// if (import.meta.env.DEV) {
// 	console.warn('[firebase shim] Firebase services are stubbed. No network calls will be made.');
// }