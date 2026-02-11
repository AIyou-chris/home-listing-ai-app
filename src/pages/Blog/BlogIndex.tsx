
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { PublicFooter } from '../../components/layout/PublicFooter';

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
        <div className="min-h-screen bg-slate-50 font-sans">
            <Helmet>
                <title>Blog - HomeListingAI | Real Estate Tips & Market Insights</title>
                <meta name="description" content="Stay updated with the latest real estate marketing trends, AI tools for agents, and property listing tips from HomeListingAI." />
            </Helmet>

            <PublicHeader />

            <main className="pt-20">
                {/* Hero Section */}
                <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white"></div>

                    {/* Background Elements from Landing Page */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Floating geometric shapes */}
                        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-10 animate-float-slow"></div>
                        <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-8 animate-float"></div>
                        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-6 animate-float-slower"></div>

                        {/* Floating icons */}
                        <div className="absolute top-60 right-1/3 opacity-5 animate-float">
                            <span className="material-symbols-outlined text-4xl text-blue-500">article</span>
                        </div>
                        <div className="absolute bottom-40 left-1/3 opacity-5 animate-float-slow">
                            <span className="material-symbols-outlined text-3xl text-green-500">lightbulb</span>
                        </div>

                        {/* Dots pattern */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-3">
                            <div className="grid grid-cols-20 gap-4 w-full h-full">
                                {Array.from({ length: 50 }).map((_, i) => (
                                    <div key={i} className="w-1 h-1 bg-blue-300 rounded-full animate-pulse"
                                        style={{
                                            animationDelay: `${i * 0.2}s`,
                                            animationDuration: `${2 + Math.random() * 2}s`
                                        }}></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 animate-fade-in-up">
                            Insights & <span className="text-primary-600 gradient-text">Updates</span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 animate-fade-in-up animation-delay-200">
                            Expert advice, market trends, and tips to help you master real estate marketing with AI.
                        </p>

                        <div className="flex justify-center animate-fade-in-up animation-delay-400">
                            <button
                                onClick={() => navigate('/signup')}
                                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all text-lg transform hover:scale-105 btn-animate"
                            >
                                <span className="material-symbols-outlined animate-pulse">rocket_launch</span>
                                Start Free Trial
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="animate-pulse bg-white rounded-xl overflow-hidden border border-slate-200 h-96">
                                    <div className="h-48 bg-slate-200"></div>
                                    <div className="p-6">
                                        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
                                        <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : posts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map((post) => (
                                <article
                                    key={post.id}
                                    className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group cursor-pointer"
                                    onClick={() => navigate(`/blog/${post.slug}`)}
                                >
                                    <div className="h-48 overflow-hidden bg-slate-100 relative">
                                        {post.featured_image ? (
                                            <img
                                                src={post.featured_image}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                                                <span className="text-4xl font-light">Aa</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="flex items-center text-xs text-slate-500 mb-3 gap-3">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {formatDate(post.published_at)}
                                            </span>
                                        </div>

                                        <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {post.title}
                                        </h2>

                                        <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-1">
                                            {post.excerpt}
                                        </p>

                                        <div className="pt-4 border-t border-slate-100 mt-auto flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform origin-left w-fit">
                                            Read Article <ArrowRight size={16} className="ml-1" />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <h3 className="text-xl font-medium text-slate-900">No articles published yet.</h3>
                            <p className="text-slate-500 mt-2">Check back soon for the latest updates!</p>
                        </div>
                    )}
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};

export default BlogIndex;
