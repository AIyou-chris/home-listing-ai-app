import { supabase } from './supabase'
import { buildApiUrl } from '../lib/api'

const LISTING_UPLOAD_PATH = buildApiUrl('/api/listings/photo-upload')
const MAX_UPLOAD_ATTEMPTS = 4
const IMAGE_MIME_PREFIX = 'image/'

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

const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not decode image for upload optimization.'))
    }
    image.src = objectUrl
  })

const compressImageFile = async (
  file: File,
  options: { maxDimension: number; quality: number }
): Promise<File> => {
  const image = await loadImageFromFile(file)
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Invalid image dimensions.')
  }

  const scale = Math.min(1, options.maxDimension / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to prepare image canvas for upload.')
  ctx.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Failed to compress image.'))
          return
        }
        resolve(result)
      },
      'image/jpeg',
      options.quality
    )
  })

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'listing-photo'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

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
  const userId = await resolveUserId()
  const isImage = file.type.startsWith(IMAGE_MIME_PREFIX)

  const attemptFiles: File[] = [file]
  if (isImage) {
    const compressionPresets = [
      { maxDimension: 2800, quality: 0.88 },
      { maxDimension: 2100, quality: 0.8 },
      { maxDimension: 1600, quality: 0.7 }
    ]
    for (const preset of compressionPresets) {
      try {
        const compressed = await compressImageFile(file, preset)
        attemptFiles.push(compressed)
      } catch (error) {
        console.warn('[Listing Upload] Compression preset failed:', preset, error)
      }
    }
  }

  const finalAttempts = attemptFiles.slice(0, MAX_UPLOAD_ATTEMPTS)

  let lastError = 'HTTP error while uploading listing photo'
  for (let index = 0; index < finalAttempts.length; index += 1) {
    const candidate = finalAttempts[index]
    const dataUrl = await fileToDataUrl(candidate)
    const response = await fetch(LISTING_UPLOAD_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dataUrl, fileName: candidate.name || file.name, userId })
    })

    if (response.ok) {
      const data = await response.json()
      return data.url || data.path || ''
    }

    const payload = await response.json().catch(() => null)
    const message = payload?.error || 'HTTP error while uploading listing photo'
    lastError = message

    const sizeExceeded = message.toLowerCase().includes('maximum allowed size')
    const hasMoreAttempts = index < finalAttempts.length - 1
    if (!(sizeExceeded && hasMoreAttempts)) {
      break
    }
  }

  if (lastError.toLowerCase().includes('maximum allowed size')) {
    throw new Error('Photo is too large. Please use a smaller image (or lower resolution) and try again.')
  }
  throw new Error(lastError)
}
