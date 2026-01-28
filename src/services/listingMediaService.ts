import { supabase } from './supabase'
import { buildApiUrl } from '../lib/api'

const LISTING_UPLOAD_PATH = buildApiUrl('/api/listings/photo-upload')

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read file as data URL'))
      }
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error('FileReader failed'))
    }
    reader.readAsDataURL(file)
  })

const resolveUserId = async () => {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id ?? null
  } catch (error) {
    console.warn('[Listing Upload] Failed to resolve user id:', error)
    return null
  }
}

export const uploadListingPhoto = async (file: File): Promise<string> => {
  const dataUrl = await fileToDataUrl(file)
  const userId = await resolveUserId()
  const response = await fetch(LISTING_UPLOAD_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dataUrl, fileName: file.name, userId })
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.error || 'HTTP error while uploading listing photo'
    throw new Error(message)
  }

  const data = await response.json()
  return data.url || data.path || ''
}
