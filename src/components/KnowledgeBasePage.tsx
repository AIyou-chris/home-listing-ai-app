
import React, { useState } from 'react';
import { Property, AIPersonality, AIAssignment } from '../types';
import { AI_VOICES } from '../constants';
import AddTextKnowledgeModal from './AddTextKnowledgeModal';
import AddUrlScraperModal from './AddUrlScraperModal';

interface UploadedFile {
    id: string;
    name: string;
    size: string;
    status: 'uploading' | 'complete' | 'error';
    progress: number;
}

interface KnowledgeBasePageProps {
    properties: Property[];
    personalities: AIPersonality[];
    setPersonalities: React.Dispatch<React.SetStateAction<AIPersonality[]>>;
    assignments: AIAssignment[];
    setAssignments: React.Dispatch<React.SetStateAction<AIAssignment[]>>;
    onBackToDashboard: () => void;
}

// --- Tab Content Components ---

const AgentKnowledgeBaseContent: React.FC = () => {
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleSaveText = (data: { title: string, content: string }) => { console.log("Saving text knowledge:", data); setIsTextModalOpen(false); };
    const handleSaveUrl = (url: string) => { console.log("Saving URL to scrape:", url); setIsUrlModalOpen(false); };
    
    const handleFiles = (files: File[]) => {
        const newFiles: UploadedFile[] = files.map(file => ({
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            status: 'uploading',
            progress: 0,
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
        newFiles.forEach(file => {
            const interval = setInterval(() => {
                setUploadedFiles(prev => prev.map(f => f.id === file.id && f.progress < 100 ? { ...f, progress: f.progress + 10 } : f));
            }, 200);
            setTimeout(() => {
                clearInterval(interval);
                setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'complete', progress: 100 } : f));
            }, 2200);
        });
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFiles(Array.from(e.target.files)); };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) { handleFiles(Array.from(e.dataTransfer.files)); e.dataTransfer.clearData(); }
    };
    const handleRemoveFile = (fileId: string) => { setUploadedFiles(prev => prev.filter(f => f.id !== fileId)); };

    return (
        <>
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 flex items-start gap-5">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl text-primary-600">database</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Agent Knowledge Base</h2>
                    <p className="text-slate-600 mt-1">Upload documents, scripts, and materials that will help your AI understand your expertise and approach.</p>
                </div>
            </div>
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`relative p-8 text-center bg-white rounded-xl border-2 border-dashed ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'}`}>
                    <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-slate-400">publish</span>
                        <h3 className="mt-4 text-xl font-bold text-slate-800">Upload Agent Files</h3>
                        <p className="mt-1 text-slate-500">Drag and drop files here, or click to browse</p>
                        <label htmlFor="agent-file-upload" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition cursor-pointer"><span className="material-symbols-outlined w-5 h-5">upload</span> Choose Files</label>
                        <input id="agent-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
                <div className="mt-10">
                    <h2 className="text-xl font-bold text-slate-800">Uploaded Files</h2>
                    <div className="mt-4 space-y-3">{uploadedFiles.length === 0 ? <div className="text-center py-12 text-slate-400"><span className="material-symbols-outlined text-6xl">draft</span><p className="mt-4 font-semibold text-slate-500">No files uploaded yet.</p><p className="text-sm">Upload documents to train your AI assistant.</p></div> : uploadedFiles.map(file => <div key={file.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4"><span className="material-symbols-outlined text-3xl text-slate-400">description</span><div className="flex-grow"><div className="flex justify-between items-start"><p className="font-semibold text-slate-800">{file.name}</p><p className="text-sm text-slate-500">{file.size}</p></div><div className="mt-1 flex items-center gap-2"><div className="w-full bg-slate-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full transition-all duration-300 ${file.status === 'complete' ? 'bg-green-500' : 'bg-primary-500'}`} style={{width: `${file.progress}%`}}></div></div>{file.status === 'complete' ? <span className="material-symbols-outlined text-green-500">check_circle</span> : file.status === 'uploading' ? <span className="text-xs font-semibold text-slate-500">{file.progress}%</span> : <span className="material-symbols-outlined text-red-500">error</span>}</div></div><button onClick={() => handleRemoveFile(file.id)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"><span className="material-symbols-outlined">delete</span></button></div>)}</div>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between p-2"><div className="flex items-center gap-4"><span className="material-symbols-outlined text-3xl text-slate-500">edit_note</span><div><h3 className="font-bold text-slate-800">Add Text Knowledge</h3><p className="text-sm text-slate-500">Manually add text snippets or Q&A.</p></div></div><button type="button" onClick={() => setIsTextModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"><span className="material-symbols-outlined w-5 h-5">add</span><span>Add Text</span></button></div>
                    <div className="flex items-center justify-between p-2"><div className="flex items-center gap-4"><span className="material-symbols-outlined text-3xl text-slate-500">language</span><div><h3 className="font-bold text-slate-800">URL Scraper</h3><p className="text-sm text-slate-500">Add a webpage for the AI to learn from.</p></div></div><button type="button" onClick={() => setIsUrlModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"><span className="material-symbols-outlined w-5 h-5">add</span><span>Add URL</span></button></div>
                </div>
            </div>
            {isTextModalOpen && <AddTextKnowledgeModal onClose={() => setIsTextModalOpen(false)} onSave={handleSaveText} />}
            {isUrlModalOpen && <AddUrlScraperModal onClose={() => setIsUrlModalOpen(false)} onSave={handleSaveUrl} />}
        </>
    );
};

const ListingKnowledgeBaseContent: React.FC<{ properties: Property[] }> = ({ properties }) => {
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleSaveText = (data: { title: string, content: string }) => { console.log("Saving text knowledge for listing:", data); setIsTextModalOpen(false); };
    const handleSaveUrl = (url: string) => { console.log("Saving URL to scrape for listing:", url); setIsUrlModalOpen(false); };
    
    const handleFiles = (files: File[]) => {
        const newFiles: UploadedFile[] = files.map(file => ({
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            status: 'uploading',
            progress: 0,
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
        newFiles.forEach(file => {
            const interval = setInterval(() => {
                setUploadedFiles(prev => prev.map(f => f.id === file.id && f.progress < 100 ? { ...f, progress: f.progress + 10 } : f));
            }, 200);
            setTimeout(() => {
                clearInterval(interval);
                setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'complete', progress: 100 } : f));
            }, 2200);
        });
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFiles(Array.from(e.target.files)); };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) { handleFiles(Array.from(e.dataTransfer.files)); e.dataTransfer.clearData(); }
    };
    const handleRemoveFile = (fileId: string) => { setUploadedFiles(prev => prev.filter(f => f.id !== fileId)); };
    
    return (
        <>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 flex items-start gap-5">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl text-teal-600">home_work</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Listing Knowledge Base</h2>
                    <p className="text-slate-600 mt-1">Provide listing-specific documents like inspection reports, disclosures, or marketing flyers to train the AI.</p>
                </div>
            </div>
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <div className="mb-8">
                    <label htmlFor="property-select" className="block text-sm font-semibold text-slate-700 mb-1.5">Select a Listing to Add Knowledge To</label>
                    <div className="relative">
                        <select id="property-select" className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                           {properties.length > 0 ? properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>) : <option disabled>No listings found</option>}
                        </select>
                        <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                    </div>
                </div>
                <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`relative p-8 text-center bg-white rounded-xl border-2 border-dashed ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-300'}`}>
                    <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-slate-400">publish</span>
                        <h3 className="mt-4 text-xl font-bold text-slate-800">Upload Listing Files</h3>
                        <p className="mt-1 text-slate-500">Drag and drop property-specific files here</p>
                        <label htmlFor="listing-file-upload" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition cursor-pointer"><span className="material-symbols-outlined w-5 h-5">upload</span> Choose Files</label>
                        <input id="listing-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
                <div className="mt-10">
                    <h2 className="text-xl font-bold text-slate-800">Uploaded Files</h2>
                    <div className="mt-4 space-y-3">
                      {uploadedFiles.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <span className="material-symbols-outlined text-6xl">draft</span>
                          <p className="mt-4 font-semibold text-slate-500">
                            No files uploaded for this listing.
                          </p>
                          <p className="text-sm">
                            Upload documents to train your AI assistant.
                          </p>
                        </div>
                      ) : (
                        uploadedFiles.map(file => (
                          <div 
                            key={file.id} 
                            className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4"
                          >
                            <span className="material-symbols-outlined text-3xl text-slate-400">
                              description
                            </span>
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <p className="font-semibold text-slate-800">{file.name}</p>
                                <p className="text-sm text-slate-500">{file.size}</p>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      file.status === 'complete' ? 'bg-green-500' : 'bg-primary-500'
                                    }`} 
                                    style={{width: `${file.progress}%`}}
                                  ></div>
                                </div>
                                {file.status === 'complete' ? (
                                  <span className="material-symbols-outlined text-green-500">
                                    check_circle
                                  </span>
                                ) : file.status === 'uploading' ? (
                                  <span className="text-xs font-semibold text-slate-500">
                                    {file.progress}%
                                  </span>
                                ) : (
                                  <span className="material-symbols-outlined text-red-500">
                                    error
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveFile(file.id)} 
                              className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between p-2"><div className="flex items-center gap-4"><span className="material-symbols-outlined text-3xl text-slate-500">edit_note</span><div><h3 className="font-bold text-slate-800">Add Text Knowledge</h3><p className="text-sm text-slate-500">Manually add text snippets or Q&A.</p></div></div><button type="button" onClick={() => setIsTextModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"><span className="material-symbols-outlined w-5 h-5">add</span><span>Add Text</span></button></div>
                    <div className="flex items-center justify-between p-2"><div className="flex items-center gap-4"><span className="material-symbols-outlined text-3xl text-slate-500">language</span><div><h3 className="font-bold text-slate-800">URL Scraper</h3><p className="text-sm text-slate-500">Add a webpage for the AI to learn from.</p></div></div><button type="button" onClick={() => setIsUrlModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition"><span className="material-symbols-outlined w-5 h-5">add</span><span>Add URL</span></button></div>
                </div>
            </div>
            {isTextModalOpen && <AddTextKnowledgeModal onClose={() => setIsTextModalOpen(false)} onSave={handleSaveText} />}
            {isUrlModalOpen && <AddUrlScraperModal onClose={() => setIsUrlModalOpen(false)} onSave={handleSaveUrl} />}
        </>
    );
};

const AIPersonalityContent: React.FC<{
    personalities: AIPersonality[];
    assignments: AIAssignment[];
    setAssignments: React.Dispatch<React.SetStateAction<AIAssignment[]>>;
}> = ({ personalities, assignments, setAssignments }) => {
    
    const handleAssignmentChange = (assignmentId: string, field: 'personalityId' | 'voiceId', value: string | null) => {
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, [field]: value } : a));
    };

    return (
        <>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex items-start gap-5">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl text-orange-600">psychology</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">AI Personality & Voice</h2>
                    <p className="text-slate-600 mt-1">Customize the tone, style, and voice of your AI assistants to perfectly match your brand.</p>
                </div>
            </div>
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <h3 className="text-xl font-bold text-slate-800">AI Assignments</h3>
                <p className="text-sm text-slate-500 mt-1 mb-6">Assign a personality and voice to each of your AI assistants.</p>

                <div className="space-y-6">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="p-5 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                            <h4 className="font-bold text-slate-800 text-lg">{assignment.name}</h4>
                            <p className="text-sm text-slate-500 mt-1">{assignment.description}</p>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor={`personality-${assignment.id}`} className="block text-xs font-semibold text-slate-600 mb-1">Personality</label>
                                    <div className="relative">
                                        <select id={`personality-${assignment.id}`} value={assignment.personalityId || ''} onChange={(e) => handleAssignmentChange(assignment.id, 'personalityId', e.target.value)} className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                            {personalities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                         <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor={`voice-${assignment.id}`} className="block text-xs font-semibold text-slate-600 mb-1">Voice</label>
                                    <div className="relative">
                                        <select id={`voice-${assignment.id}`} value={assignment.voiceId || ''} onChange={(e) => handleAssignmentChange(assignment.id, 'voiceId', e.target.value)} className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                            {AI_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                         <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};


// --- Main Page Component ---

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ properties, personalities, setPersonalities, assignments, setAssignments, onBackToDashboard }) => {
    const [activeTab, setActiveTab] = useState('agent');

    const tabs = [
        { id: 'agent', label: 'Agent Knowledge', icon: 'database' },
        { id: 'listing', label: 'Listing Knowledge', icon: 'home_work' },
        { id: 'personality', label: 'AI Personality', icon: 'psychology' },
    ];
    
    return (
        <div className="bg-slate-50 min-h-full">
            <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
                    <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                    <span>Back to Dashboard</span>
                </button>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">AI Knowledge Base</h1>
                    <p className="text-slate-500 mt-1">Train your AI assistants to be experts on you and your properties.</p>
                </header>

                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                            >
                                <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                
                <main className="mt-8">
                    {activeTab === 'agent' && <AgentKnowledgeBaseContent />}
                    {activeTab === 'listing' && <ListingKnowledgeBaseContent properties={properties} />}
                    {activeTab === 'personality' && <AIPersonalityContent personalities={personalities} assignments={assignments} setAssignments={setAssignments} />}
                </main>
            </div>
        </div>
    );
};

export default KnowledgeBasePage;
