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
  return date.toLocaleString();
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
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [appointmentLocation, setAppointmentLocation] = useState('');
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
  const upcomingAppointment = detail.upcoming_appointment;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard/leads')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Inbox
        </button>
        <button
          type="button"
          onClick={() => void load(true)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh Intel
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{leadName}</h1>
            <p className="text-sm text-slate-600">{String(detail.listing?.address || 'No listing attached')}</p>
            <p className="mt-1 text-xs text-slate-500">Lead ID: {leadId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">{detail.intel.intent_level}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">Score {detail.intel.intent_score}/100</span>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{status}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <button
            type="button"
            onClick={() => void handleCallLeadClick()}
            disabled={!leadPhone}
            className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Call
          </button>
          <button
            type="button"
            onClick={() => void handleEmailLeadClick()}
            disabled={!leadEmail}
            className="rounded-lg bg-slate-800 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => void handleQuickMarkContacted()}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Mark Contacted
          </button>
          <button type="button" onClick={() => setShowAppointmentModal(true)} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">Set Appointment</button>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {detail.actionBar.statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Lead Intelligence</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <ul className="space-y-2 text-sm text-slate-700">
              {summaryLines.length > 0
                ? summaryLines.map((line) => <li key={line}>• {line}</li>)
                : <li>• Summary will populate after first interaction.</li>}
            </ul>
            <p className="mt-3 rounded-lg bg-slate-100 p-2 text-sm text-slate-700">
              <strong>Next best action:</strong> {detail.intel.next_best_action || 'Send intro + offer two appointment windows.'}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Intent tags</p>
            <div className="flex flex-wrap gap-2">
              {(detail.intel.intent_tags || []).length > 0
                ? detail.intel.intent_tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{tag}</span>
                ))
                : <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">No tags yet</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Lead Profile</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs text-slate-600">
            <span>Timeline</span>
            <select value={timeline} onChange={(event) => setTimeline(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="unknown">unknown</option>
              <option value="0-30">0-30</option>
              <option value="1-3mo">1-3mo</option>
              <option value="3+">3+</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            <span>Financing</span>
            <select value={financing} onChange={(event) => setFinancing(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="unknown">unknown</option>
              <option value="preapproved">preapproved</option>
              <option value="cash">cash</option>
              <option value="exploring">exploring</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            <span>Working with agent</span>
            <select value={workingWithAgent} onChange={(event) => setWorkingWithAgent(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="unknown">unknown</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveLeadProfile()}
          disabled={saving}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Lead Profile'}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Upcoming Appointment</h2>
        {!upcomingAppointment ? (
          <p className="mt-2 text-sm text-slate-500">No upcoming appointment.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><strong>Time:</strong> {formatDateTime(upcomingAppointment.startsAt || upcomingAppointment.startIso)}</p>
            <p><strong>Status:</strong> {upcomingAppointment.status}</p>
            <p>
              <strong>Last reminder outcome:</strong>{' '}
              {upcomingAppointment.lastReminderResult
                ? `${upcomingAppointment.lastReminderResult.status} • ${formatDateTime(upcomingAppointment.lastReminderResult.scheduled_for)}`
                : 'No reminder outcome yet'}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard/appointments')}
                className="rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
              >
                Open appointment
              </button>
              <button
                type="button"
                onClick={() => void setAppointmentState(upcomingAppointment, 'confirmed')}
                disabled={saving}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
              >
                Mark confirmed
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Appointments</h2>
          <button
            type="button"
            onClick={() => setShowAppointmentModal(true)}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
          >
            Create Appointment
          </button>
        </div>

        {detail.appointments.length === 0 ? (
          <p className="text-sm text-slate-500">No appointments yet.</p>
        ) : (
          <div className="space-y-3">
            {detail.appointments.map((appointment) => (
              <div key={appointment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{appointment.status}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(appointment.startsAt || appointment.startIso)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void setAppointmentState(appointment, 'confirmed')} className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Confirmed</button>
                    <button onClick={() => void setAppointmentState(appointment, 'reschedule_requested')} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Reschedule Requested</button>
                    <button onClick={() => void setAppointmentState(appointment, 'canceled')} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600">Cancel</button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  <p>Location: {appointment.location || 'Not set'}</p>
                  <p>
                    Last reminder:{' '}
                    {appointment.lastReminderResult
                      ? `${appointment.lastReminderResult.status} • ${formatDateTime(appointment.lastReminderResult.scheduled_for)}`
                      : 'No reminders yet'}
                  </p>
                  {Array.isArray(appointment.reminders) && appointment.reminders.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {appointment.reminders.map((reminder) => (
                        <span
                          key={reminder.id}
                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {reminder.reminder_type.toUpperCase()} • {reminder.status}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Activity Timeline</h2>
        <div className="mt-3 space-y-2">
          {(detail.events || []).slice(0, 30).map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">{prettyEventName(event.type)}</p>
              <p className="text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
            </div>
          ))}
        </div>
      </section>

      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <h3 className="text-lg font-semibold text-slate-900">Create Appointment</h3>
            <p className="mt-1 text-sm text-slate-600">Set in 10 seconds: pick a time and optional location.</p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date & time</label>
            <input
              type="datetime-local"
              value={appointmentDateTime}
              onChange={(event) => setAppointmentDateTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">Location (optional)</label>
            <input
              type="text"
              value={appointmentLocation}
              onChange={(event) => setAppointmentLocation(event.target.value)}
              placeholder="Listing address or virtual"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAppointmentModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createAppointment()}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailCommandPage;
