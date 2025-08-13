
import React, { useState, useEffect, useMemo } from 'react';
import { Property, MarketingVideo } from '../types';
import Modal from './Modal';
import { generateVideoScript } from '../services/geminiService';

interface CreateVideoModalProps {
  properties: Property[];
  onClose: () => void;
  onSave: (video: Omit<MarketingVideo, 'id'>) => void;
}

const CreateVideoModal: React.FC<CreateVideoModalProps> = ({ properties, onClose, onSave }) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);
  const [script, setScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [music, setMusic] = useState('Uplifting');

  const selectedProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);

  useEffect(() => {
    // Reset selections when property changes
    if (selectedProperty) {
      const initialPhotos = (selectedProperty.galleryPhotos || [])
        .slice(0, 5) // Take first 5 photos by default
        .map(p => typeof p === 'string' ? p : URL.createObjectURL(p));
      setSelectedPhotoUrls(initialPhotos);
    } else {
        setSelectedPhotoUrls([]);
    }
    setScript('');
  }, [selectedProperty]);

  const handlePhotoSelect = (url: string) => {
    setSelectedPhotoUrls(prev => {
      if (prev.includes(url)) {
        return prev.filter(p => p !== url);
      }
      return [...prev, url];
    });
  };

  const handleGenerateScript = async () => {
    if (!selectedProperty) return;
    setIsGeneratingScript(true);
    const generatedScript = await generateVideoScript(selectedProperty);
    setScript(generatedScript);
    setIsGeneratingScript(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    // In a real app, this would trigger a backend video generation process.
    // Here, we'll just create a new video object with a mock URL.
    const newVideo: Omit<MarketingVideo, 'id'> = {
      propertyId: selectedProperty.id,
      propertyAddress: selectedProperty.address,
      propertyImageUrl: selectedProperty.imageUrl,
      title: `${selectedProperty.address.split(',')[0]} Social Reel`,
      script,
      music,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-a-luxurious-and-spacious-white-house-4262-large.mp4',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    };

    onSave(newVideo);
    onClose();
  };
  
  const allPhotos = useMemo(() => {
    if (!selectedProperty || !selectedProperty.galleryPhotos) return [];
    return selectedProperty.galleryPhotos.map(p => typeof p === 'string' ? p : URL.createObjectURL(p));
  }, [selectedProperty]);

  const titleNode = (
    <div className="flex items-center gap-3">
        <span className="material-symbols-outlined w-6 h-6 text-primary-600">videocam</span>
        <h3 className="text-xl font-bold text-slate-800">Create Social Media Video</h3>
    </div>
  );

  return (
    <Modal title={titleNode} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Step 1: Select Property */}
          <div>
            <label htmlFor="property" className="block text-sm font-semibold text-slate-700 mb-1.5">1. Select Property</label>
            <div className="relative">
              <select
                id="property"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
              <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Step 2: Select Photos */}
          {allPhotos.length > 0 && (
              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">2. Select Photos & Videos (up to 10)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {allPhotos.map(url => (
                          <button
                              key={url}
                              type="button"
                              onClick={() => handlePhotoSelect(url)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-4 ${selectedPhotoUrls.includes(url) ? 'border-primary-500' : 'border-transparent'}`}
                          >
                              <img src={url} alt="Selectable property media" className="w-full h-full object-cover" />
                              {selectedPhotoUrls.includes(url) && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <span className="material-symbols-outlined text-white text-3xl">check_circle</span>
                                  </div>
                              )}
                          </button>
                      ))}
                  </div>
              </div>
          )}

          {/* Step 3: Script */}
          <div>
              <label htmlFor="script" className="block text-sm font-semibold text-slate-700 mb-1.5">3. Edit Script</label>
              <textarea
                  id="script"
                  rows={5}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  placeholder="Video script will appear here..."
              />
              <button
                  type="button"
                  onClick={handleGenerateScript}
                  disabled={isGeneratingScript || !selectedProperty}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-slate-400"
              >
                  <span className="material-symbols-outlined w-4 h-4">sparkles</span>
                  <span>{isGeneratingScript ? 'Generating...' : 'Generate Script with AI'}</span>
              </button>
          </div>

          {/* Step 4: Music */}
          <div>
              <label htmlFor="music" className="block text-sm font-semibold text-slate-700 mb-1.5">4. Select Music</label>
              <select
                  id="music"
                  value={music}
                  onChange={(e) => setMusic(e.target.value)}
                  className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                  <option>Uplifting</option>
                  <option>Cinematic</option>
                  <option>Ambient</option>
                  <option>Upbeat Pop</option>
              </select>
          </div>
        </div>
        <div className="flex justify-end items-center px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                Generate Video
            </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateVideoModal;
