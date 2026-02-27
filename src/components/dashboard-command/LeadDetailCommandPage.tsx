import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DashboardLeadAppointment,
  DashboardLeadDetail,
  createLeadAppointment,
  fetchDashboardLeadDetail,
  logDashboardAgentAction,
  updateAppointmentStatus,
  updateDashboardLeadStatus
} from '../../services/dashboardCommandService';
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore';

const prettyEventName = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
};

const LeadDetailCommandPage: React.FC = () => {
  const { leadId = '' } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const realtimeLead = useDashboardRealtimeStore((state) => (leadId ? state.leadsById[leadId] : undefined));
  const appointmentsById = useDashboardRealtimeStore((state) => state.appointmentsById);
  const [detail, setDetail] = useState<DashboardLeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // UX State
  const [activeTab, setActiveTab] = useState<'activity' | 'appointment' | 'notes'>('activity');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Form State
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [appointmentLocation, setAppointmentLocation] = useState('');

  // Implicit Save State
  const [status, setStatus] = useState('New');
  const [timeline, setTimeline] = useState('unknown');
  const [financing, setFinancing] = useState('unknown');
  const [workingWithAgent, setWorkingWithAgent] = useState('unknown');

  const logAction = async (
    action: 'call_clicked' | 'email_clicked' | 'status_changed' | 'appointment_created' | 'appointment_updated',
    metadata?: Record<string, unknown>
  ) => {
    if (!leadId) return;
    await logDashboardAgentAction({
      lead_id: leadId,
      action,
      metadata
    }).catch(() => undefined);
  };

  const load = useCallback(async (refreshIntel = false) => {
    if (!leadId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchDashboardLeadDetail(leadId, refreshIntel);
      setDetail(response);
      const lead = response.lead as Record<string, unknown>;
      setStatus(String(lead.status || 'New'));
      setTimeline(String(lead.timeline || 'unknown'));
      setFinancing(String(lead.financing || 'unknown'));
      setWorkingWithAgent(String(lead.working_with_agent || 'unknown'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead detail.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!realtimeLead) return;

    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lead: {
          ...(prev.lead || {}),
          status: realtimeLead.status,
          timeline: realtimeLead.timeline,
          financing: realtimeLead.financing,
          full_name: realtimeLead.name,
          name: realtimeLead.name,
          phone_e164: realtimeLead.phone,
          email_lower: realtimeLead.email,
          listing_id: realtimeLead.listing_id
        },
        listing: realtimeLead.listing?.id
          ? {
            ...(prev.listing || {}),
            id: realtimeLead.listing.id,
            address: realtimeLead.listing.address || (prev.listing as Record<string, unknown> | null)?.address || null
          }
          : prev.listing
      };
    });

    setStatus(realtimeLead.status || 'New');
    setTimeline(realtimeLead.timeline || 'unknown');
    setFinancing(realtimeLead.financing || 'unknown');
  }, [realtimeLead]);

  useEffect(() => {
    setDetail((prev) => {
      if (!prev) return prev;
      const nextAppointments = [...(prev.appointments || [])];
      const seen = new Set(nextAppointments.map((appointment) => appointment.id));

      for (let index = 0; index < nextAppointments.length; index += 1) {
        const current = nextAppointments[index];
        const realtime = appointmentsById[current.id];
        if (!realtime) continue;
        nextAppointments[index] = {
          ...current,
          status: realtime.status || current.status,
          normalizedStatus: realtime.normalizedStatus || current.normalizedStatus,
          startsAt: realtime.startsAt || realtime.startIso || current.startsAt || current.startIso || null,
          startIso: realtime.startIso || realtime.startsAt || current.startIso || current.startsAt || null,
          location: realtime.location || current.location || null,
          lastReminderResult: realtime.last_reminder_outcome
            ? {
              status: realtime.last_reminder_outcome.status,
              reminder_type: realtime.last_reminder_outcome.reminder_type,
              scheduled_for: realtime.last_reminder_outcome.scheduled_for,
              provider_response: realtime.last_reminder_outcome.provider_response || null
            }
            : current.lastReminderResult || null
        };
      }

      for (const realtime of Object.values(appointmentsById)) {
        if (!realtime?.lead?.id || realtime.lead.id !== leadId) continue;
        if (seen.has(realtime.id)) continue;
        nextAppointments.push({
          id: realtime.id,
          status: realtime.status,
          normalizedStatus: realtime.normalizedStatus,
          startsAt: realtime.startsAt || realtime.startIso || null,
          startIso: realtime.startIso || realtime.startsAt || null,
          location: realtime.location || null,
          reminders: [],
          lastReminderResult: realtime.last_reminder_outcome
            ? {
              status: realtime.last_reminder_outcome.status,
              reminder_type: realtime.last_reminder_outcome.reminder_type,
              scheduled_for: realtime.last_reminder_outcome.scheduled_for,
              provider_response: realtime.last_reminder_outcome.provider_response || null
            }
            : null
        });
      }

      return {
        ...prev,
        appointments: nextAppointments.sort(
          (a, b) =>
            new Date(a.startsAt || a.startIso || 0).getTime() -
            new Date(b.startsAt || b.startIso || 0).getTime()
        )
      };
    });
  }, [appointmentsById, leadId]);

  const lead = useMemo(() => (detail?.lead || {}) as Record<string, unknown>, [detail]);

  const saveLeadProfile = async () => {
    if (!leadId) return;
    setSaving(true);
    try {
      await updateDashboardLeadStatus(leadId, {
        status,
        timeline,
        financing,
        working_with_agent: workingWithAgent
      });
      await logAction('status_changed', {
        status,
        timeline,
        financing,
        working_with_agent: workingWithAgent,
        source: 'lead_detail'
      });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead.');
    } finally {
      setSaving(false);
    }
  };

  const createAppointment = async () => {
    if (!appointmentDateTime) {
      setError('Pick a date and time first.');
      return;
    }

    const startsAtIso = new Date(appointmentDateTime).toISOString();
    const listingId = String(lead.listing_id || detail?.listing?.id || '');

    setSaving(true);
    try {
      await createLeadAppointment({
        lead_id: leadId,
        listing_id: listingId || undefined,
        starts_at: startsAtIso,
        timezone: 'America/Los_Angeles',
        location: appointmentLocation || undefined
      });
      await logAction('appointment_created', {
        starts_at: startsAtIso,
        location: appointmentLocation || null
      });
      setShowAppointmentModal(false);
      setAppointmentLocation('');
      setAppointmentDateTime('');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment.');
    } finally {
      setSaving(false);
    }
  };

  const setAppointmentState = async (appointment: DashboardLeadAppointment, nextStatus: 'confirmed' | 'reschedule_requested' | 'canceled') => {
    setSaving(true);
    try {
      await updateAppointmentStatus(appointment.id, nextStatus);
      await logAction('appointment_updated', {
        appointment_id: appointment.id,
        status: nextStatus
      });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleCallLeadClick = async () => {
    if (!leadPhone) return;
    await logAction('call_clicked', { source: 'lead_detail' });
    window.location.href = `tel:${leadPhone}`;
  };

  const handleEmailLeadClick = async () => {
    if (!leadEmail) return;
    await logAction('email_clicked', { source: 'lead_detail' });
    window.location.href = `mailto:${leadEmail}`;
  };

  const handleQuickMarkContacted = async () => {
    setSaving(true);
    try {
      const nextStatus = 'Contacted';
      setStatus(nextStatus);
      await updateDashboardLeadStatus(leadId, {
        status: nextStatus,
        timeline,
        financing,
        working_with_agent: workingWithAgent
      });
      await logAction('status_changed', {
        status: nextStatus,
        source: 'lead_detail_quick_action'
      });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark contacted.');
    } finally {
      setSaving(false);
    }
  };
  const activeAppointments = detail?.appointments?.filter(a => a.status !== 'canceled') || [];

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">Loading lead detail...</div>;
  }

  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-rose-700">{error}</div>;
  }

  if (!detail) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">Lead not found.</div>;
  }

  const leadName = String(lead.full_name || lead.name || 'Unknown');
  const leadPhone = String(lead.phone_e164 || lead.phone || '');
  const leadEmail = String(lead.email_lower || lead.email || '');
  const summaryLines = (detail.intel.lead_summary || '').split('\n').filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8 font-sans pb-32">

      {/* ABOVE THE FOLD: Header & Context */}
      <div className="mb-2">
        <button
          onClick={() => navigate('/dashboard/leads')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Inbox
        </button>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{leadName}</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-slate-500 font-medium">{String(detail.listing?.address || 'No listing attached')}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-slate-500 font-medium">From: {detail.lead.source_type?.toString().replace(/_/g, ' ') || 'Unknown'}</span>
        </div>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="sticky top-4 z-20 flex flex-wrap sm:flex-nowrap gap-3 p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm mb-8">
        <button
          onClick={() => void handleCallLeadClick()}
          disabled={!leadPhone}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">call</span>
          Call
        </button>
        <button
          onClick={() => void handleEmailLeadClick()}
          disabled={!leadEmail}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">mail</span>
          Email
        </button>
        <button
          onClick={() => void handleQuickMarkContacted()}
          disabled={status === 'Contacted' || saving}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {status === 'Contacted' ? 'Contacted' : 'Mark contacted'}
        </button>
        <button
          onClick={() => setShowAppointmentModal(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-3 rounded-xl font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">event</span>
          Set appointment
        </button>
      </div>

      {/* SUMMARY */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Summary</h3>
        <ul className="space-y-3 text-slate-700 font-medium text-[15px]">
          {summaryLines.length > 0
            ? summaryLines.slice(0, 3).map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-blue-500">•</span>
                <span>{line.replace(/^[•-]\s*/, '')}</span>
              </li>
            ))
            : <li className="text-slate-400 italic">No summary generated yet. Connect with the lead to populate.</li>}
        </ul>

        {/* KEY CHIPS */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-200">
          <select
            value={timeline}
            onChange={(e) => { setTimeline(e.target.value); setTimeout(saveLeadProfile, 100); }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="unknown">Timeline: Unknown</option>
            <option value="0-30">Timeline: 0-30 Days</option>
            <option value="1-3mo">Timeline: 1-3 Months</option>
            <option value="3+">Timeline: 3+ Months</option>
          </select>

          <select
            value={financing}
            onChange={(e) => { setFinancing(e.target.value); setTimeout(saveLeadProfile, 100); }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="unknown">Financing: Unknown</option>
            <option value="preapproved">Financing: Preapproved</option>
            <option value="cash">Financing: Cash</option>
            <option value="exploring">Financing: Exploring</option>
          </select>

          <select
            value={workingWithAgent}
            onChange={(e) => { setWorkingWithAgent(e.target.value); setTimeout(saveLeadProfile, 100); }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="unknown">Agent: Unknown</option>
            <option value="yes">Agent: Yes</option>
            <option value="no">Agent: No</option>
          </select>
        </div>
      </div>

      {/* BELOW THE FOLD TABS */}
      <div className="mt-12 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'activity' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveTab('appointment')}
          className={`px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${activeTab === 'appointment' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          Appointment
          {activeAppointments.length > 0 && (
            <span className="bg-rose-100 text-rose-700 py-0.5 px-1.5 rounded-full text-[10px]">{activeAppointments.length}</span>
          )}
        </button>
      </div>

      <div className="pt-6">
        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {(detail.events || []).map((event) => (
              <div key={event.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-white shadow-sm">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">
                    {event.type.includes('appointment') ? 'event' : event.type.includes('email') ? 'mail' : 'forum'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-0.5">{prettyEventName(event.type)}</p>
                  <p className="text-xs font-medium text-slate-500">{formatDateTime(event.created_at)}</p>
                </div>
              </div>
            ))}

            {(detail.events || []).length === 0 && (
              <p className="text-center text-slate-500 font-medium py-8 border border-dashed border-slate-200 rounded-xl">No activity recorded yet.</p>
            )}
          </div>
        )}

        {/* APPOINTMENT TAB */}
        {activeTab === 'appointment' && (
          <div className="space-y-4">
            {activeAppointments.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-500 font-medium mb-4">No active appointments.</p>
                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="bg-slate-900 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Set appointment
                </button>
              </div>
            ) : (
              activeAppointments.map(appointment => (
                <div key={appointment.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{formatDateTime(appointment.startsAt || appointment.startIso)}</h4>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {appointment.location || 'Location TBD'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                      {appointment.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-5 bg-slate-50 flex gap-3">
                    {appointment.status !== 'confirmed' && (
                      <button
                        onClick={() => void setAppointmentState(appointment, 'confirmed')}
                        className="flex-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
                      >
                        Mark confirmed
                      </button>
                    )}
                    <button
                      onClick={() => setShowAppointmentModal(true)}
                      className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => void setAppointmentState(appointment, 'canceled')}
                      className="px-4 py-2.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 font-bold rounded-lg text-sm transition-colors"
                      aria-label="Cancel"
                    >
                      <span className="material-symbols-outlined text-[18px] translate-y-0.5">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showAppointmentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Set Appointment</h3>
              <button onClick={() => setShowAppointmentModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-50">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Date & time</label>
                <input
                  type="datetime-local"
                  value={appointmentDateTime}
                  onChange={(event) => setAppointmentDateTime(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Location (optional)</label>
                <input
                  type="text"
                  value={appointmentLocation}
                  onChange={(event) => setAppointmentLocation(event.target.value)}
                  placeholder="E.g. Listing Address or Phone Call"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void createAppointment()}
                  disabled={saving}
                  className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Confirm Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailCommandPage;
