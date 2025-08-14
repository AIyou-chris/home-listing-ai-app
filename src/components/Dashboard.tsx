
import React, { useState } from 'react';
import { Property, Lead, Appointment, LeadStatus, AgentTask, TaskPriority, AgentProfile } from '../types';
import SmartTaskManager from './SmartTaskManager';

interface DashboardProps {
  agentProfile: AgentProfile;
  properties: Property[];
  leads: Lead[];
  appointments: Appointment[];
  tasks: AgentTask[];
  onSelectProperty: (id: string) => void;
  onAddNew: () => void;
  onTaskUpdate?: (taskId: string, updates: Partial<AgentTask>) => void;
  onTaskAdd?: (task: AgentTask) => void;
  onTaskDelete?: (taskId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: string, bgColor: string, iconColor: string }> = ({ title, value, icon, bgColor, iconColor }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
        <div className="flex items-center">
            <div className={`p-3 rounded-lg ${bgColor}`}>
                <span className={`material-symbols-outlined h-6 w-6 ${iconColor}`}>{icon}</span>
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">{title}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    </div>
);

const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 h-full flex flex-col">
            <button
                type="button"
                className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 w-full text-left md:pointer-events-none"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined w-6 h-6 text-slate-600">{icon}</span>
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                </div>
                <span className="material-symbols-outlined w-6 h-6 text-slate-500 transition-transform duration-300 md:hidden" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                </span>
            </button>
                        <div className={`p-2 flex-grow ${isOpen ? 'block' : 'hidden'} md:block`}>
                {children}
            </div>
        </div>
    );
};

const LeadStatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
    const statusStyles: Record<LeadStatus, string> = {
        'New': 'bg-blue-100 text-blue-700',
        'Qualified': 'bg-green-100 text-green-700',
        'Contacted': 'bg-yellow-100 text-yellow-700',
        'Showing': 'bg-purple-100 text-purple-700',
        'Lost': 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const TaskPriorityIndicator: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
    const priorityStyles: Record<TaskPriority, string> = {
        'High': 'bg-red-500',
        'Medium': 'bg-yellow-400',
        'Low': 'bg-sky-500'
    };
    return <div className={`w-2.5 h-2.5 rounded-full ${priorityStyles[priority]}`} title={`Priority: ${priority}`}></div>;
};


const Dashboard: React.FC<DashboardProps> = ({ 
  agentProfile, 
  properties, 
  leads, 
  appointments, 
  tasks, 
  onSelectProperty, 
  onAddNew,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete
}) => {
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const newLeadsCount = leads.filter(l => l.status === 'New').length;

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Quick Actions Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back, {agentProfile.name}! Here's an overview of your real estate activity.</p>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={onAddNew}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105"
            >
                <span className="material-symbols-outlined h-5 w-5">add</span>
                <span>Add New Listing</span>
            </button>
            {agentProfile.headshotUrl ? (
                <img src={agentProfile.headshotUrl} alt={agentProfile.name} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
                <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border-2 border-white shadow-sm">
                    <span className="material-symbols-outlined">person</span>
                </div>
            )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Active Listings" value={String(properties.length)} icon="home_work" bgColor="bg-blue-100" iconColor="text-blue-600" />
        <StatCard title="New Leads" value={String(newLeadsCount)} icon="group" bgColor="bg-green-100" iconColor="text-green-600" />
        <StatCard title="Appointments" value={String(appointments.length)} icon="calendar_today" bgColor="bg-purple-100" iconColor="text-purple-600" />
        <StatCard title="AI Interactions" value="0" icon="memory" bgColor="bg-orange-100" iconColor="text-orange-600" />
      </div>

      {/* Main Content */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Upcoming Appointments */}
            <SectionCard title="Upcoming Appointments" icon="calendar_today">
                <div className="flex flex-col h-full">
                    {/* Mini Calendar */}
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <div className="text-center mb-2">
                            <h4 className="text-sm font-semibold text-slate-700">August 2025</h4>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-xs">
                            {/* Day headers */}
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                <div key={day} className="text-center text-slate-500 font-medium py-1">
                                    {day}
                                </div>
                            ))}
                            {/* Calendar days */}
                            {Array.from({ length: 31 }, (_, i) => {
                                const day = i + 1;
                                const hasAppointment = appointments.some(appt => {
                                    const apptDate = new Date(appt.date);
                                    return apptDate.getDate() === day && apptDate.getMonth() === 7; // August is month 7 (0-indexed)
                                });
                                const isToday = day === 9; // August 9th
                                
                                return (
                                    <div 
                                        key={day} 
                                        className={`
                                            text-center py-1 rounded cursor-pointer transition-colors
                                            ${isToday ? 'bg-primary-600 text-white font-semibold' : ''}
                                            ${hasAppointment && !isToday ? 'bg-orange-100 text-orange-700 font-semibold' : ''}
                                            ${!isToday && !hasAppointment ? 'text-slate-600 hover:bg-slate-200' : ''}
                                        `}
                                    >
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Appointments List */}
                    <div className="flex-1 space-y-2 overflow-y-auto">
                        <h5 className="text-sm font-semibold text-slate-700 mb-2">Today's Appointments</h5>
                        {appointments.slice(0, 3).map(appt => (
                            <div key={appt.id} className="p-2 rounded-lg hover:bg-slate-50 transition-colors border-l-2 border-primary-500">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-slate-800 text-sm">{appt.leadName}</p>
                                    <p className="text-xs font-bold text-slate-700">{appt.time}</p>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-slate-500 truncate pr-4">{appt.propertyAddress}</p>
                                    <p className="text-xs text-slate-500">{new Date(appt.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {appointments.length === 0 && <p className="text-center text-sm text-slate-400 p-4">No upcoming appointments.</p>}
                    </div>
                </div>
            </SectionCard>

            {/* Card 2: Recent Leads */}
            <SectionCard title="Recent Leads" icon="groups">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {leads.slice(0, 5).map(lead => (
                        <div key={lead.id} className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-slate-800">{lead.name}</h4>
                                <LeadStatusBadge status={lead.status} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{lead.lastMessage}</p>
                        </div>
                    ))}
                     {leads.length === 0 && <p className="text-center text-sm text-slate-400 p-4">No recent leads found.</p>}
                </div>
            </SectionCard>

            {/* Card 3: Agent Task List */}
            <SectionCard title="Agent Task List" icon="task_alt">
                <div className="absolute top-4 right-4">
                    <button
                        onClick={() => setIsTaskManagerOpen(true)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">settings</span>
                        Manage
                    </button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {tasks.slice(0, 3).map(task => (
                        <div key={task.id} className="flex items-center p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={task.isCompleted}
                                onChange={(e) => onTaskUpdate?.(task.id, { isCompleted: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" 
                            />
                            <div className="ml-3 flex-grow">
                                {editingTaskId === task.id ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    onTaskUpdate?.(task.id, { text: editingText });
                                                    setEditingTaskId(null);
                                                    setEditingText('');
                                                } else if (e.key === 'Escape') {
                                                    setEditingTaskId(null);
                                                    setEditingText('');
                                                }
                                            }}
                                            onBlur={() => {
                                                onTaskUpdate?.(task.id, { text: editingText });
                                                setEditingTaskId(null);
                                                setEditingText('');
                                            }}
                                            className="w-full p-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            autoFocus
                                        />
                                        <div className="text-xs text-slate-500">
                                            Press Enter to save, Escape to cancel
                                        </div>
                                    </div>
                                ) : (
                                    <p 
                                        className={`text-sm ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 font-medium'} cursor-pointer hover:text-primary-600`}
                                        onClick={() => {
                                            if (!task.isCompleted) {
                                                setEditingTaskId(task.id);
                                                setEditingText(task.text);
                                            }
                                        }}
                                    >
                                        {task.text}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-slate-500">{task.dueDate}</p>
                                    <TaskPriorityIndicator priority={task.priority} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {tasks.length === 0 && <p className="text-center text-sm text-slate-400 p-4">Your task list is empty.</p>}
                    <div className="text-center pt-2 space-y-2">
                        <button 
                            onClick={() => {
                                const newTask: AgentTask = {
                                    id: `manual-task-${Date.now()}`,
                                    text: 'New task - click to edit',
                                    isCompleted: false,
                                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    priority: 'Medium'
                                };
                                onTaskAdd?.(newTask);
                            }}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                            + Add Quick Task
                        </button>
                        {tasks.length > 3 && (
                            <div>
                                <button 
                                    onClick={() => setIsTaskManagerOpen(true)}
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    View all {tasks.length} tasks →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>
        </div>

        {/* Recent Listings - Full Width */}
        <div className="grid grid-cols-1 gap-6">
            <SectionCard title="Recent Listings" icon="domain">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {properties.length > 0 ? properties.slice(0, 4).map(prop => (
                        <div
                            key={prop.id}
                            onClick={() => onSelectProperty(prop.id)}
                            className="flex items-center p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                            <img src={prop.imageUrl} alt={prop.address} className="w-16 h-16 rounded-md object-cover" />
                            <div className="ml-3">
                                <h4 className="font-semibold text-slate-800 text-sm">{prop.address}</h4>
                                <p className="text-sm font-bold text-primary-700">${prop.price.toLocaleString()}</p>
                            </div>
                            <span className="material-symbols-outlined w-5 h-5 text-slate-400 ml-auto">chevron_right</span>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-500">
                           <p>No listings found. Add one to get started!</p>
                       </div>
                    )}
                </div>
            </SectionCard>
        </div>

        {/* Smart Task Manager Modal */}
        {isTaskManagerOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900">Smart Task Manager</h2>
                        <button
                            onClick={() => setIsTaskManagerOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-2xl">close</span>
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        <SmartTaskManager
                            tasks={tasks}
                            leads={leads}
                            appointments={appointments}
                            properties={properties}
                            onTaskUpdate={onTaskUpdate || (() => {})}
                            onTaskAdd={onTaskAdd || (() => {})}
                            onTaskDelete={onTaskDelete || (() => {})}
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Dashboard;
