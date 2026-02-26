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
            <div className="min-h-screen flex items-center justify-center bg-[#02050D]">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="mt-4 text-cyan-400 font-medium">Loading store...</div>
                </div>
            </div>
        );
    }

    if (!accountId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#02050D] relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="text-center relative z-10">
                    <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">storefront</span>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Store Not Found</h1>
                    <p className="text-slate-400 mt-3 font-light">This agent hasn't set up their store yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#02050D] font-sans relative overflow-hidden text-white">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-1/2 w-[800px] h-[400px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

            {/* Header */}
            <header className="bg-[#0B1121]/80 backdrop-blur-md border-b border-cyan-900/30 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                            {agentName.charAt(0)}
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">{agentName}'s Store</h1>
                    </div>
                    <div className="text-sm text-slate-400 font-light flex items-center gap-2">
                        Powered by
                        <span className="font-bold text-white flex items-center gap-2">
                            <img src="/newlogo.png" alt="Logo" className="w-5 h-5 opacity-80" />
                            HomeListingAI
                        </span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-6 py-16 relative z-10">
                <div className="mb-12">
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Available Services</h2>
                    <p className="text-slate-400 font-light">Discover and purchase premium services offered by {agentName}.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <div key={product.id} className="bg-[#0B1121]/80 backdrop-blur-sm rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-slate-800/60 overflow-hidden hover:border-cyan-500/30 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] transition-all group flex flex-col h-full">
                            <div className="h-48 bg-gradient-to-br from-slate-900 to-[#02050D] flex items-center justify-center text-slate-700 relative overflow-hidden border-b border-slate-800/60">
                                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="material-symbols-outlined text-6xl group-hover:scale-110 transition-transform duration-500 text-slate-600 group-hover:text-cyan-500/50">inventory_2</span>
                            </div>
                            <div className="p-8 flex-grow flex flex-col">
                                <h3 className="font-bold text-xl text-white mb-3 tracking-tight group-hover:text-cyan-400 transition-colors">{product.name}</h3>
                                <p className="text-slate-400 font-light mb-8 h-12 overflow-hidden text-ellipsis line-clamp-2">
                                    {product.description || 'Premium service offering.'}
                                </p>
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                                    <span className="text-2xl font-bold text-white tracking-tight">
                                        {product.default_price
                                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: product.default_price.currency }).format(product.default_price.unit_amount / 100)
                                            : 'Free'}
                                    </span>
                                    <button
                                        onClick={() => product.default_price && handleBuy(product.default_price.id)}
                                        disabled={!product.default_price}
                                        className="px-6 py-3 bg-white text-slate-950 text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        Buy Now
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="text-center py-24 bg-[#0B1121]/50 backdrop-blur-sm rounded-3xl border border-slate-800/60">
                        <span className="material-symbols-outlined text-6xl mb-4 text-slate-700 block">shopping_bag</span>
                        <h3 className="text-xl font-bold text-white mb-2">No products available</h3>
                        <p className="text-slate-400 font-light">Check back later for new services and offerings.</p>
                    </div>
                )}
            </main>
        </div>
    );
};
