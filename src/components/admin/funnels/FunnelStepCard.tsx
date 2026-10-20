import React from 'react';
import { EditableStep } from '../../../types';
import type { FunnelStepsContext } from './FunnelStepsPanel';
import StepCallEditor from './StepCallEditor';
import StepTextEditor from './StepTextEditor';
import StepTaskEditor from './StepTaskEditor';
import StepConditionEditor from './StepConditionEditor';
import StepWaitEditor from './StepWaitEditor';
import StepEmailEditor from './StepEmailEditor';

export interface FunnelStepCardProps extends Pick<FunnelStepsContext, 'saveStatus' | 'sendSuccessIds' | 'sendingTestId' | 'testPhone' | 'isSavingBot' | 'getBotOptions' | 'resolveCallBotIdForStep' | 'handleCreateCallBot' | 'handleEditCallBot' | 'handleDeleteCallBot' | 'mergeTokens' | 'sampleMergeData'> {
    step: EditableStep;
    isLast: boolean;
    stepIsOpen: boolean;
    onToggleStep: (id: string) => void;
    onUpdateStep: (id: string, field: keyof EditableStep, value: string) => void;
    onRemoveStep: (id: string) => void;
    onSendTest: (step: EditableStep) => void;
    onSave: () => void;
}

// One step in the timeline: closed it shows a summary, open it shows the words, delay and test button.
const FunnelStepCard: React.FC<FunnelStepCardProps> = ({
    step, isLast, stepIsOpen, onToggleStep, onUpdateStep, onRemoveStep, onSendTest, onSave,
    saveStatus, sendSuccessIds, sendingTestId, testPhone, isSavingBot, getBotOptions, resolveCallBotIdForStep,
    handleCreateCallBot, handleEditCallBot, handleDeleteCallBot, mergeTokens, sampleMergeData
}) => {
    const editorProps = { step, onUpdateStep, onSave, saveStatus, sendSuccessIds, sendingTestId, testPhone, isSavingBot, getBotOptions, resolveCallBotIdForStep, handleCreateCallBot, handleEditCallBot, handleDeleteCallBot, mergeTokens, sampleMergeData, onSendTest };
    return (
  <div key={step.id} className="relative pl-8 pb-6">
      {/* Timeline Line */}
      {!isLast && (
          <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-indigo-100" />
      )}

      {/* Timeline Dot */}
      <div className={`absolute left-0 top-3 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white ${stepIsOpen ? 'border-indigo-600 text-indigo-600' : 'border-slate-300 text-slate-400'}`}>
          <div className={`w-2 h-2 rounded-full ${stepIsOpen ? 'bg-indigo-600' : 'bg-slate-300'}`} />
      </div>

      <article
          className={`transition-all duration-200 border rounded-2xl ${stepIsOpen
              ? 'bg-white border-indigo-200 shadow-lg ring-1 ring-indigo-50/50'
              : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-pointer'
              }`}
      >
          {/* Header (Always Visible) */}
          <div
              role="button"
              onClick={() => onToggleStep(step.id)}
              className="flex items-center justify-between p-4"
          >
              <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${stepIsOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                      <span className="material-symbols-outlined">{step.icon}</span>
                  </div>
                  <div>
                      <div className="flex items-center gap-2 mb-0.5">
                          <h3 className={`text-sm font-bold ${stepIsOpen ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {step.title}
                          </h3>
                          {!stepIsOpen && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                  {step.delay}
                              </span>
                          )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium max-w-[300px] truncate">
                          {step.description}
                      </p>
                  </div>
              </div>

              <div className="flex items-center gap-3">
                  {stepIsOpen ? (
                      <span className="material-symbols-outlined text-indigo-400">expand_less</span>
                  ) : (
                      <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              {step.type}
                          </span>
                      </div>
                  )}
              </div>
          </div>

          {/* Expanded Content */}
          {stepIsOpen && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="pt-4 border-t border-slate-100">
                      {/* Live Metrics Grid */}
                      <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sent</div>
                              <div className="text-xl font-bold text-slate-700">{step.sent || 0}</div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opened</div>
                              <div className="text-xl font-bold text-indigo-600">{step.opened || 0}</div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clicked</div>
                              <div className="text-xl font-bold text-emerald-600">{step.clicked || 0}</div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Replied</div>
                              <div className="text-xl font-bold text-blue-600">{step.replied || 0}</div>
                          </div>
                      </div>

                      {/* Step Label & Description Editor */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Step Name</label>
                              <input
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                  value={step.title}
                                  onChange={(e) => onUpdateStep(step.id, 'title', e.target.value)}
                                  placeholder="e.g. Instant AI Welcome"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                              <input
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                  value={step.description}
                                  onChange={(e) => onUpdateStep(step.id, 'description', e.target.value)}
                                  placeholder="Briefly describe this step..."
                              />
                          </div>
                      </div>
                      {/* Quick Config Row */}
                      <div className="flex items-center gap-4 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Timing (Since Previous Step)</label>
                              <select
                                  className="w-full bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                                  value={step.delay}
                                  onChange={(e) => onUpdateStep(step.id, 'delay', e.target.value)}
                              >
                                  <option value="0 min">0 min (Immediate)</option>
                                  <option value="1 hour">1 hour later</option>
                                  <option value="12 hours">12 hours later</option>
                                  <option value="1 day">+1 day later</option>
                                  <option value="2 days">+2 days later</option>
                                  <option value="3 days">+3 days later</option>
                              </select>
                          </div>
                          <div className="w-px h-8 bg-slate-200" />
                          <div className="flex-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Action Type</label>
                              <select
                                  className="w-full bg-transparent text-sm font-bold text-indigo-600 focus:outline-none cursor-pointer"
                                  value={step.type}
                                  onChange={(e) => onUpdateStep(step.id, 'type', e.target.value)}
                              >
                                  <option value="Email">Email</option>
                                  <option value="Call">AI Call</option>
                                  <option value="Task">Task</option>
                                  <option value="SMS">SMS</option>
                                  <option value="Condition">Condition (If/Then)</option>
                                  <option value="Wait">Wait</option>
                              </select>
                          </div>
                      </div>

                      {/* The editor depends on the kind of step */}
                      {step.type === 'Call' || step.type === 'AI Call' || step.type === 'Voice' ? (
                          <StepCallEditor {...editorProps} />
                      ) : (step.type === 'Text' || step.type === 'sms' || step.type === 'SMS') ? (
                          <StepTextEditor {...editorProps} />
                      ) : step.type === 'Task' ? (
                          <StepTaskEditor {...editorProps} />
                      ) : step.type === 'Condition' ? (
                          <StepConditionEditor {...editorProps} />
                      ) : step.type === 'Wait' ? (
                          <StepWaitEditor {...editorProps} />
                      ) : (
                          <StepEmailEditor {...editorProps} />
                      )}
                  </div>

                  <div className="mt-4 flex justify-between items-end">
                      <button
                          onClick={() => onRemoveStep(step.id)}
                          className="text-xs text-red-400 hover:text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                          Remove Step
                      </button>
                  </div>
              </div>
          )}
      </article>
  </div>
    );
};

export default FunnelStepCard;
