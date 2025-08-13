import React from 'react';
import { DEMO_ANALYTICS_DATA } from '../demoConstants';
import { AnalyticsData, LeadSourceIconType } from '../types';

// Brand icon for stability
const FacebookIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path></svg>);


const StatCard: React.FC<{ title: string; value: string; icon: string, iconBgColor: string, iconColor: string }> = ({ title, value, icon, iconBgColor, iconColor }) => (
  <div className="bg-white rounded-lg shadow-sm p-5 flex items-center space-x-4 border border-slate-200/60">
    <div className={`rounded-full p-3 ${iconBgColor}`}>
        <span className={`material-symbols-outlined w-6 h-6 ${iconColor}`}>{icon}</span>
    </div>
    <div>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-500">{title}</p>
    </div>
  </div>
);

const FunnelStep: React.FC<{ icon: string; title: string; value: number; color: string; isFirst?: boolean; iconColor: string; }> = ({ icon, title, value, color, isFirst = false, iconColor }) => (
  <div className="relative flex items-center">
    {!isFirst && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-px h-8 bg-slate-300" />
    )}
    <div className={`relative z-10 w-full p-4 rounded-lg border-2 ${color} flex items-center gap-4`}>
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner">
        <span className={`material-symbols-outlined w-6 h-6 ${iconColor}`}>{icon}</span>
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800">{value.toLocaleString()}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>
    </div>
  </div>
);

const PerformanceOverview: React.FC<{ data: AnalyticsData['performanceOverview'] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold text-slate-800">Performance Overview</h3>
        <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-100 transition">
          <span>Last 30 Days</span>
          <span className="material-symbols-outlined w-4 h-4">expand_more</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="New Leads" value={data.newLeads.toString()} icon="group" iconBgColor="bg-blue-100" iconColor="text-blue-600" />
        <StatCard title="Conversion Rate" value={`${data.conversionRate}%`} icon="trending_up" iconBgColor="bg-green-100" iconColor="text-green-600" />
        <StatCard title="Appointments Set" value={data.appointmentsSet.toString()} icon="calendar_today" iconBgColor="bg-purple-100" iconColor="text-purple-600" />
        <StatCard title="Avg. AI Response" value={data.avgAiResponseTime} icon="schedule" iconBgColor="bg-orange-100" iconColor="text-orange-600" />
      </div>

      <div className="mt-8 pt-8 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h4 className="text-lg font-bold text-slate-800 mb-4">Lead Funnel</h4>
          <div className="space-y-8">
            <FunnelStep
              icon="group"
              title="Leads Captured"
              value={data.leadFunnel.leadsCaptured}
              color="border-blue-300 bg-blue-50"
              iconColor="text-blue-500"
              isFirst
            />
            <FunnelStep
              icon="memory"
              title="AI Qualified"
              value={data.leadFunnel.aiQualified}
              color="border-purple-300 bg-purple-50"
              iconColor="text-purple-500"
            />
            <FunnelStep
              icon="mail"
              title="Contacted by Agent"
              value={data.leadFunnel.contactedByAgent}
              color="border-orange-300 bg-orange-50"
              iconColor="text-orange-500"
            />
             <FunnelStep
              icon="check_circle"
              title="Appointments Set"
              value={data.leadFunnel.appointmentsSet}
              color="border-green-300 bg-green-50"
              iconColor="text-green-500"
            />
          </div>
        </div>
        <div className="lg:col-span-2">
           <h4 className="text-lg font-bold text-slate-800 mb-4">Lead & Appointment Trends</h4>
           <div className="h-96 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
             <p className="text-slate-500">Trend chart coming soon.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const LeadSourceAnalysis: React.FC<{ data: AnalyticsData['leadSourceAnalysis'] }> = ({ data }) => {
    const iconMapping: Record<LeadSourceIconType, React.ReactElement> = {
        app: <span className="material-symbols-outlined w-5 h-5 text-blue-600">smartphone</span>,
        facebook: <FacebookIcon className="w-5 h-5 text-blue-800" />,
        zillow: <span className="material-symbols-outlined w-5 h-5 text-teal-600">home_work</span>,
        manual: <span className="material-symbols-outlined w-5 h-5 text-slate-600">edit</span>,
    };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-6">Lead Source Analysis</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
            <h4 className="text-lg font-bold text-slate-800 mb-4">Leads by Source</h4>
            <div className="h-64 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                <p className="text-slate-500">Donut chart component would go here.</p>
            </div>
        </div>
        <div className="lg:col-span-2">
            <h4 className="text-lg font-bold text-slate-800 mb-4">Source Performance</h4>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="py-2 px-3 font-semibold">Source</th>
                            <th className="py-2 px-3 font-semibold text-center">Leads</th>
                            <th className="py-2 px-3 font-semibold text-center">Conv. Rate</th>
                            <th className="py-2 px-3 font-semibold text-center">Appointments</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((source, index) => {
                            const appointments = Math.round((source.leadCount * source.conversionRate) / 100);
                            return (
                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full">
                                                {iconMapping[source.icon]}
                                            </div>
                                            <span className="font-medium text-slate-700">{source.sourceName}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 font-medium text-slate-800 text-center">{source.leadCount}</td>
                                    <td className="py-3 px-3 text-slate-600 text-center">{source.conversionRate.toFixed(1)}%</td>
                                    <td className="py-3 px-3 font-bold text-primary-700 text-center">{appointments}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const data = DEMO_ANALYTICS_DATA;

  return (
    <div className="space-y-8">
      <PerformanceOverview data={data.performanceOverview} />
      <LeadSourceAnalysis data={data.leadSourceAnalysis} />
    </div>
  );
};

export default AnalyticsPage;
