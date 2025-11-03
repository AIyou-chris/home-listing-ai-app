import { renderHook, act } from '@testing-library/react'

import { useAdminBlog } from '../use-admin-blog'

describe('useAdminBlog', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates a new blog post and resets the form', async () => {
    const { result } = renderHook(() => useAdminBlog())

    act(() => {
      result.current.updateForm('title', 'New Post')
      result.current.updateForm('content', 'This is the body of the post.')
      result.current.updateForm('imageUrl', 'https://example.com/image.png')
      result.current.updateForm('keywords', 'real estate, market')
      result.current.updateForm('tagsText', 'market, trends')
      result.current.updateForm('seoDescription', 'A quick market update')
      result.current.setStatus('Published')
    })

    await act(async () => {
      await result.current.savePost()
    })

    expect(result.current.posts[0].title).toBe('New Post')
    expect(result.current.posts[0].tags).toEqual(['market', 'trends'])
    expect(result.current.form.title).toBe('')
  })

  it('prefills the form when editing a post', () => {
    const { result } = renderHook(() => useAdminBlog())
    const existing = result.current.posts[0]

    act(() => {
      result.current.startEditing(existing.id)
    })

    expect(result.current.isEditing).toBe(true)
    expect(result.current.form.title).toBe(existing.title)
    expect(result.current.form.tagsText).toBe(existing.tags.join(', '))
  })
})


