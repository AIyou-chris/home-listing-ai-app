
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Helmet } from 'react-helmet-async';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { Calendar, ArrowLeft } from 'lucide-react';

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

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
    if (!post) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Helmet>
                <title>{post.seo_title || post.title} - HomeListingAI</title>
                <meta name="description" content={post.seo_description} />
                {post.seo_keywords && <meta name="keywords" content={post.seo_keywords.join(', ')} />}
            </Helmet>

            <PublicHeader />

            <main className="pt-24 pb-16">
                <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <button onClick={() => navigate('/blog')} className="flex items-center text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
                        <ArrowLeft size={20} className="mr-2" /> Back to Blog
                    </button>

                    <header className="mb-10 text-center">
                        <div className="flex justify-center mb-4">
                            <span className="flex items-center text-sm text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                                <Calendar size={14} className="mr-2" />
                                {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">{post.title}</h1>
                    </header>

                    {post.featured_image && (
                        <div className="rounded-2xl overflow-hidden shadow-lg mb-10">
                            <img src={post.featured_image} alt={post.title} className="w-full h-auto max-h-[600px] object-cover" />
                        </div>
                    )}

                    <div className="prose prose-lg prose-indigo mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    </div>
                </article>
            </main>

            <PublicFooter />
        </div>
    );
};

export default BlogPost;
