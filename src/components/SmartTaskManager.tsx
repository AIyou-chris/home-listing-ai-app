import React, { useState, useEffect } from 'react';
import { AgentTask, Lead, Appointment, Property } from '../types';
import { SmartTaskService } from '../services/smartTaskService';

interface SmartTaskManagerProps {
  tasks: AgentTask[];
  leads: Lead[];
  appointments: Appointment[];
  properties: Property[];
  onTaskUpdate: (taskId: string, updates: Partial<AgentTask>) => void;
  onTaskAdd: (task: AgentTask) => void;
  onTaskDelete: (taskId: string) => void;
}

const SmartTaskManager: React.FC<SmartTaskManagerProps> = ({
  tasks,
  leads,
  appointments,
  properties,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete
}) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    text: '',
    priority: 'Medium' as const,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high-priority'>('all');
  const [showSmartTasks, setShowSmartTasks] = useState(true);

  const taskStats = SmartTaskService.getTaskStats(tasks);
  const categories = SmartTaskService.getTaskCategories();

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.isCompleted;
    if (filter === 'completed') return task.isCompleted;
    if (filter === 'high-priority') return task.priority === 'High' && !task.isCompleted;
    return true;
  });

  const handleAddTask = () => {
    if (newTask.text.trim()) {
      const task: AgentTask = {
        id: `manual-task-${Date.now()}`,
        text: newTask.text,
        isCompleted: false,
        dueDate: newTask.dueDate,
        priority: newTask.priority
      };
      onTaskAdd(task);
      setNewTask({
        text: '',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setIsAddingTask(false);
    }
  };

  const handleGenerateSmartTasks = () => {
    const smartTasks = SmartTaskService.generateSmartTasks(leads, appointments, properties);
    smartTasks.forEach(task => {
      // Check if task already exists to avoid duplicates
      const exists = tasks.some(t => t.text === task.text && !t.isCompleted);
      if (!exists) {
        onTaskAdd(task);
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-sky-100 text-sky-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <div className="space-y-6">
      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{taskStats.total}</div>
          <div className="text-sm text-slate-600">Total Tasks</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
          <div className="text-sm text-slate-600">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-orange-600">{taskStats.pending}</div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-red-600">{taskStats.highPriority}</div>
          <div className="text-sm text-slate-600">High Priority</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-purple-600">{taskStats.completionRate}%</div>
          <div className="text-sm text-slate-600">Completion Rate</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setIsAddingTask(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Manual Task
        </button>
        
        <button
          onClick={handleGenerateSmartTasks}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          Generate Smart Tasks
        </button>

        <button
          onClick={() => setShowSmartTasks(!showSmartTasks)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">{showSmartTasks ? 'visibility_off' : 'visibility'}</span>
          {showSmartTasks ? 'Hide' : 'Show'} Smart Tasks
        </button>
      </div>

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Task Description</label>
              <textarea
                value={newTask.text}
                onChange={(e) => setNewTask({ ...newTask, text: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Enter task description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'pending', label: 'Pending' },
          { id: 'completed', label: 'Completed' },
          { id: 'high-priority', label: 'High Priority' }
        ].map(filterOption => (
          <button
            key={filterOption.id}
            onClick={() => setFilter(filterOption.id as any)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === filterOption.id
                ? 'bg-primary-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
            <p>No tasks found. Add a task or generate smart tasks to get started!</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 transition-all hover:shadow-md ${
                task.isCompleted ? 'opacity-75' : ''
              } ${isOverdue(task.dueDate) ? 'border-red-300 bg-red-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={(e) => onTaskUpdate(task.id, { isCompleted: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`text-sm ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                    {task.text}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-slate-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                    {isOverdue(task.dueDate) && (
                      <span className="text-xs text-red-600 font-semibold">OVERDUE</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onTaskDelete(task.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SmartTaskManager;
