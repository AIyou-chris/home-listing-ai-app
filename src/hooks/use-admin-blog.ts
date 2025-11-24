import { useCallback, useEffect, useMemo, useState } from 'react'

export type BlogStatus = 'Draft' | 'Scheduled' | 'Published'

export interface AdminBlogPost {
  id: string
  title: string
  content: string
  imageUrl: string
  keywords: string
  tags: string[]
  seoDescription: string
  status: BlogStatus
  publishDate?: string
  createdAt: string
  updatedAt: string
}

interface BlogFormState {
  id?: string
  title: string
  content: string
  imageUrl: string
  keywords: string
  tagsText: string
  seoDescription: string
  status: BlogStatus
  publishDate: string
  createdAt?: string
}

interface UseAdminBlogResult {
  posts: AdminBlogPost[]
  form: BlogFormState
  isEditing: boolean
  updateForm: (field: keyof BlogFormState, value: string) => void
  setStatus: (status: BlogStatus) => void
  startNewPost: () => void
  startEditing: (postId: string) => void
  savePost: () => Promise<AdminBlogPost>
  deletePost: (postId: string) => void
}

const BLOG_STORAGE_KEY = 'adminBlogPosts'

const DEFAULT_POSTS: AdminBlogPost[] = [
  {
    id: 'blog-1',
    title: 'Blog Post 1',
    content: 'Draft blog content',
    imageUrl: '',
    keywords: '',
    tags: [],
    seoDescription: '',
    status: 'Draft',
    createdAt: '2024-01-10T12:00:00.000Z',
    updatedAt: '2024-01-10T12:00:00.000Z'
  },
  {
    id: 'blog-2',
    title: 'Blog Post 2',
    content: 'Published blog content',
    imageUrl: '',
    keywords: '',
    tags: [],
    seoDescription: '',
    status: 'Published',
    createdAt: '2024-01-05T12:00:00.000Z',
    updatedAt: '2024-01-05T12:00:00.000Z'
  },
  {
    id: 'blog-3',
    title: 'Blog Post 3',
    content: 'Scheduled blog content',
    imageUrl: '',
    keywords: '',
    tags: [],
    seoDescription: '',
    status: 'Scheduled',
    publishDate: '2024-02-01T12:00:00.000Z',
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z'
  }
]

const INITIAL_FORM: BlogFormState = {
  title: '',
  content: '',
  imageUrl: '',
  keywords: '',
  tagsText: '',
  seoDescription: '',
  status: 'Draft',
  publishDate: ''
}

const isBrowser = () => typeof window !== 'undefined'

const readPostsFromStorage = (): AdminBlogPost[] => {
  if (!isBrowser()) {
    return DEFAULT_POSTS
  }

  try {
    const saved = window.localStorage.getItem(BLOG_STORAGE_KEY)
    if (!saved) {
      return DEFAULT_POSTS
    }

    const parsed = JSON.parse(saved) as unknown
    if (Array.isArray(parsed)) {
      return parsed as AdminBlogPost[]
    }

    return DEFAULT_POSTS
  } catch (error) {
    console.error('useAdminBlog: failed to parse stored posts', error)
    return DEFAULT_POSTS
  }
}

const persistPostsToStorage = (posts: AdminBlogPost[]) => {
  if (!isBrowser()) {
    return
  }

  try {
    window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts))
  } catch (error) {
    console.error('useAdminBlog: failed to persist posts', error)
  }
}

const parseTags = (tagsText: string) =>
  tagsText
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)

export const useAdminBlog = (): UseAdminBlogResult => {
  const [posts, setPosts] = useState<AdminBlogPost[]>(() => readPostsFromStorage())
  const [form, setForm] = useState<BlogFormState>(INITIAL_FORM)

  useEffect(() => {
    persistPostsToStorage(posts)
  }, [posts])

  const updateForm = useCallback((field: keyof BlogFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const setStatus = useCallback((status: BlogStatus) => {
    setForm(prev => ({ ...prev, status }))
  }, [])

  const startNewPost = useCallback(() => {
    setForm(INITIAL_FORM)
  }, [])

  const startEditing = useCallback(
    (postId: string) => {
      const target = posts.find(post => post.id === postId)
      if (!target) {
        return
      }

      setForm({
        id: target.id,
        title: target.title,
        content: target.content,
        imageUrl: target.imageUrl,
        keywords: target.keywords,
        tagsText: target.tags.join(', '),
        seoDescription: target.seoDescription,
        status: target.status,
        publishDate: target.publishDate ?? '',
        createdAt: target.createdAt
      })
    },
    [posts]
  )

  const savePost = useCallback(async () => {
    const trimmedTitle = form.title.trim()
    if (!trimmedTitle) {
      throw new Error('Title is required')
    }

    const now = new Date().toISOString()
    const tags = parseTags(form.tagsText)

    if (form.id) {
      const createdAt = form.createdAt ?? now
      const updated: AdminBlogPost = {
        id: form.id,
        title: trimmedTitle,
        content: form.content,
        imageUrl: form.imageUrl,
        keywords: form.keywords,
        tags,
        seoDescription: form.seoDescription,
        status: form.status,
        publishDate: form.publishDate || undefined,
        createdAt,
        updatedAt: now
      }

      setPosts(prev => prev.map(post => (post.id === updated.id ? updated : post)))
      setForm(INITIAL_FORM)
      return updated
    }

    const created: AdminBlogPost = {
      id: Date.now().toString(),
      title: trimmedTitle,
      content: form.content,
      imageUrl: form.imageUrl,
      keywords: form.keywords,
      tags,
      seoDescription: form.seoDescription,
      status: form.status,
      publishDate: form.publishDate || undefined,
      createdAt: now,
      updatedAt: now
    }

    setPosts(prev => [created, ...prev])
    setForm(INITIAL_FORM)
    return created
  }, [form])

  const deletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId))

    setForm(prev => {
      if (prev.id === postId) {
        return INITIAL_FORM
      }
      return prev
    })
  }, [])

  const sortedPosts = useMemo(
    () => posts.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [posts]
  )

  return {
    posts: sortedPosts,
    form,
    isEditing: Boolean(form.id),
    updateForm,
    setStatus,
    startNewPost,
    startEditing,
    savePost,
    deletePost
  }
}

export type { BlogFormState }


