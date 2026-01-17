import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { connectService, StripeProduct } from '../services/connectService';
import { agentOnboardingService } from '../services/agentOnboardingService';
import { AgentProfile } from '../types';

export const StorefrontPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>(); // We use slug to look up the agent/account
    const [products, setProducts] = useState<StripeProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [agentName, setAgentName] = useState('Agent Store');
    const [accountId, setAccountId] = useState<string | null>(null);

    useEffect(() => {
        const loadStore = async () => {
            try {
                // 1. Resolve Agent Slug to Account ID
                // In a real app, the Agent public record should have the 'stripe_account_id' exposed.
                // We might need to update 'agentOnboardingService.getAgentBySlug' to return this field if public.
                // For this demo, let's assume getAgentBySlug returns it or we fetch it from a specific endpoint.
                const agent = await agentOnboardingService.getAgentBySlug(slug!);

                if (agent) {
                    setAgentName(`${agent.first_name} ${agent.last_name}`);
                    // Use the updated interface
                    const accId = (agent as unknown as AgentProfile).stripe_account_id;

                    if (accId) {
                        setAccountId(accId);
                        // 2. Load Products
                        const list = await connectService.listProducts(accId);
                        setProducts(list);
                    }
                }
            } catch (err) {
                console.error('Failed to load store', err);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            loadStore();
        }
    }, [slug]);

    const handleBuy = async (priceId: string) => {
        if (!accountId) return;
        try {
            const url = await connectService.createCheckoutSession(accountId, priceId);
            window.location.href = url;
        } catch (err) {
            alert('Checkout failed');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-slate-500">Loading store...</div>
            </div>
        );
    }

    if (!accountId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-800">Store Not Found</h1>
                    <p className="text-slate-600 mt-2">This agent hasn't set up their store yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            {agentName.charAt(0)}
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">{agentName}'s Store</h1>
                    </div>
                    <div className="text-sm text-slate-500">
                        Powered by <span className="font-semibold text-indigo-600">HomeListingAI</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-6 py-10">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-4xl">inventory_2</span>
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-lg text-slate-900 mb-2">{product.name}</h3>
                                <p className="text-sm text-slate-600 mb-6 h-10 overflow-hidden text-ellipsis line-clamp-2">
                                    {product.description || 'No description provided.'}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-2xl font-bold text-slate-900">
                                        {product.default_price
                                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: product.default_price.currency }).format(product.default_price.unit_amount / 100)
                                            : 'Free'}
                                    </span>
                                    <button
                                        onClick={() => product.default_price && handleBuy(product.default_price.id)}
                                        disabled={!product.default_price}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">shopping_bag</span>
                        <p>No products available right now.</p>
                    </div>
                )}
            </main>
        </div>
    );
};
