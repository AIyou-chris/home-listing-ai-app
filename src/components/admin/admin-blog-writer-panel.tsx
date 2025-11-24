import React, { useState } from 'react'

import { useAdminBlog, BlogStatus } from '../../hooks/use-admin-blog'

const AdminBlogWriterPanel: React.FC = () => {
  const {
    posts,
    form,
    isEditing,
    updateForm,
    setStatus,
    startNewPost,
    startEditing,
    savePost,
    deletePost
  } = useAdminBlog()

  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()

    try {
      await savePost()
      setFeedback(isEditing ? 'Blog post updated successfully.' : 'Blog post created successfully.')
    } catch (error) {
      console.error('admin-blog-writer: failed to save post', error)
      setFeedback(error instanceof Error ? error.message : 'Unable to save blog post')
    }
  }

  const handleDelete = (postId: string) => {
    if (confirm('Delete this blog post?')) {
      deletePost(postId)
      setFeedback('Blog post deleted.')
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blog Writer</h1>
          <p className="text-slate-500 mt-1">Create and manage blog posts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              startNewPost()
              setFeedback(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition"
          >
            <span className="material-symbols-outlined w-5 h-5">add</span>
            Create New Post
          </button>
          {isEditing && (
            <span className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg bg-primary-100 text-primary-700">
              <span className="material-symbols-outlined w-4 h-4">edit</span>
              Editing existing post
            </span>
          )}
        </div>
      </header>

      {feedback && (
        <div className="mb-6 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          {feedback}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Blog Posts</h3>
          <span className="text-sm text-slate-500">{posts.length} post{posts.length === 1 ? '' : 's'}</span>
        </div>
        <div className="space-y-4">
          {posts.map(post => {
            const updatedLabel = new Date(post.updatedAt).toLocaleDateString()
            return (
              <div
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-700">{post.title.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-slate-900">{post.title}</h4>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          post.status === 'Published'
                            ? 'bg-emerald-100 text-emerald-700'
                            : post.status === 'Scheduled'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Updated {updatedLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      startEditing(post.id)
                      setFeedback(null)
                    }}
                    className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    <span className="material-symbols-outlined w-4 h-4">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    <span className="material-symbols-outlined w-4 h-4">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {posts.length === 0 && (
            <div className="text-center py-12 text-slate-500">No blog posts yet. Create the first one to get started.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
        </h3>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <input
              type="text"
              placeholder="Enter blog post title..."
              value={form.title}
              onChange={event => updateForm('title', event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
            <textarea
              rows={6}
              placeholder="Write your blog post content here..."
              value={form.content}
              onChange={event => updateForm('content', event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Image URL</label>
            <input
              type="url"
              placeholder="Enter image URL..."
              value={form.imageUrl}
              onChange={event => updateForm('imageUrl', event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Keywords</label>
            <input
              type="text"
              placeholder="Enter keywords separated by commas..."
              value={form.keywords}
              onChange={event => updateForm('keywords', event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
            <input
              type="text"
              placeholder="Enter tags separated by commas..."
              value={form.tagsText}
              onChange={event => updateForm('tagsText', event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">SEO Description</label>
            <textarea
              rows={3}
              placeholder="Enter SEO description..."
              value={form.seoDescription}
              onChange={event => updateForm('seoDescription', event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Publish Date</label>
            <input
              type="datetime-local"
              value={form.publishDate}
              onChange={event => updateForm('publishDate', event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={form.status}
              onChange={event => setStatus(event.target.value as BlogStatus)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Draft">Draft</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Published">Published</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
              Save Post
            </button>
            <button
              type="button"
              onClick={() => {
                startNewPost()
                setFeedback(null)
              }}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminBlogWriterPanel


