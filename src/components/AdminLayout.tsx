import React from 'react'

import AdminCRMContactsSupabase from './AdminCRMContactsSupabase'
import AdminBlogWriterPanel from './admin/admin-blog-writer-panel'
import AIContentPage from './AIContentPage'
import AIInteractiveTraining from './AIInteractiveTraining'
import AICardBuilderPage from '../pages/AICardBuilder'
import EnhancedAISidekicksHub from './EnhancedAISidekicksHub'

const AdminPlaceholder: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <div className="mx-auto max-w-3xl py-16 px-6">
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {description ? <p className="mt-3 text-sm text-slate-600">{description}</p> : null}
    </div>
  </div>
)

type AdminLayoutView =
  | 'admin-dashboard'
  | 'admin-contacts'
  | 'admin-leads'
  | 'admin-knowledge-base'
  | 'admin-ai-training'
  | 'admin-ai-card'
  | 'admin-ai-content'
  | 'admin-analytics'
  | 'admin-security'
  | 'admin-billing'
  | 'admin-settings'
  | 'admin-blog-writer'

interface AdminLayoutProps {
  currentView: AdminLayoutView
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ currentView }) => {
  switch (currentView) {
    case 'admin-dashboard':
      return (
        <AdminPlaceholder
          title="Admin Overview"
          description="The consolidated admin dashboard is being rebuilt. Use the other tabs to manage contacts, AI tools, and content."
        />
      )
    case 'admin-contacts':
    case 'admin-leads':
      return (
        <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <AdminCRMContactsSupabase />
        </div>
      )
    case 'admin-knowledge-base':
      return <EnhancedAISidekicksHub />
    case 'admin-ai-training':
      return <AIInteractiveTraining />
    case 'admin-ai-card':
      return <AICardBuilderPage />
    case 'admin-ai-content':
      return <AIContentPage />
    case 'admin-blog-writer':
      return <AdminBlogWriterPanel />
    case 'admin-settings':
      return (
        <AdminPlaceholder
          title="Admin Settings"
          description="Global configuration will live here once the new flow is finished. For now, manage tools from the other tabs."
        />
      )
    case 'admin-billing':
      return (
        <AdminPlaceholder
          title="Billing Console Coming Soon"
          description="Subscription management is moving into a separate module we can toggle on after launch."
        />
      )
    case 'admin-security':
      return (
        <AdminPlaceholder
          title="Security Center Coming Soon"
          description="Security monitoring is being rebuilt. Reach out if you need the legacy snapshot."
        />
      )
    case 'admin-analytics':
      return (
        <AdminPlaceholder
          title="Analytics Coming Soon"
          description="Funnel and engagement analytics will return as an opt-in module."
        />
      )
    default:
      return (
        <AdminPlaceholder
          title="Admin Area"
          description="Choose a section from the sidebar. If a tool is missing, let us know so we can stage it."
        />
      )
  }
}

export default AdminLayout

