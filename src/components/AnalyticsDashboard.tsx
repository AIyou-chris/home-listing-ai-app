import React, { useState, useEffect } from 'react';
import { Property, Lead, Appointment } from '../types';

interface AnalyticsDashboardProps {
  properties: Property[];
  leads: Lead[];
  appointments: Appointment[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
}

interface AnalyticsData {
  totalProperties: number;
  activeListings: number;
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  totalAppointments: number;
  completedAppointments: number;
  conversionRate: number;
  averageDaysOnMarket: number;
  totalValue: number;
  monthlyGrowth: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  properties,
  leads,
  appointments,
  timeRange,
  onTimeRangeChange
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalProperties: 0,
    activeListings: 0,
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    conversionRate: 0,
    averageDaysOnMarket: 0,
    totalValue: 0,
    monthlyGrowth: 0
  });

  useEffect(() => {
    // Calculate analytics data based on current data
    const calculateAnalytics = () => {
      const activeProperties = properties.filter(p => p.status === 'Active');
      const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
      const newLeadsCount = leads.filter(l => l.status === 'New').length;
      const qualifiedLeadsCount = leads.filter(l => l.status === 'Qualified').length;
      const completedAppointmentsCount = appointments.filter(a => a.status === 'Completed').length;
      const conversionRate = leads.length > 0 ? (qualifiedLeadsCount / leads.length) * 100 : 0;
      const averageDaysOnMarket = properties.length > 0 
        ? properties.reduce((sum, p) => {
            const listedDate = new Date(p.listedDate || Date.now());
            const days = Math.floor((Date.now() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / properties.length 
        : 0;

      setAnalyticsData({
        totalProperties: properties.length,
        activeListings: activeProperties.length,
        totalLeads: leads.length,
        newLeads: newLeadsCount,
        qualifiedLeads: qualifiedLeadsCount,
        totalAppointments: appointments.length,
        completedAppointments: completedAppointmentsCount,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageDaysOnMarket: Math.round(averageDaysOnMarket),
        totalValue,
        monthlyGrowth: 12.5 // Mock data for now
      });
    };

    calculateAnalytics();
  }, [properties, leads, appointments]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: string;
    color: string;
  }> = ({ title, value, change, icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-sm text-slate-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <span className="material-symbols-outlined text-white text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const ChartCard: React.FC<{
    title: string;
    children: React.ReactNode;
  }> = ({ title, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-500 mt-1">Track your performance and insights</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 p-1">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Properties"
          value={analyticsData.totalProperties}
          change={analyticsData.monthlyGrowth}
          icon="home"
          color="bg-blue-500"
        />
        <MetricCard
          title="Active Listings"
          value={analyticsData.activeListings}
          change={8.2}
          icon="real_estate_agent"
          color="bg-green-500"
        />
        <MetricCard
          title="Total Leads"
          value={analyticsData.totalLeads}
          change={15.3}
          icon="person_add"
          color="bg-purple-500"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${analyticsData.conversionRate}%`}
          change={2.1}
          icon="trending_up"
          color="bg-orange-500"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="New Leads"
          value={analyticsData.newLeads}
          icon="person_add"
          color="bg-blue-500"
        />
        <MetricCard
          title="Qualified Leads"
          value={analyticsData.qualifiedLeads}
          icon="verified_user"
          color="bg-green-500"
        />
        <MetricCard
          title="Completed Appointments"
          value={analyticsData.completedAppointments}
          icon="event_available"
          color="bg-purple-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Lead Status Distribution">
          <div className="space-y-3">
            {[
              { status: 'New', count: analyticsData.newLeads, color: 'bg-blue-500' },
              { status: 'Qualified', count: analyticsData.qualifiedLeads, color: 'bg-green-500' },
              { status: 'Contacted', count: leads.filter(l => l.status === 'Contacted').length, color: 'bg-yellow-500' },
              { status: 'Showing', count: leads.filter(l => l.status === 'Showing').length, color: 'bg-purple-500' },
              { status: 'Lost', count: leads.filter(l => l.status === 'Lost').length, color: 'bg-red-500' }
            ].map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm font-medium text-slate-700">{item.status}</span>
                </div>
                <span className="text-sm text-slate-600">{item.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Property Performance">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Average Days on Market</span>
              <span className="text-lg font-semibold text-slate-900">{analyticsData.averageDaysOnMarket} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Portfolio Value</span>
              <span className="text-lg font-semibold text-slate-900">
                ${analyticsData.totalValue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Appointment Success Rate</span>
              <span className="text-lg font-semibold text-slate-900">
                {analyticsData.totalAppointments > 0 
                  ? Math.round((analyticsData.completedAppointments / analyticsData.totalAppointments) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <ChartCard title="Recent Activity">
        <div className="space-y-4">
          {leads.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                <p className="text-xs text-slate-500">New lead added</p>
              </div>
              <span className="text-xs text-slate-400">{lead.date}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};

export default AnalyticsDashboard;
