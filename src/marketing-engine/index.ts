// The marketing engine's screens, for the host app to place in its admin. Everything the screens need from the host app
// (login-aware fetch, API address, Supabase client, blog editor) comes through ./host/ and nowhere else.
export { default as AutopilotPanel } from './screens/AutopilotPanel';
export { default as AdminMarketingStudio } from './screens/AdminMarketingStudio';
export { default as ConnectedAccountsPanel } from './screens/ConnectedAccountsPanel';
export { default as MarketingAnalyticsPanel } from './screens/MarketingAnalyticsPanel';
export { default as FbGroupsPanel } from './screens/FbGroupsPanel';
export { TodayView } from './screens/TodayView';
export type { TodayData } from './screens/TodayView';
