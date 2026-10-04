import { resolveDashboardPageTitle } from '../dashboardPageTitle'

describe('resolveDashboardPageTitle', () => {
  it.each([
    ['/dashboard/today', 'Today'],
    ['/dashboard/lo-today', 'Today'],
    ['/dashboard/listings', 'Listings'],
    ['/dashboard/listings/abc/edit', 'Listings'],
    ['/dashboard/lo-listings', 'Listings'],
    ['/dashboard/lo-listings/8fa313b6-386b/share-kit', 'Listings'],
    ['/dashboard/leads', 'Leads'],
    ['/dashboard/leads/123', 'Leads'],
    ['/dashboard/lo-leads', 'Leads'],
    ['/dashboard/appointments', 'Appointments'],
    ['/dashboard/lo-appointments', 'Appointments'],
    ['/dashboard/lo-partners', 'Partners'],
    ['/dashboard/lo-chatbot', 'AI Brain'],
    ['/dashboard/lo-invoices', 'Invoices'],
    ['/dashboard/office', 'Office'],
    ['/dashboard/settings/billing', 'Settings'],
    ['/demo-dashboard/lo-listings', 'Listings']
  ])('%s is titled %s', (path, title) => {
    expect(resolveDashboardPageTitle(path)).toBe(title)
  })
})
