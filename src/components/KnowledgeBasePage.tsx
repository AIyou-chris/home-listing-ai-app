
import React, { useState } from 'react';
import { Property, AIPersonality, AIAssignment, AIVoice, KnowledgeBasePriority, PersonalityTest } from '../types';
import { AI_PERSONALITIES, AI_VOICES, KNOWLEDGE_BASE_PRIORITIES, PERSONALITY_TEST_QUESTIONS, DEFAULT_AI_ASSIGNMENTS } from '../constants';
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
                    <span className="material-symbols-outlined text-3xl text-primary-600">person</span>
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
                        <label htmlFor="agent-file-upload" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition cursor-pointer">
                            <span className="material-symbols-outlined w-5 h-5">upload</span> Choose Files
                        </label>
                        <input id="agent-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
                <div className="mt-10">
                    <h2 className="text-xl font-bold text-slate-800">Uploaded Files</h2>
                    <div className="mt-4 space-y-3">
                        {uploadedFiles.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <span className="material-symbols-outlined text-6xl">draft</span>
                                <p className="mt-4 font-semibold text-slate-500">No files uploaded yet.</p>
                                <p className="text-sm">Upload documents to train your AI assistant.</p>
                            </div>
                        ) : (
                            uploadedFiles.map(file => (
                                <div key={file.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4">
                                    <span className="material-symbols-outlined text-3xl text-slate-400">description</span>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-slate-800">{file.name}</p>
                                            <p className="text-sm text-slate-500">{file.size}</p>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full transition-all duration-300 ${file.status === 'complete' ? 'bg-green-500' : 'bg-primary-500'}`} style={{width: `${file.progress}%`}}></div>
                                            </div>
                                            {file.status === 'complete' ? (
                                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                                            ) : file.status === 'uploading' ? (
                                                <span className="text-xs font-semibold text-slate-500">{file.progress}%</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-red-500">error</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveFile(file.id)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-3xl text-slate-500">edit_note</span>
                            <div>
                                <h3 className="font-bold text-slate-800">Add Text Knowledge</h3>
                                <p className="text-sm text-slate-500">Manually add text snippets or Q&A.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsTextModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add Text</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-3xl text-slate-500">language</span>
                            <div>
                                <h3 className="font-bold text-slate-800">URL Scraper</h3>
                                <p className="text-sm text-slate-500">Add a webpage for the AI to learn from.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsUrlModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add URL</span>
                        </button>
                    </div>
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
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-start gap-5">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl text-green-600">home_work</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Listing Knowledge Base</h2>
                    <p className="text-slate-600 mt-1">Upload property-specific documents, floor plans, and materials for this listing.</p>
                </div>
            </div>
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`relative p-8 text-center bg-white rounded-xl border-2 border-dashed ${isDragging ? 'border-green-500 bg-green-50' : 'border-slate-300'}`}>
                    <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-slate-400">publish</span>
                        <h3 className="mt-4 text-xl font-bold text-slate-800">Upload Listing Files</h3>
                        <p className="mt-1 text-slate-500">Drag and drop files here, or click to browse</p>
                        <label htmlFor="listing-file-upload" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition cursor-pointer">
                            <span className="material-symbols-outlined w-5 h-5">upload</span> Choose Files
                        </label>
                        <input id="listing-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
                <div className="mt-10">
                    <h2 className="text-xl font-bold text-slate-800">Uploaded Files</h2>
                    <div className="mt-4 space-y-3">
                        {uploadedFiles.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <span className="material-symbols-outlined text-6xl">draft</span>
                                <p className="mt-4 font-semibold text-slate-500">No files uploaded yet.</p>
                                <p className="text-sm">Upload property documents to train your AI assistant.</p>
                            </div>
                        ) : (
                            uploadedFiles.map(file => (
                                <div key={file.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4">
                                    <span className="material-symbols-outlined text-3xl text-slate-400">description</span>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-slate-800">{file.name}</p>
                                            <p className="text-sm text-slate-500">{file.size}</p>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full transition-all duration-300 ${file.status === 'complete' ? 'bg-green-500' : 'bg-green-500'}`} style={{width: `${file.progress}%`}}></div>
                                            </div>
                                            {file.status === 'complete' ? (
                                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                                            ) : file.status === 'uploading' ? (
                                                <span className="text-xs font-semibold text-slate-500">{file.progress}%</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-red-500">error</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveFile(file.id)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-3xl text-slate-500">edit_note</span>
                            <div>
                                <h3 className="font-bold text-slate-800">Add Text Knowledge</h3>
                                <p className="text-sm text-slate-500">Manually add text snippets or Q&A.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsTextModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add Text</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-3xl text-slate-500">language</span>
                            <div>
                                <h3 className="font-bold text-slate-800">URL Scraper</h3>
                                <p className="text-sm text-slate-500">Add a webpage for the AI to learn from.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsUrlModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add URL</span>
                        </button>
                    </div>
                </div>
            </div>
            {isTextModalOpen && <AddTextKnowledgeModal onClose={() => setIsTextModalOpen(false)} onSave={handleSaveText} />}
            {isUrlModalOpen && <AddUrlScraperModal onClose={() => setIsUrlModalOpen(false)} onSave={handleSaveUrl} />}
        </>
    );
};

const MarketingKnowledgeBaseContent: React.FC = () => {
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
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 flex items-start gap-5">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl text-purple-600">bar_chart</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Market Knowledge Base</h2>
                    <p className="text-slate-600 mt-1">Upload market data, comps, trends, and research materials for AI analysis.</p>
                </div>
            </div>
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`relative p-8 text-center bg-white rounded-xl border-2 border-dashed ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-slate-300'}`}>
                    <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-slate-400">publish</span>
                        <h3 className="mt-4 text-xl font-bold text-slate-800">Upload Market Files</h3>
                        <p className="mt-1 text-slate-500">Drag and drop files here, or click to browse</p>
                        <label htmlFor="marketing-file-upload" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-lg shadow-sm hover:bg-purple-700 transition cursor-pointer">
                            <span className="material-symbols-outlined w-5 h-5">upload</span> Choose Files
                        </label>
                        <input id="marketing-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                    </div>
                </div>
                <div className="mt-10">
                    <h2 className="text-xl font-bold text-slate-800">Uploaded Files</h2>
                    <div className="mt-4 space-y-3">
                        {uploadedFiles.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <span className="material-symbols-outlined text-6xl">draft</span>
                                <p className="mt-4 font-semibold text-slate-500">No files uploaded yet.</p>
                                <p className="text-sm">Upload market documents to train your AI assistant.</p>
                            </div>
                        ) : (
                            uploadedFiles.map(file => (
                                <div key={file.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4">
                                    <span className="material-symbols-outlined text-3xl text-slate-400">description</span>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-slate-800">{file.name}</p>
                                            <p className="text-sm text-slate-500">{file.size}</p>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full transition-all duration-300 ${file.status === 'complete' ? 'bg-green-500' : 'bg-purple-500'}`} style={{width: `${file.progress}%`}}></div>
                                            </div>
                                            {file.status === 'complete' ? (
                                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                                            ) : file.status === 'uploading' ? (
                                                <span className="text-xs font-semibold text-slate-500">{file.progress}%</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-red-500">error</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveFile(file.id)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-3xl text-slate-500">edit_note</span>
                            <div>
                                <h3 className="font-bold text-slate-800">Add Text Knowledge</h3>
                                <p className="text-sm text-slate-500">Manually add text snippets or Q&A.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsTextModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add Text</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-3xl text-slate-500">language</span>
                            <div>
                                <h3 className="font-bold text-slate-800">URL Scraper</h3>
                                <p className="text-sm text-slate-500">Add a webpage for the AI to learn from.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsUrlModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">add</span>
                            <span>Add URL</span>
                        </button>
                    </div>
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
    const [selectedPersonality, setSelectedPersonality] = useState<string>('');
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [testQuestion, setTestQuestion] = useState<string>('');
    const [personalityResponses, setPersonalityResponses] = useState<{[key: string]: string}>({});
    
    const handleAssignmentChange = (assignmentId: string, field: 'personalityId' | 'voiceId' | 'knowledgePriority', value: string) => {
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, [field]: value } : a));
    };

    const handleTestQuestion = () => {
        if (!testQuestion.trim()) return;
        
        const responses: {[key: string]: string} = {};
        AI_PERSONALITIES.forEach(personality => {
            // Simulate AI response based on personality
            const response = personality.sampleResponses[0]?.response || 'I would respond based on my personality traits.';
            responses[personality.id] = response;
        });
        setPersonalityResponses(responses);
    };

    const playVoiceSample = (voiceId: string) => {
        // This would integrate with actual voice synthesis
        console.log('Playing voice sample for:', voiceId);
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

            {/* AI Assignments Section */}
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">AI Sidekick Assignments</h3>
                <p className="text-sm text-slate-500 mb-6">Configure your three AI sidekicks with personalities, voices, and knowledge priorities.</p>

                <div className="space-y-6">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="p-6 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    assignment.type === 'listing' ? 'bg-green-100' :
                                    assignment.type === 'agent' ? 'bg-blue-100' : 'bg-purple-100'
                                }`}>
                                    <span className={`material-symbols-outlined text-xl ${
                                        assignment.type === 'listing' ? 'text-green-600' :
                                        assignment.type === 'agent' ? 'text-blue-600' : 'text-purple-600'
                                    }`}>
                                        {assignment.type === 'listing' ? 'home_work' :
                                         assignment.type === 'agent' ? 'person' : 'psychology'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg">{assignment.name}</h4>
                                    <p className="text-sm text-slate-500">{assignment.description}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Personality Selection */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-2">Personality</label>
                                    <div className="relative">
                                        <select 
                                            value={assignment.personalityId || ''} 
                                            onChange={(e) => handleAssignmentChange(assignment.id, 'personalityId', e.target.value)}
                                            className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">Select Personality</option>
                                            {AI_PERSONALITIES.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                {/* Voice Selection */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-2">Voice</label>
                                    <div className="relative">
                                        <select 
                                            value={assignment.voiceId || ''} 
                                            onChange={(e) => handleAssignmentChange(assignment.id, 'voiceId', e.target.value)}
                                            className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">Select Voice</option>
                                            {AI_VOICES.map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                {/* Knowledge Priority */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-2">Knowledge Priority</label>
                                    <div className="relative">
                                        <select 
                                            value={assignment.knowledgePriority} 
                                            onChange={(e) => handleAssignmentChange(assignment.id, 'knowledgePriority', e.target.value)}
                                            className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            {KNOWLEDGE_BASE_PRIORITIES.map(kb => (
                                                <option key={kb.id} value={kb.id}>{kb.name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Personality Testing Section */}
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Personality Testing</h3>
                <p className="text-sm text-slate-500 mb-6">Test how different personalities would respond to the same question.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Ask a question to test personalities:</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={testQuestion}
                                onChange={(e) => setTestQuestion(e.target.value)}
                                placeholder="e.g., What makes this property a good investment?"
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                                onClick={handleTestQuestion}
                                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
                            >
                                Test Responses
                            </button>
                        </div>
                    </div>

                    {Object.keys(personalityResponses).length > 0 && (
                        <div className="mt-6 space-y-4">
                            {AI_PERSONALITIES.map(personality => (
                                <div key={personality.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h4 className="font-semibold text-slate-800">{personality.name}</h4>
                                        <div className="flex gap-1">
                                            {personality.traits.slice(0, 3).map((trait, index) => (
                                                <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                                    {trait}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-slate-700">{personalityResponses[personality.id]}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Voice Sampling Section */}
            <div className="mt-8 bg-white rounded-xl shadow-xl border border-slate-200/60 p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Voice Samples</h3>
                <p className="text-sm text-slate-500 mb-6">Listen to different voice options for your AI assistants.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AI_VOICES.map(voice => (
                        <div key={voice.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold text-slate-800">{voice.name}</h4>
                                    <p className="text-sm text-slate-500">{voice.description}</p>
                                </div>
                                <button
                                    onClick={() => playVoiceSample(voice.id)}
                                    className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition"
                                >
                                    <span className="material-symbols-outlined">play_arrow</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="capitalize">{voice.gender}</span>
                                {voice.accent && (
                                    <>
                                        <span>•</span>
                                        <span>{voice.accent} accent</span>
                                    </>
                                )}
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
        { id: 'agent', label: 'Agent Knowledge Base', icon: 'person' },
        { id: 'listing', label: 'Listing Knowledge Base', icon: 'home_work' },
        { id: 'marketing', label: 'Market Knowledge Base', icon: 'bar_chart' },
        { id: 'personality', label: 'AI Personalities', icon: 'psychology' },
    ];
    
    return (
        <div className="bg-slate-50 min-h-full">
            <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
                    <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                    <span>Back to Dashboard</span>
                </button>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Knowledge Base & AI Training</h1>
                    <p className="text-slate-500 mt-1">Manage your AI assistant's knowledge, conversations, and voice recordings.</p>
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
                    {activeTab === 'marketing' && <MarketingKnowledgeBaseContent />}
                    {activeTab === 'personality' && <AIPersonalityContent personalities={personalities} assignments={assignments} setAssignments={setAssignments} />}
                </main>
            </div>
        </div>
    );
};

export default KnowledgeBasePage;
