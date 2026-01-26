import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsService } from '../services/listingsService';
import PublicPropertyApp from '../components/PublicPropertyApp';
import LoadingSpinner from '../components/LoadingSpinner';
import { Property } from '../types';

const PublicListingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProperty = async () => {
            if (!id) {
                setError('Invalid property URL');
                setLoading(false);
                return;
            }

            try {
                // listingsService usually expects auth, but getPropertyById performs a public lookup 
                // (or we need to ensure RLS allows public read for 'Active' properties)
                const data = await listingsService.getPropertyById(id);
                if (data) {
                    setProperty(data);
                    document.title = `${data.address} | HomeListingAI`;
                } else {
                    setError('Property not found');
                }
            } catch (err) {
                console.error('Failed to load public property:', err);
                setError('Unable to load property details');
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <LoadingSpinner size="xl" text="Loading Property..." />
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-slate-600">
                <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">home_work</span>
                <h1 className="text-2xl font-bold text-slate-800">Property Not Found</h1>
                <p className="mt-2">{error || "This listing may have been removed or is unavailable."}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <PublicPropertyApp
            property={property}
            onExit={() => navigate('/')}
            showBackButton={false} // Clean look for standalone page
        />
    );
};

export default PublicListingPage;
