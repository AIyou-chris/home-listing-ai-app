import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { supabaseContactService } from '../services/supabaseContactService';
import { Contact, ContactNote, ContactFile } from '../services/supabase';

const LEAD_STAGES = ['New', 'Qualified', 'Contacted', 'Showing', 'Lost'];
const CLIENT_STAGES = ['Onboarding', 'Active', 'Under Contract', 'Closed'];

interface SubscriptionLike {
	unsubscribe: () => void;
}

const hasUnsubscribe = (value: unknown): value is SubscriptionLike =>
	Boolean(value) && typeof (value as SubscriptionLike).unsubscribe === 'function';

const getFileCreatedAt = (file: ContactFile): string | null => {
	const withDate = file as ContactFile & { created_at?: string };
	return typeof withDate.created_at === 'string' ? withDate.created_at : null;
};

const AdminCRMContacts: React.FC = () => {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [query, setQuery] = useState('');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editing, setEditing] = useState<Contact | null>(null);
	const [form, setForm] = useState({
		name: '',
		email: '',
		phone: '',
		role: 'lead' as 'lead' | 'client',
		stage: 'New',
		avatar: '',
		sequences: [] as string[],
		pipelineNote: ''
	});

	// Actions side panel state
	const [isActionOpen, setIsActionOpen] = useState(false);
	const [actionContact, setActionContact] = useState<Contact | null>(null);
	const [actionTab, setActionTab] = useState<'contact' | 'notes' | 'files' | 'sequences'>('contact');
	const [notesById, setNotesById] = useState<Record<string, ContactNote[]>>({});
	const [newNote, setNewNote] = useState('');
	const [filesById, setFilesById] = useState<Record<string, ContactFile[]>>({});
	const [isLoading, setIsLoading] = useState(true);
	const [uploadingFile, setUploadingFile] = useState(false);

	// Import/Export

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return contacts;
		return contacts.filter(c =>
			c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
			c.phone?.toLowerCase().includes(q)
		);
	}, [contacts, query]);

	// Set up real-time listener for contacts
	useEffect(() => {
		let cleanup: (() => void) | null = null;
		const setupContacts = async () => {
			const { data: { user } } = await supabase.auth.getUser()
			if (user) {
				console.log('User authenticated:', user.id);
			const subOrFn = await supabaseContactService.onContactsChange((loadedContacts) => {
					console.log('Contacts loaded:', loadedContacts.length, 'contacts');
					console.log('Contact details:', loadedContacts);
					setContacts(loadedContacts);
					setIsLoading(false);
				});
				if (typeof subOrFn === 'function') {
					cleanup = subOrFn;
			} else if (hasUnsubscribe(subOrFn)) {
				cleanup = () => subOrFn.unsubscribe();
				} else {
					cleanup = null;
				}
			} else {
				console.log('No user authenticated');
				setContacts([]);
				setIsLoading(false);
			}
		};

		setupContacts();

		// Listen for auth changes
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN' && session?.user) {
				setupContacts();
			} else if (event === 'SIGNED_OUT') {
				setContacts([]);
				setIsLoading(false);
			}
		});

		return () => { if (cleanup) cleanup(); subscription.unsubscribe(); };
	}, []);

	// Load notes and files for action contact
	useEffect(() => {
		if (!actionContact) return;

		const loadNotes = async () => {
			try {
				const notes = await supabaseContactService.getContactNotes(actionContact.id);
				setNotesById(prev => ({ ...prev, [actionContact.id]: notes }));
			} catch (error) {
				console.error('Failed to load notes:', error);
			}
		};

		const loadFiles = async () => {
			try {
				const files = await supabaseContactService.getContactFiles(actionContact.id);
				setFilesById(prev => ({ ...prev, [actionContact.id]: files }));
			} catch (error) {
				console.error('Failed to load files:', error);
			}
		};

		loadNotes();
		loadFiles();
	}, [actionContact]);

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!actionContact || !event.target.files?.[0]) return;
		
		const file = event.target.files[0];
		setUploadingFile(true);

		try {
			await supabaseContactService.addContactFile(actionContact.id, file);
			// Refresh files list
			const files = await supabaseContactService.getContactFiles(actionContact.id);
			setFilesById(prev => ({ ...prev, [actionContact.id]: files }));
			// Reset file input
			event.target.value = '';
		} catch (error) {
			console.error('Failed to upload file:', error);
			alert('Failed to upload file. Please try again.');
		} finally {
			setUploadingFile(false);
		}
	};

	const handleDeleteFile = async (fileId: string) => {
		if (!actionContact) return;
		
		if (confirm('Are you sure you want to delete this file?')) {
			try {
				await supabaseContactService.deleteContactFile(fileId);
				
				// Refresh files list
				const files = await supabaseContactService.getContactFiles(actionContact.id);
				setFilesById(prev => ({ ...prev, [actionContact.id]: files }));
			} catch (error) {
				console.error('Failed to delete file:', error);
				alert('Failed to delete file. Please try again.');
			}
		}
	};

	const handleOpen = (c?: Contact) => {
		if (c) {
			setEditing(c);
			setForm({
				name: c.name,
				email: c.email,
				phone: c.phone || '',
				role: c.role,
				stage: c.stage,
				avatar: c.avatar || '',
				sequences: c.sequences || [],
				pipelineNote: c.pipeline_note || ''
			});
		} else {
			setEditing(null);
			setForm({
				name: '',
				email: '',
				phone: '',
				role: 'lead',
				stage: 'New',
				avatar: '',
				sequences: [],
				pipelineNote: ''
			});
		}
		setIsModalOpen(true);
	};

	const openActions = (c: Contact, tab: 'contact' | 'notes' | 'files' | 'sequences' = 'contact') => {
		setActionContact(c);
		setActionTab(tab);
		setNewNote('');
		setIsActionOpen(true);
	};

	const handleSave = async () => {
		if (!form.name.trim()) {
			alert('Please enter a name');
			return;
		}

		console.log('Saving contact:', form);

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			alert('You must be logged in to save contacts');
			return;
		}

		try {
			if (editing) {
				console.log('Updating contact:', editing.id);
				await supabaseContactService.updateContact(editing.id, {
					name: form.name,
					email: form.email,
					phone: form.phone,
					role: form.role,
					stage: form.stage,
					avatar: form.avatar,
					sequences: form.sequences,
					pipeline_note: form.pipelineNote
				});
				console.log('Contact updated successfully');
			} else {
				console.log('Creating new contact');
				const contactId = await supabaseContactService.createContact({
					name: form.name,
					email: form.email,
					phone: form.phone,
					role: form.role,
					stage: form.stage,
					avatar: form.avatar,
					sequences: form.sequences,
					pipeline_note: form.pipelineNote
				});
				console.log('Contact created successfully with ID:', contactId);
			}
			
			// Reset form and close modal
			setForm({
				name: '',
				email: '',
				phone: '',
				role: 'lead',
				stage: 'New',
				avatar: '',
				sequences: [],
				pipelineNote: ''
			});
			setEditing(null);
			setIsModalOpen(false);
			console.log('Modal closed and form reset');
		} catch (error) {
			console.error('Failed to save contact:', error);
			if (error instanceof Error) {
				console.error('Error details:', {
					message: error.message,
					stack: error.stack
				});
				alert(`Failed to save contact: ${error.message}`);
			} else {
				alert('Failed to save contact. Please try again.');
			}
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await supabaseContactService.deleteContact(id);
			if (editing?.id === id) setIsModalOpen(false);
		} catch (error) {
			console.error('Failed to delete contact:', error);
			alert('Failed to delete contact');
		}
	};

	const addFakeContact = async () => {
		try {
			await supabaseContactService.createContact({
				name: 'Sarah Wilson',
				email: 'sarah.wilson@example.com',
				phone: '(555) 987-6543',
				role: 'client',
				stage: 'Active',
				avatar: '',
				sequences: ['Client Welcome', 'Monthly Check-in'],
				pipeline_note: 'Interested in luxury properties, budget $2M+'
			});
			alert('Test contact added successfully!');
	} catch (error) {
		console.error('Failed to add test contact:', error);
		if (error instanceof Error) {
			alert(`Failed to add test contact: ${error.message}`);
		} else {
			alert('Failed to add test contact. Please try again.');
		}
		}
	};

	const handleAddNote = async () => {
		if (!actionContact || !newNote.trim()) return;

		try {
			await supabaseContactService.addContactNote(actionContact.id, newNote.trim());
			setNewNote('');
		} catch (error) {
			console.error('Failed to add note:', error);
			alert('Failed to add note');
		}
	};

	const handleDeleteNote = async (noteId: string) => {
		try {
			await supabaseContactService.deleteContactNote(noteId);
		} catch (error) {
			console.error('Failed to delete note:', error);
			alert('Failed to delete note');
		}
	};

	if (isLoading) {
		return (
			<div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
				<div className="text-center text-gray-500">Loading contacts...</div>
			</div>
		);
	}

	return (
		<div className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
			{/* Header Section */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
						<p className="text-gray-600 mt-1">Manage your leads and clients</p>
					</div>
					<div className="flex items-center gap-3">
						<button onClick={() => handleOpen()} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
							<span className="material-symbols-outlined text-sm">add</span>
							New Contact
						</button>
						<button onClick={addFakeContact} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">
							<span className="material-symbols-outlined text-sm">add</span>
							Test Contact
						</button>
						<div className="flex items-center gap-2">
						<button
							onClick={() => alert('Import coming soon')}
							className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
						>
								Import
							</button>
						<button
							onClick={() => alert('Export coming soon')}
							className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
						>
								Export
							</button>
						</div>
					</div>
				</div>

				{/* Search and Stats */}
				<div className="flex items-center justify-between">
					<div className="relative flex-1 max-w-md">
						<span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<span className="material-symbols-outlined text-gray-400">search</span>
						</span>
						<input 
							value={query} 
							onChange={e => setQuery(e.target.value)} 
							placeholder="Search contacts..." 
							className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						/>
					</div>
					<div className="flex items-center gap-4 text-sm text-gray-600">
						<span>{contacts.length} total contacts</span>
						<span>•</span>
						<span>{contacts.filter(c => c.role === 'lead').length} leads</span>
						<span>•</span>
						<span>{contacts.filter(c => c.role === 'client').length} clients</span>
					</div>
				</div>
			</div>

			{/* Contacts Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{filtered.map(c => (
					<div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
						<div className="p-6">
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-3">
									<div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-lg shadow-sm">
										{c.name[0].toUpperCase()}
									</div>
									<div className="min-w-0">
										<h3 className="text-lg font-semibold text-gray-900 truncate">{c.name}</h3>
										<p className="text-sm text-gray-500 truncate">{c.email}</p>
										{c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
									</div>
								</div>
							</div>
							
							<div className="flex flex-wrap gap-2 mb-4">
								<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
									c.role === 'lead' 
										? 'bg-amber-100 text-amber-800' 
										: 'bg-green-100 text-green-800'
								}`}>
									{c.role === 'lead' ? 'Lead' : 'Client'}
								</span>
								<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
									{c.stage}
								</span>
								{c.sequences && c.sequences.length > 0 && (
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 truncate max-w-[120px]" title={c.sequences.join(', ')}>
										{c.sequences[0]}{c.sequences.length > 1 ? ` +${c.sequences.length-1}` : ''}
									</span>
								)}
							</div>

							<div className="flex items-center justify-between pt-4 border-t border-gray-100">
								<div className="flex items-center gap-2">
									<button 
										onClick={() => openActions(c, 'contact')} 
										className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
									>
										<span className="material-symbols-outlined text-sm">more_horiz</span>
										Actions
									</button>
								</div>
								<div className="flex items-center gap-2">
									<button 
										onClick={() => handleOpen(c)} 
										className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
									>
										<span className="material-symbols-outlined text-sm">edit</span>
										Edit
									</button>
									<button 
										onClick={() => handleDelete(c.id)} 
										className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
									>
										<span className="material-symbols-outlined text-sm">delete</span>
										Delete
									</button>
								</div>
							</div>
						</div>
					</div>
				))}
				{filtered.length === 0 && (
					<div className="col-span-full">
						<div className="text-center py-12">
							<div className="mx-auto h-24 w-24 text-gray-300 mb-4">
								<span className="material-symbols-outlined text-6xl">group</span>
							</div>
							<h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
							<p className="text-gray-500 mb-6">Get started by creating your first contact.</p>
							<button 
								onClick={() => handleOpen()} 
								className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
							>
								<span className="material-symbols-outlined text-sm">add</span>
								Add Contact
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Contact Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
					<div className="relative w-full h-full sm:h-auto sm:w-[760px] max-h-[92vh] bg-white sm:rounded-2xl shadow-2xl overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
							<h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Contact' : 'New Contact'}</h3>
							<button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-md hover:bg-gray-100"><span className="material-symbols-outlined">close</span></button>
						</div>
						<div className="p-6 space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs text-gray-500 mb-1">Name *</label>
									<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Enter full name" />
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">Email</label>
									<input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="email@example.com" />
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">Phone</label>
									<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="(555) 123-4567" />
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="block text-xs text-gray-500 mb-1">Type</label>
								<select
									value={form.role}
									onChange={(e) => {
										const nextRole = e.target.value === 'client' ? 'client' : 'lead';
										setForm({
											...form,
											role: nextRole,
											stage: nextRole === 'lead' ? 'New' : 'Onboarding',
										});
									}}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								>
											<option value="lead">Lead</option>
											<option value="client">Client</option>
										</select>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">Stage</label>
										<select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
											{(form.role === 'lead' ? LEAD_STAGES : CLIENT_STAGES).map(s => (
												<option key={s} value={s}>{s}</option>
											))}
										</select>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2">
								<button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition">Cancel</button>
								<div className="flex items-center gap-2">
									{editing && (
										<button onClick={() => handleDelete(editing.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">Delete</button>
									)}
									<button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Save</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Actions side panel */}
			{isActionOpen && actionContact && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/40" onClick={() => setIsActionOpen(false)} />
					<aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
						<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
							<div className="min-w-0">
								<h3 className="text-base font-semibold text-gray-900 truncate">{actionContact.name}</h3>
								<p className="text-xs text-gray-500 truncate">{actionContact.email}{actionContact.phone ? ` · ${actionContact.phone}` : ''}</p>
							</div>
							<button onClick={() => setIsActionOpen(false)} className="p-1 rounded-md hover:bg-gray-100"><span className="material-symbols-outlined">close</span></button>
						</div>
						<div className="px-4 pt-3">
							<div className="flex items-center gap-2 mb-3 overflow-auto no-scrollbar">
								{(['contact','notes','files','sequences'] as const).map(tab => (
									<button key={tab} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${actionTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setActionTab(tab)}>
										{tab[0].toUpperCase()+tab.slice(1)}
									</button>
								))}
							</div>
						</div>
						<div className="flex-1 overflow-auto px-4 pb-24">
							{actionTab === 'contact' && (
								<div className="space-y-3">
									<a href={`tel:${actionContact.phone || ''}`} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
										<span className="material-symbols-outlined w-5 h-5">call</span>
										Call {actionContact.phone || ''}
									</a>
									<a href={`mailto:${encodeURIComponent(actionContact.email || '')}`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
										<span className="material-symbols-outlined w-5 h-5">mail</span>
										Email {actionContact.email || ''}
									</a>
									<div>
										<label className="block text-xs text-gray-500">Call Notes</label>
										<textarea rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Add call notes..." />
									</div>
									<button onClick={handleAddNote} className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 text-sm">Save Note</button>
								</div>
							)}
							{actionTab === 'notes' && (
								<div className="space-y-3">
									<div className="flex gap-2">
										<input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add note..." className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm" />
										<button onClick={handleAddNote} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm">Add</button>
									</div>
									<div className="space-y-2">
										{(notesById[actionContact.id] || []).map((note) => (
											<div key={note.id} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
												<div className="flex justify-between items-start">
													<div className="flex-1">{note.content}</div>
													<button onClick={() => handleDeleteNote(note.id)} className="ml-2 text-red-600 hover:text-red-800">✕</button>
												</div>
											</div>
										))}
										{!(notesById[actionContact.id] || []).length && <div className="text-xs text-gray-500">No notes yet.</div>}
									</div>
								</div>
							)}
							{actionTab === 'files' && actionContact && (
								<div className="space-y-3">
									<div className="flex gap-2">
										<label htmlFor="contact-file-upload" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer">
											<span className="material-symbols-outlined w-4 h-4">upload_file</span>
											{uploadingFile ? 'Uploading...' : 'Upload File'}
										</label>
										<input 
											id="contact-file-upload" 
											type="file" 
											className="hidden" 
											onChange={handleFileUpload}
											disabled={uploadingFile}
										/>
									</div>
									<div className="space-y-2">
										{(filesById[actionContact.id] || []).map((file) => (
											<div key={file.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
												<div className="flex items-center gap-3">
													<span className="material-symbols-outlined text-blue-600">description</span>
													<div>
										<div className="text-sm font-medium text-gray-900">{file.name}</div>
										<div className="text-xs text-gray-500">
											Added {(() => {
												const createdAt = getFileCreatedAt(file);
												return createdAt ? new Date(createdAt).toLocaleDateString() : '—';
											})()}
										</div>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<a 
														href={file.url} 
														target="_blank" 
														rel="noopener noreferrer"
														className="p-1 text-blue-600 hover:text-blue-800"
														title="Download"
													>
														<span className="material-symbols-outlined w-4 h-4">download</span>
													</a>
													<button 
														onClick={() => handleDeleteFile(file.id)}
														className="p-1 text-red-600 hover:text-red-800"
														title="Delete"
													>
														<span className="material-symbols-outlined w-4 h-4">delete</span>
													</button>
												</div>
											</div>
										))}
										{!(filesById[actionContact.id] || []).length && (
											<div className="text-xs text-gray-500 text-center py-4">No files uploaded yet.</div>
										)}
									</div>
								</div>
							)}
							{actionTab === 'sequences' && actionContact && (
								<div className="space-y-3">
									<div className="flex flex-wrap items-center gap-2">
										{(actionContact.sequences || []).map((s, i) => (
											<span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{s}</span>
										))}
										{!(actionContact.sequences && actionContact.sequences.length) && (
											<div className="text-xs text-gray-500">No sequences.</div>
										)}
									</div>
									<div className="flex gap-2">
										<input id="seq-input" placeholder="Add sequence name..." className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm" />
										<button onClick={async () => {
											const el = document.getElementById('seq-input') as HTMLInputElement | null;
											const val = (el?.value || '').trim();
											if (!val || !actionContact) return;
											await supabaseContactService.updateContact(actionContact.id, {
												sequences: [...(actionContact.sequences || []), val]
											});
											if (el) el.value = '';
										}} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm">Add</button>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">Pipeline Note</label>
										<textarea rows={4} defaultValue={actionContact.pipeline_note || ''} onBlur={async e => {
											await supabaseContactService.updateContact(actionContact.id, {
												pipeline_note: e.target.value
											});
										}} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Add pipeline notes..." />
									</div>
								</div>
							)}
						</div>
						<div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-3 bg-white flex items-center justify-between">
							<div className="text-xs text-gray-500">{actionContact.role === 'lead' ? 'Lead' : 'Client'} · {actionContact.stage}</div>
							<button onClick={() => setIsActionOpen(false)} className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 text-sm">Close</button>
						</div>
					</aside>
				</div>
			)}
		</div>
	);
};

export default AdminCRMContacts;


