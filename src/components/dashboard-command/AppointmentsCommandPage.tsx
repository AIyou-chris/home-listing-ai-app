import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DashboardAppointmentRow,
  fetchDashboardAppointments,
  updateAppointmentStatus
} from '../../services/dashboardCommandService';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const AppointmentsCommandPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'today' | 'week'>('week');
  const [appointments, setAppointments] = useState<DashboardAppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDashboardAppointments({ view });
      setAppointments(response.appointments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [view]);

  const patchStatus = async (appointmentId: string, status: 'confirmed' | 'reschedule_requested') => {
    setBusyId(appointmentId);
    try {
      await updateAppointmentStatus(appointmentId, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appointment.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-600">Today + this week. Focus on confirmation and reschedules.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView('today')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${view === 'today' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${view === 'week' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
          >
            This Week
          </button>
        </div>
      </div>

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading appointments...</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="space-y-3">
        {!loading && !error && appointments.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No appointments in this range.</div>
        )}

        {!loading && !error && appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-slate-900">{appointment.lead?.name || 'Unknown lead'}</p>
                <p className="text-xs text-slate-500">{appointment.listing?.address || 'No listing linked'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{appointment.status}</span>
            </div>

            <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <p>{formatDateTime(appointment.startsAt || appointment.startIso)}</p>
              <p>{appointment.lead?.phone || appointment.lead?.email || 'No contact method'}</p>
              <p>Last reminder: {appointment.last_reminder_outcome?.status || 'none'}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === appointment.id}
                onClick={() => void patchStatus(appointment.id, 'confirmed')}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
              >
                Mark Confirmed
              </button>
              <button
                type="button"
                disabled={busyId === appointment.id}
                onClick={() => void patchStatus(appointment.id, 'reschedule_requested')}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 disabled:opacity-60"
              >
                Mark Reschedule Requested
              </button>
              {appointment.lead?.phone && (
                <a href={`tel:${appointment.lead.phone}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Call Lead
                </a>
              )}
              {appointment.lead?.id && (
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/leads/${appointment.lead?.id}`)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Open Lead
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentsCommandPage;
