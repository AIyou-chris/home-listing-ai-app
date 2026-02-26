import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Helmet } from 'react-helmet-async';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { BackgroundTechIcons } from '../../components/BackgroundTechIcons';
import { Calendar, ArrowLeft } from 'lucide-react';
import { FadeIn } from '../../components/FadeIn';

interface BlogPost {
    id: string;
    title: string;
    content: string;
    featured_image: string;
    published_at: string;
    seo_title: string;
    seo_description: string;
    seo_keywords: string[];
}

const BlogPost: React.FC = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) fetchPost(slug);
    }, [slug]);

    const fetchPost = async (slug: string) => {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (error || !data) {
            navigate('/blog');
        } else {
            setPost(data);
        }
        setLoading(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#02050D] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
    );
    if (!post) return null;

    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">
            <Helmet>
                <title>{post.seo_title || post.title} - HomeListingAI</title>
                <meta name="description" content={post.seo_description} />
                {post.seo_keywords && <meta name="keywords" content={post.seo_keywords.join(', ')} />}
            </Helmet>

            <PublicHeader />

            {/* Ambient Background Glows */}
            <BackgroundTechIcons />
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <main className="flex-grow pt-24 pb-16 relative z-10">
                <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <button onClick={() => navigate('/blog')} className="flex items-center text-slate-400 hover:text-cyan-400 mb-8 transition-colors font-medium">
                        <ArrowLeft size={20} className="mr-2" /> Back to Blog
                    </button>

                    <FadeIn delay={100}>
                        <header className="mb-10 text-center">
                            <div className="flex justify-center mb-4">
                                <span className="flex items-center text-sm text-cyan-400 bg-cyan-950/30 px-4 py-1.5 rounded-full shadow-sm border border-cyan-900/50 uppercase tracking-widest font-bold">
                                    <Calendar size={14} className="mr-2" />
                                    {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">{post.title}</h1>
                        </header>
                    </FadeIn>

                    {post.featured_image && (
                        <FadeIn delay={200}>
                            <div className="rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] mb-12 border border-cyan-900/30">
                                <img src={post.featured_image} alt={post.title} className="w-full h-auto max-h-[600px] object-cover" />
                            </div>
                        </FadeIn>
                    )}

                    <FadeIn delay={300}>
                        <div className="prose prose-lg prose-invert mx-auto bg-[#0B1121]/80 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-cyan-900/30">
                            <div dangerouslySetInnerHTML={{ __html: post.content }} />
                        </div>
                    </FadeIn>
                </article>
            </main>

            <div className="border-t border-slate-900/60 relative z-10">
                <PublicFooter />
            </div>
        </div>
    );
};

export default BlogPost;
