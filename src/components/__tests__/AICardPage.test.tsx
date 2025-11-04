import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AICardPage from '../AICardPage'

jest.mock('../../services/aiCardService', () => {
  const defaultProfile = {
    id: 'default',
    fullName: '',
    professionalTitle: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    bio: '',
    brandColor: '#0ea5e9',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: ''
    },
    headshot: null,
    logo: null
  }

  return {
    getAICardProfile: jest.fn().mockResolvedValue(defaultProfile),
    updateAICardProfile: jest
      .fn()
      .mockImplementation(async (payload: Record<string, unknown>) => ({
        ...defaultProfile,
        ...payload
      })),
    generateQRCode: jest.fn(),
    shareAICard: jest.fn(),
    downloadAICard: jest.fn(),
    uploadAiCardAsset: jest.fn()
  }
})

jest.mock('../../services/linkShortenerService', () => ({
  createShortLink: jest.fn().mockResolvedValue({ shortUrl: 'https://demo.short/abc123' })
}))

jest.mock('../../services/agentProfileService', () => ({
  notifyProfileChange: jest.fn()
}))

jest.mock('../../services/openaiService', () => ({
  continueConversation: jest.fn().mockResolvedValue('Mock response')
}))

const { getAICardProfile, updateAICardProfile } = jest.requireMock('../../services/aiCardService')
const { notifyProfileChange } = jest.requireMock('../../services/agentProfileService')

const renderCardPage = async () => {
  await act(async () => {
    render(<AICardPage />)
  })
}

describe('AICardPage input reliability', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('keeps typed values after auto-save completes', async () => {
    await renderCardPage()

    const nameInput = await screen.findByLabelText(/Full Name/i)

    fireEvent.change(nameInput, { target: { value: 'Jane Agent' } })
    expect(nameInput).toHaveValue('Jane Agent')

    await act(async () => {
      jest.advanceTimersByTime(600)
    })

    expect(updateAICardProfile).not.toHaveBeenCalled()
    expect(nameInput).toHaveValue('Jane Agent')
  })

  it('preserves user-entered spacing even if the server normalizes the value', async () => {
    (getAICardProfile as jest.Mock).mockResolvedValueOnce({
      id: 'default',
      fullName: '',
      professionalTitle: '',
      company: '',
      phone: '',
      email: '',
      website: '',
      bio: '',
      brandColor: '#0ea5e9',
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        youtube: ''
      },
      headshot: null,
      logo: null
    })

    ;(updateAICardProfile as jest.Mock).mockImplementationOnce(async () => ({
      id: 'default',
      fullName: 'Trimmed Value',
      professionalTitle: '',
      company: '',
      phone: '',
      email: '',
      website: '',
      bio: '',
      brandColor: '#0ea5e9',
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        youtube: ''
      },
      headshot: null,
      logo: null
    }))

    await renderCardPage()

    const nameInput = await screen.findByLabelText(/Full Name/i)
    fireEvent.change(nameInput, { target: { value: 'Trimmed Value   ' } })

    await act(async () => {
      jest.advanceTimersByTime(600)
    })

    expect(updateAICardProfile).not.toHaveBeenCalled()
    expect((nameInput as HTMLInputElement).value).toBe('Trimmed Value   ')
  })

  it('allows continued typing after debounced save', async () => {
    await renderCardPage()

    const bioTextarea = await screen.findByPlaceholderText(
      'Tell visitors about your experience and expertise...'
    )

    fireEvent.change(bioTextarea, { target: { value: 'Seasoned agent with 15 years of experience.' } })

    await act(async () => {
      jest.advanceTimersByTime(600)
    })

    expect(updateAICardProfile).not.toHaveBeenCalled()
    expect(bioTextarea).toHaveValue('Seasoned agent with 15 years of experience.')

    fireEvent.change(bioTextarea, {
      target: { value: 'Seasoned agent with 15 years of experience. Ready for more.' }
    })

    expect(bioTextarea).toHaveValue(
      'Seasoned agent with 15 years of experience. Ready for more.'
    )
  })

  it('notifies profile changes only after successful sync', async () => {
    await renderCardPage()

    const nameInput = await screen.findByLabelText(/Full Name/i)
    fireEvent.change(nameInput, { target: { value: 'Broadcast Agent' } })

    await act(async () => {
      jest.advanceTimersByTime(600)
    })

    expect(updateAICardProfile).not.toHaveBeenCalled()
    expect(notifyProfileChange).not.toHaveBeenCalled()
  })

  it('persists changes when Save Changes is clicked', async () => {
    await renderCardPage()

    const nameInput = await screen.findByLabelText(/Full Name/i)
    fireEvent.change(nameInput, { target: { value: 'Manual Save Agent' } })

    const saveButton = screen.getByRole('button', { name: /save changes/i })

    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => expect(updateAICardProfile).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(notifyProfileChange).toHaveBeenCalledTimes(1))
  })
})


