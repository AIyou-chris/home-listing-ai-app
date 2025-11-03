import React, { useMemo, useState, useEffect } from 'react';
import { Appointment, Lead, User } from '../types';
import CalendarView from './CalendarView';
import { googleOAuthService } from '../services/googleOAuthService';
import { emailService } from '../services/emailService';
// Firebase services removed - using Supabase alternatives
import { useScheduler } from '../context/SchedulerContext';

interface AdminContactsPageProps {
	users: User[];
	leads: Lead[];
	appointments: Appointment[];
}

type ContactsMode = 'users' | 'leads';

const AdminContactsPage: React.FC<AdminContactsPageProps> = ({
	users,
	leads,
	appointments,
}) => {
	const [mode, setMode] = useState<ContactsMode>('users');
	const [query, setQuery] = useState('');
	const [sideTab, setSideTab] = useState<'details' | 'activity' | 'appointments' | 'invoices' | 'email' | 'schedule'>('details');
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const [googleConnected, setGoogleConnected] = useState(false);

	const [localAppointments, setLocalAppointments] = useState<Appointment[]>(
		() => appointments || []
	);
	const [localUsers, setLocalUsers] = useState<User[]>(() => users || []);
	const [localLeads, setLocalLeads] = useState<Lead[]>(() => leads || []);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editName, setEditName] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [editPhone, setEditPhone] = useState('');
	const [newNote, setNewNote] = useState('');
	const [notesByContact, setNotesByContact] = useState<Record<string, string[]>>({});
	const [invoicesByContact, setInvoicesByContact] = useState<Record<string, { id: string; date: string; amount: number; status: 'draft' | 'sent' | 'paid' | 'overdue'; notes?: string; }[]>>({});
	const [emailSubject, setEmailSubject] = useState('');
	const [emailBody, setEmailBody] = useState('');
	const [isSendingEmail, setIsSendingEmail] = useState(false);
	const [isDraftingEmail, setIsDraftingEmail] = useState(false);
	const [scheduleDate, setScheduleDate] = useState('');
	const [scheduleTime, setScheduleTime] = useState('');
	const [scheduleMsg, setScheduleMsg] = useState('');
	const { openScheduler } = useScheduler();

	useEffect(() => {
		setLocalAppointments(appointments || []);
	}, [appointments]);

	useEffect(() => {
		setLocalUsers(users || []);
	}, [users]);

	useEffect(() => {
		setLocalLeads(leads || []);
	}, [leads]);

	const filteredUsers = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return localUsers;
		return localUsers.filter(u =>
			u.name.toLowerCase().includes(q) ||
			u.email.toLowerCase().includes(q)
		);
	}, [localUsers, query]);

	const filteredLeads = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return localLeads;
		return localLeads.filter(l =>
			l.name.toLowerCase().includes(q) ||
			l.email.toLowerCase().includes(q) ||
			l.phone.toLowerCase().includes(q)
		);
	}, [localLeads, query]);

	const selectedUser =
		mode === 'users'
			? filteredUsers.find(u => u.id === selectedId) || null
			: null;
	const selectedLead =
		mode === 'leads'
			? filteredLeads.find(l => l.id === selectedId) || null
			: null;

	const selectedAppointments = useMemo(() => {
		if (!selectedId) return [] as Appointment[];
		if (mode === 'leads') {
			return appointments.filter(a => a.leadId === selectedId);
		}
		return [] as Appointment[];
	}, [appointments, selectedId, mode]);

	return (
		<div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
				<div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
					<button
						className={`px-4 py-2 text-sm font-medium ${
							mode === 'users' ? 'bg-primary-600 text-white' : 'bg-white text-slate-700'
						}`}
						onClick={() => setMode('users')}
					>
						Users
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium border-l border-slate-200 ${
							mode === 'leads' ? 'bg-primary-600 text-white' : 'bg-white text-slate-700'
						}`}
						onClick={() => setMode('leads')}
					>
						Leads
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/80">
					<div className="p-4 border-b border-slate-200 flex items-center gap-3">
						<span className="material-symbols-outlined text-slate-400">search</span>
						<input
							type="text"
							value={query}
							onChange={e => setQuery(e.target.value)}
							placeholder={`Search ${mode === 'users' ? 'users' : 'leads'}...`}
							className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
						/>
					</div>
					<div className="divide-y divide-slate-100 max-h-[70vh] overflow-auto">
						{mode === 'users' && filteredUsers.map(u => (
							<button
								key={u.id}
								onClick={() => {
									setSelectedId(u.id);
									setSideTab('details');
									setEditName(u.name);
									setEditEmail(u.email);
									setEmailSubject('');
									setEmailBody('');
									setEditPhone(u.phone || '');
									setIsModalOpen(true);
								}}
								className={`w-full text-left flex items-center justify-between p-4 hover:bg-slate-50 transition ${
									selectedId === u.id ? 'bg-slate-50' : ''
								}`}
							>
								<div>
									<div className="font-semibold text-slate-900">{u.name}</div>
									<div className="text-xs text-slate-500">{u.email}</div>
								</div>
								<div className="text-xs text-slate-500">{u.status}</div>
							</button>
						))}
						{mode === 'leads' && filteredLeads.map(l => (
							<button
								key={l.id}
								onClick={() => {
									setSelectedId(l.id);
									setSideTab('details');
									setEditName(l.name);
									setEditEmail(l.email);
									setEmailSubject('');
									setEmailBody('');
									setEditPhone(l.phone);
									setIsModalOpen(true);
								}}
								className={`w-full text-left flex items-center justify-between p-4 hover:bg-slate-50 transition ${
									selectedId === l.id ? 'bg-slate-50' : ''
								}`}
							>
								<div>
									<div className="font-semibold text-slate-900">{l.name}</div>
									<div className="text-xs text-slate-500">{l.email} · {l.phone}</div>
								</div>
								<div className="text-xs text-slate-500">{l.status}</div>
							</button>
						))}
					</div>
				</div>

				<div className="space-y-6">
					<div className="bg-white rounded-xl shadow-sm border border-slate-200/80">
						<div className="p-4 border-b border-slate-200 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-slate-800">Calendar</h2>
							<div className="flex items-center gap-2">
								{!googleConnected ? (
									<button
										onClick={async () => {
											try {
											const ok = await googleOAuthService.requestAccess();
											setGoogleConnected(!!ok);
										} catch (error) {
											console.error('Failed to connect Google account:', error);
										}
										}}
										className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
									>
										<span className="material-symbols-outlined w-4 h-4">link</span>
										Connect Google
									</button>
								) : (
									<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
										<span className="material-symbols-outlined w-4 h-4">check_circle</span>
										Connected
									</span>
								)}
							</div>
						</div>
						<div className="p-3">
							<CalendarView appointments={localAppointments} />
							<div className="mt-3 flex items-center gap-2">
								<button
									onClick={() => {
										if (mode !== 'leads' || !selectedLead) return;
										const id = Date.now().toString();
										const today = new Date();
										const appt: Appointment = {
											id,
											type: 'Consultation',
											date: today.toISOString().slice(0, 10),
											time: `${today.getHours()}:00`,
											leadId: selectedLead.id,
											propertyId: '',
											notes: 'Created from Contacts'
										};
									setLocalAppointments(prev => [appt, ...prev]);
								}}
								className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"
								>
									Quick add appointment
								</button>
								<span className="text-xs text-slate-500">(select a lead first)</span>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-slate-200/80">
						<div className="p-4 border-b border-slate-200">
							<div className="flex items-center gap-2">
								<button
									className={`px-3 py-1.5 rounded-md text-sm ${sideTab === 'details' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`}
									onClick={() => setSideTab('details')}
								>
									Details
								</button>
								<button
									className={`px-3 py-1.5 rounded-md text-sm ${sideTab === 'activity' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`}
									onClick={() => setSideTab('activity')}
								>
									Activity
								</button>
								<button
									className={`px-3 py-1.5 rounded-md text-sm ${sideTab === 'appointments' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`}
									onClick={() => setSideTab('appointments')}
								>
									Appointments
								</button>
							</div>
						</div>
						<div className="p-4 h-[70vh] overflow-auto">
							{!selectedId && (
								<div className="text-sm text-slate-500">Select a {mode === 'users' ? 'user' : 'lead'} to view</div>
							)}
							{selectedUser && sideTab === 'details' && (
								<div className="space-y-2 text-sm text-slate-700">
									<div className="font-semibold text-slate-900">{selectedUser.name}</div>
									<div>{selectedUser.email}</div>
									<div>Status: {selectedUser.status}</div>
									<div>Role: {selectedUser.role}</div>
								</div>
							)}
							{selectedLead && sideTab === 'details' && (
								<div className="space-y-2 text-sm text-slate-700">
									<div className="font-semibold text-slate-900">{selectedLead.name}</div>
									<div>{selectedLead.email} · {selectedLead.phone}</div>
									<div>Status: {selectedLead.status}</div>
									{selectedLead.lastMessage && (
										<div className="text-slate-600">“{selectedLead.lastMessage}”</div>
									)}
							</div>
							)}
							{selectedId && sideTab === 'activity' && (
								<div className="text-sm text-slate-500">No recent activity.</div>
							)}
							{selectedId && sideTab === 'appointments' && (
								<div className="space-y-3">
									{mode === 'leads' && selectedAppointments.length === 0 && (
										<div className="text-sm text-slate-500">No appointments.</div>
									)}
									{mode === 'leads' && selectedAppointments.map(a => (
										<div key={a.id} className="rounded-lg border border-slate-200 p-3">
											<div className="font-medium text-slate-900">{a.type}</div>
											<div className="text-xs text-slate-500">{a.date} · {a.time}</div>
											{a.notes && (
												<div className="text-sm text-slate-600 mt-1">{a.notes}</div>
											)}
										</div>
									))}
									{mode === 'users' && (
										<div className="text-sm text-slate-500">Appointments apply to leads.</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		{/* Fullscreen center modal for contact */}
		{isModalOpen && selectedId && (
			<div className="fixed inset-0 z-50 flex items-center justify-center">
				<div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
				<div className="relative w-full h-full sm:h-auto sm:w-[840px] max-h-[92vh] bg-white sm:rounded-2xl shadow-2xl overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
						<h3 className="text-base font-semibold text-slate-900">{mode === 'users' ? 'User' : 'Lead'}</h3>
						<button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md hover:bg-slate-100">
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<div className="px-6 pt-3">
						<div className="flex items-center gap-2 mb-3 overflow-auto no-scrollbar">
							<button className={`px-4 py-1.5 rounded-full text-sm ${sideTab === 'details' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setSideTab('details')}>Details</button>
							<button className={`px-4 py-1.5 rounded-full text-sm ${sideTab === 'activity' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setSideTab('activity')}>Activity</button>
							<button className={`px-4 py-1.5 rounded-full text-sm ${sideTab === 'email' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setSideTab('email')}>Email</button>
							<button className={`px-4 py-1.5 rounded-full text-sm ${sideTab === 'schedule' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setSideTab('schedule')}>Schedule</button>
							<button className={`px-4 py-1.5 rounded-full text-sm ${sideTab === 'appointments' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setSideTab('appointments')}>Appointments</button>
							<button className={`px-4 py-1.5 rounded-full text-sm ${sideTab === 'invoices' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setSideTab('invoices')}>Invoices</button>
						{sideTab === 'email' && (
							<div className="space-y-3 pt-1">
								<div>
									<label className="block text-xs text-slate-500">To</label>
									<input disabled value={editEmail} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-600" />
								</div>
								<div>
									<label className="block text-xs text-slate-500">Subject</label>
									<input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
								</div>
								<div>
									<label className="block text-xs text-slate-500">Message</label>
									<textarea rows={6} value={emailBody} onChange={e => setEmailBody(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={async () => {
											if (!editEmail) return;
											setIsDraftingEmail(true);
									try {
										const suggestion = '';
										if (suggestion && !emailBody) setEmailBody(suggestion);
									} catch (error) {
										console.error('Failed to draft email with AI', error);
									}
											setIsDraftingEmail(false);
										}}
										className="px-3 py-2 rounded-md bg-slate-100 text-slate-700 text-sm"
									>
										{isDraftingEmail ? 'Drafting…' : 'AI Draft'}
									</button>
									<button
										onClick={async () => {
											if (!editEmail || !emailSubject || !emailBody) return;
											setIsSendingEmail(true);
							try {
								const success = await emailService.sendEmail(editEmail, emailSubject, emailBody);
												if (success) {
													alert('✅ Email sent successfully!');
													setEditEmail('');
													setEmailSubject('');
													setEmailBody('');
												} else {
													alert('❌ Failed to send email. Please connect Gmail in Settings first.');
												}
											} catch (e) {
												alert('❌ Email sending failed: ' + (e as Error).message);
											}
											setIsSendingEmail(false);
										}}
										className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm"
									>
										{isSendingEmail ? 'Sending…' : 'Send'}
									</button>
								</div>
							</div>
						)}
						{sideTab === 'schedule' && (
							<div className="space-y-3 pt-1">
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="block text-xs text-slate-500">Date</label>
										<input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
									</div>
									<div>
										<label className="block text-xs text-slate-500">Time</label>
										<input type="text" placeholder="e.g. afternoon" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
									</div>
								</div>
								<div>
									<label className="block text-xs text-slate-500">Message</label>
									<textarea rows={4} value={scheduleMsg} onChange={e => setScheduleMsg(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
								</div>
								<div className="flex items-center gap-2">
									<button onClick={() => openScheduler({ name: editName, email: editEmail, phone: editPhone, kind: 'Consultation', defaultMessage: scheduleMsg })} className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm">Open Scheduler</button>
									<button onClick={() => {
										if (!editName || !editEmail || !scheduleDate || !scheduleTime) return;
										const today = new Date();
										const appt: Appointment = {
											id: Date.now().toString(),
											type: 'Consultation',
											date: scheduleDate || today.toISOString().slice(0,10),
											time: scheduleTime || `${today.getHours()}:00`,
											leadId: selectedLead?.id || 'user',
											propertyId: '',
											notes: scheduleMsg || 'Scheduled from Contacts'
										};
										setLocalAppointments(prev => [appt, ...prev]);
										alert('Scheduled locally. Google calendar via Open Scheduler.');
									}} className="px-3 py-2 rounded-md bg-slate-100 text-slate-700 text-sm">Quick add</button>
								</div>
							</div>
						)}
						</div>
					</div>
					<div className="px-4 pb-28 overflow-auto h-full">
						{sideTab === 'details' && (
							<div className="space-y-3 pt-1">
								<label className="block text-xs text-slate-500">Name</label>
								<input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
								<label className="block text-xs text-slate-500">Email</label>
								<input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
								{mode === 'leads' && (
									<>
										<label className="block text-xs text-slate-500">Phone</label>
										<input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
									</>
								)}
								<div className="flex items-center gap-2 pt-2">
									<a href={`mailto:${editEmail}`} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">Email</a>
									{mode === 'leads' && <a href={`tel:${editPhone}`} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-green-100 text-green-700">Call</a>}
								</div>
							</div>
						)}
						{sideTab === 'activity' && (
							<div className="space-y-3 pt-1">
								<div className="flex gap-2">
									<input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add note..." className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm" />
									<button onClick={() => { if (!selectedId || !newNote.trim()) return; setNotesByContact(prev => ({ ...prev, [selectedId]: [newNote.trim(), ...(prev[selectedId] || [])] })); setNewNote(''); }} className="px-3 py-2 rounded-md text-xs font-semibold bg-primary-600 text-white">Add</button>
								</div>
								<div className="space-y-2">
									{(selectedId && notesByContact[selectedId] ? notesByContact[selectedId] : []).map((n, idx) => (
										<div key={idx} className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700">{n}</div>
									))}
									{selectedId && (!notesByContact[selectedId] || notesByContact[selectedId].length === 0) && (
										<div className="text-xs text-slate-500">No activity yet.</div>
									)}
								</div>
							</div>
						)}
						{sideTab === 'appointments' && (
							<div className="space-y-3 pt-1 text-sm">
								{mode === 'leads' && selectedLead && (
									<button onClick={() => { const id = Date.now().toString(); const today = new Date(); const appt: Appointment = { id, type: 'Consultation', date: today.toISOString().slice(0,10), time: `${today.getHours()}:00`, leadId: selectedLead.id, propertyId: '', notes: 'Created from Contacts' }; setLocalAppointments(prev => [appt, ...prev]); }} className="px-3 py-2 rounded-md bg-primary-600 text-white">Add appointment</button>
								)}
								<div className="space-y-2">
									{(mode === 'leads' && selectedLead) ? (
										localAppointments.filter(a => a.leadId === selectedLead.id).map(a => (
											<div key={a.id} className="border border-slate-200 rounded-md px-3 py-2">
												<div className="font-medium text-slate-900">{a.type}</div>
												<div className="text-xs text-slate-500">{a.date} · {a.time}</div>
												{a.notes && <div className="text-xs text-slate-600 mt-1">{a.notes}</div>}
											</div>
										))
									) : (
										<div className="text-xs text-slate-500">Select a lead to view appointments.</div>
									)}
								</div>
							</div>
						)}
						{sideTab === 'invoices' && (
							<div className="space-y-3 pt-1 text-sm">
								<button onClick={() => { if (!selectedId) return; const inv = { id: Date.now().toString(), date: new Date().toISOString().slice(0,10), amount: 0, status: 'draft' as const, notes: 'New invoice' }; setInvoicesByContact(prev => ({ ...prev, [selectedId]: [inv, ...(prev[selectedId] || [])] })); }} className="px-3 py-2 rounded-md bg-slate-900 text-white">Add invoice</button>
								<div className="space-y-2">
									{selectedId && (invoicesByContact[selectedId] || []).map(inv => (
										<div key={inv.id} className="border border-slate-200 rounded-md px-3 py-2">
											<div className="flex items-center justify-between">
												<div className="font-medium text-slate-900">{inv.date}</div>
												<div className="text-xs text-slate-500">{inv.status}</div>
											</div>
											<div className="text-xs text-slate-600">${'{'}inv.amount{'}'}</div>
											{inv.notes && <div className="text-xs text-slate-500 mt-1">{inv.notes}</div>}
										</div>
									))}
									{selectedId && (!invoicesByContact[selectedId] || invoicesByContact[selectedId].length === 0) && (
										<div className="text-xs text-slate-500">No invoices yet.</div>
									)}
								</div>
							</div>
						)}
					</div>
					<div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-3 bg-white">
						<div className="flex items-center justify-between">
							<button onClick={() => { if (!selectedId) return; if (mode === 'users') { setLocalUsers(prev => prev.map(u => u.id === selectedId ? { ...u, name: editName, email: editEmail } : u)); } else { setLocalLeads(prev => prev.map(l => l.id === selectedId ? { ...l, name: editName, email: editEmail, phone: editPhone } : l)); } setIsModalOpen(false); }} className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm">Save</button>
							<button onClick={() => { if (!selectedId) return; if (mode === 'users') { setLocalUsers(prev => prev.filter(u => u.id !== selectedId)); } else { setLocalLeads(prev => prev.filter(l => l.id !== selectedId)); } setIsModalOpen(false); setSelectedId(null); }} className="px-3 py-2 rounded-md bg-red-600 text-white text-sm">Delete</button>
						</div>
					</div>
				</div>
			</div>
		)}
	</div>
	);
};

export default AdminContactsPage;
