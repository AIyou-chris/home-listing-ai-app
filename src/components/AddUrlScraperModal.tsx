import React, { useState } from 'react';
import Modal from './Modal';

interface AddUrlScraperModalProps {
    onClose: () => void;
    onSave: (url: string) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1.5">
        {children}
    </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
    />
);

const AddUrlScraperModal: React.FC<AddUrlScraperModalProps> = ({ onClose, onSave }) => {
    const [url, setUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Basic URL validation
            new URL(url);
            onSave(url);
        } catch (_) {
            alert('Please enter a valid URL.');
        }
    };

    const titleNode = (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined w-6 h-6 text-primary-600">link</span>
            <h3 className="text-xl font-bold text-slate-800">Add URL to Scrape</h3>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">Enter a URL to a website (e.g., a Zillow listing, your personal website, a news article) and the AI will learn from its content.</p>
                    <div>
                        <Label htmlFor="scraper-url">Website URL</Label>
                        <Input
                            type="url"
                            id="scraper-url"
                            placeholder="https://example.com/property-details"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="flex justify-end items-center px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                        Add URL
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddUrlScraperModal;

