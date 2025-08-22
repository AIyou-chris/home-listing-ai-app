import React, { useState, useEffect } from 'react';
import { BlogPost } from '../types';

const BlogPostPage: React.FC = () => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const slug = window.location.hash.split('/').pop();
    if (slug) {
      fetchPost(slug);
    }
  }, []);

  const fetchPost = async (slug: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/home-listing-ai/us-central1/api/blog/${slug}`);
      
      if (!response.ok) {
        throw new Error('Blog post not found');
      }
      
      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      setError('Blog post not found');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl font-bold text-slate-900 mb-6">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-bold text-slate-900 mb-4 mt-8">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-bold text-slate-900 mb-3 mt-6">{line.substring(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="text-slate-700 mb-2">{line.substring(2)}</li>;
        }
        if (line.startsWith('1. ')) {
          return <li key={index} className="text-slate-700 mb-2">{line.substring(3)}</li>;
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        if (line.includes('**') && line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={index} className="text-slate-700 mb-4">
              {parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
          );
        }
        if (line.startsWith('*') && line.endsWith('*')) {
          return <p key={index} className="text-slate-600 italic mb-4">{line.substring(1, line.length - 1)}</p>;
        }
        return <p key={index} className="text-slate-700 mb-4">{line}</p>;
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-600 text-2xl">error</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Article Not Found</h3>
          <p className="text-slate-500 mb-6">The article you're looking for doesn't exist.</p>
          <button
            onClick={() => window.location.hash = 'blog'}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  // Generate structured data for AIO optimization
  const generateStructuredData = () => {
    if (!post) return null;
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": post.structuredData?.type || "Article",
      "headline": post.structuredData?.headline || post.title,
      "description": post.structuredData?.description || post.excerpt,
      "image": post.imageUrl,
      "author": {
        "@type": "Person",
        "name": post.structuredData?.author || post.author
      },
      "publisher": {
        "@type": "Organization",
        "name": post.structuredData?.publisher || "HomeListingAI",
        "logo": {
          "@type": "ImageObject",
          "url": "https://homelistingai.com/logo.png"
        }
      },
      "datePublished": post.structuredData?.datePublished || post.publishedAt,
      "dateModified": post.structuredData?.dateModified || post.publishedAt,
      "wordCount": post.structuredData?.wordCount,
      "timeRequired": post.structuredData?.readingTime || post.readTime,
      "articleSection": post.structuredData?.categories || post.tags,
      "keywords": post.structuredData?.keywords || post.semanticKeywords || post.tags,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${window.location.origin}/#blog-post/${post.slug}`
      }
    };
    
    return JSON.stringify(structuredData);
  };

  // Add meta tags for AIO optimization
  const addMetaTags = () => {
    if (!post) return;
    
    // Remove existing meta tags
    const existingMeta = document.querySelectorAll('meta[data-blog-meta]');
    existingMeta.forEach(tag => tag.remove());
    
    const head = document.head;
    
    // Basic meta tags
    const metaTags = [
      { name: 'description', content: post.metaDescription || post.excerpt },
      { name: 'keywords', content: post.semanticKeywords?.join(', ') || post.tags.join(', ') },
      { name: 'author', content: post.author },
      
      // Open Graph
      { property: 'og:title', content: post.socialMeta?.ogTitle || post.title },
      { property: 'og:description', content: post.socialMeta?.ogDescription || post.excerpt },
      { property: 'og:image', content: post.socialMeta?.ogImage || post.imageUrl },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: `${window.location.origin}/#blog-post/${post.slug}` },
      
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: post.socialMeta?.twitterTitle || post.title },
      { name: 'twitter:description', content: post.socialMeta?.twitterDescription || post.excerpt },
      { name: 'twitter:image', content: post.socialMeta?.twitterImage || post.imageUrl },
      
      // LinkedIn
      { property: 'linkedin:title', content: post.socialMeta?.linkedinTitle || post.title },
      { property: 'linkedin:description', content: post.socialMeta?.linkedinDescription || post.excerpt },
      
      // AIO specific
      { name: 'article:published_time', content: post.publishedAt },
      { name: 'article:author', content: post.author },
      { name: 'article:section', content: post.tags[0] },
      { name: 'article:tag', content: post.tags.join(', ') }
    ];
    
    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      if (tag.name) meta.setAttribute('name', tag.name);
      if (tag.property) meta.setAttribute('property', tag.property);
      meta.setAttribute('content', tag.content);
      meta.setAttribute('data-blog-meta', 'true');
      head.appendChild(meta);
    });
    
    // Add structured data
    const structuredDataScript = document.createElement('script');
    structuredDataScript.type = 'application/ld+json';
    structuredDataScript.textContent = generateStructuredData();
    structuredDataScript.setAttribute('data-blog-meta', 'true');
    head.appendChild(structuredDataScript);
    
    // Update page title
    document.title = `${post.title} - HomeListingAI Blog`;
  };

  useEffect(() => {
    if (post) {
      addMetaTags();
    }
    
    // Cleanup on unmount
    return () => {
      const existingMeta = document.querySelectorAll('meta[data-blog-meta]');
      existingMeta.forEach(tag => tag.remove());
      const existingScript = document.querySelectorAll('script[data-blog-meta]');
      existingScript.forEach(script => script.remove());
      document.title = 'HomeListingAI';
    };
  }, [post]);

  const handleShare = async (platform: 'copy' | 'twitter' | 'linkedin' | 'facebook') => {
    if (!post) return;
    
    const url = `${window.location.origin}/#blog-post/${post.slug}`;
    
    switch (platform) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          // You could add a toast notification here
          console.log('URL copied to clipboard');
        } catch (err) {
          console.error('Failed to copy URL:', err);
        }
        break;
      case 'twitter':
        const twitterText = post.socialMeta?.twitterTitle || post.title;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => window.location.hash = 'blog'}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
          >
            <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
            Back to Blog
          </button>
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm font-semibold bg-primary-100 text-primary-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">{post.title}</h1>
            <p className="text-xl text-slate-600 mb-6">{post.excerpt}</p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>By {post.author}</span>
              <span>•</span>
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{post.readTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.imageUrl && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-96 object-cover rounded-xl shadow-lg"
          />
        </div>
      )}

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="prose prose-lg max-w-none">
            {renderMarkdown(post.content)}
          </div>
          
          {/* AIO Score Display */}
          {post.aioScore && (
            <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">AIO Optimization Score</h4>
                  <p className="text-xs text-slate-600">Optimized for AI search engines and discovery</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{post.aioScore}/100</div>
                  <div className="text-xs text-slate-500">Excellent</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${post.aioScore}%` }}
                  ></div>
                </div>
              </div>
              {post.semanticKeywords && (
                <div className="mt-3">
                  <p className="text-xs text-slate-600 mb-2">Semantic Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {post.semanticKeywords.slice(0, 4).map((keyword, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-white text-slate-700 rounded-full border">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Article Footer */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex flex-col gap-6">
              {/* Social Sharing */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Share this article:</h4>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => handleShare('twitter')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
                  >
                    <span className="material-symbols-outlined w-4 h-4">share</span>
                    Twitter
                  </button>
                  <button 
                    onClick={() => handleShare('linkedin')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-medium"
                  >
                    <span className="material-symbols-outlined w-4 h-4">business</span>
                    LinkedIn
                  </button>
                  <button 
                    onClick={() => handleShare('facebook')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    <span className="material-symbols-outlined w-4 h-4">group</span>
                    Facebook
                  </button>
                  <button 
                    onClick={() => handleShare('copy')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition font-medium"
                  >
                    <span className="material-symbols-outlined w-4 h-4">content_copy</span>
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Article Metadata for AIO */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Article Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Word Count:</span>
                    <span className="ml-1 font-medium">{post.structuredData?.wordCount || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reading Time:</span>
                    <span className="ml-1 font-medium">{post.readTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Published:</span>
                    <span className="ml-1 font-medium">{new Date(post.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span>
                    <span className="ml-1 font-medium">{post.tags[0]}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => window.location.hash = 'blog'}
                  className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                >
                  Back to Blog
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogPostPage;
