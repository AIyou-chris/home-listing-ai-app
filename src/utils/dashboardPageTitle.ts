// Name shown in the dashboard header and the browser tab. Loan officer pages live under /lo-*
// (for example /dashboard/lo-listings), so the optional "lo-" prefix has to be matched too.
export const resolveDashboardPageTitle = (pathname: string): string => {
  if (pathname.includes('/command-center')) return 'Command Center'
  if (/\/office(\/|$)/.test(pathname)) return 'Office'
  if (pathname.includes('/lo-chatbot')) return 'AI Brain'
  if (pathname.includes('/lo-partners')) return 'Partners'
  if (pathname.includes('/lo-invoices')) return 'Invoices'
  if (/\/(lo-)?listings(\/|$)/.test(pathname)) return 'Listings'
  if (/\/(lo-)?leads(\/|$)/.test(pathname)) return 'Leads'
  if (/\/(lo-)?appointments(\/|$)/.test(pathname)) return 'Appointments'
  if (pathname.includes('/settings')) return 'Settings'
  return 'Today'
}
