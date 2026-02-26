import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { BackgroundTechIcons } from '../../components/BackgroundTechIcons';
import { FadeIn } from '../../components/FadeIn';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    featured_image: string;
    published_at: string;
    status: string;
}

const BlogIndex: React.FC = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        // Only fetch published posts for the public view
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false }); // Show newest first

        if (!error && data) {
            setPosts(data);
        }
        setLoading(false);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">
            <Helmet>
                <title>Blog - HomeListingAI | Real Estate Tips & Market Insights</title>
                <meta name="description" content="Stay updated with the latest real estate marketing trends, AI tools for agents, and property listing tips from HomeListingAI." />
            </Helmet>

            <PublicHeader />

            {/* Ambient Background Glows */}
            <BackgroundTechIcons />
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <main className="flex-grow pt-20">
                {/* Hero Section */}
                <div className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 z-10">
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
                        <FadeIn delay={100}>
                            <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">HomeListingAI Blog</p>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                                Insights & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Updates</span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-10">
                                Expert advice, market trends, and tips to help you master real estate marketing with AI.
                            </p>
                        </FadeIn>
                        <FadeIn delay={200} className="flex justify-center">
                            <button
                                onClick={() => navigate('/signup')}
                                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-950 font-bold rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all text-lg"
                            >
                                <span className="material-symbols-outlined shrink-0 text-slate-900 text-xl">rocket_launch</span>
                                Start Free Trial
                            </button>
                        </FadeIn>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 relative z-10">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="animate-pulse bg-[#0B1121]/50 backdrop-blur-md rounded-2xl overflow-hidden border border-cyan-900/20 h-96">
                                    <div className="h-48 bg-slate-800/50"></div>
                                    <div className="p-6">
                                        <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
                                        <div className="h-6 bg-slate-800 rounded w-3/4 mb-2"></div>
                                        <div className="h-4 bg-slate-800 rounded w-full mb-4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : posts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map((post) => (
                                <FadeIn key={post.id} delay={100} className="h-full block">
                                    <article
                                        className="bg-[#0B1121]/80 backdrop-blur-md rounded-2xl overflow-hidden border border-cyan-900/30 shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] hover:border-cyan-500/50 transition-all duration-300 flex flex-col group cursor-pointer h-full"
                                        onClick={() => navigate(`/blog/${post.slug}`)}
                                    >
                                        <div className="h-48 overflow-hidden bg-slate-900 relative">
                                            {post.featured_image ? (
                                                <img
                                                    src={post.featured_image}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                                                    <span className="text-4xl font-light">Aa</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 flex flex-col flex-1">
                                            <div className="flex items-center text-xs text-cyan-500 mb-3 gap-3 font-medium uppercase tracking-wider">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {formatDate(post.published_at)}
                                                </span>
                                            </div>

                                            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                                                {post.title}
                                            </h2>

                                            <p className="text-slate-400 text-sm line-clamp-3 mb-6 flex-1 font-light leading-relaxed">
                                                {post.excerpt}
                                            </p>

                                            <div className="pt-4 border-t border-slate-800/60 mt-auto flex items-center text-cyan-400 font-semibold text-sm group-hover:translate-x-1 transition-transform origin-left w-fit uppercase tracking-wider">
                                                Read Article <ArrowRight size={16} className="ml-1" />
                                            </div>
                                        </div>
                                    </article>
                                </FadeIn>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-[#0B1121]/50 backdrop-blur-md rounded-3xl border border-slate-800">
                            <h3 className="text-2xl font-bold text-white mb-2">No articles published yet.</h3>
                            <p className="text-slate-400 font-light">Check back soon for the latest updates!</p>
                        </div>
                    )}
                </div>
            </main>

            <div className="mt-auto relative z-10 border-t border-slate-900/60">
                <PublicFooter />
            </div>
        </div>
    );
};

export default BlogIndex;
