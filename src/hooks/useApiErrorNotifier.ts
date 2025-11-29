import { useCallback } from 'react'
import { useToast } from '../context/ToastContext'

type ApiErrorNotification = {
  title: string
  error: unknown
  description?: string
}

const DEFAULT_DESCRIPTION = 'Please try again shortly. If the problem continues, contact support.'

export const useApiErrorNotifier = () => {
  const { showToast } = useToast()

  return useCallback(
    ({ title, error, description }: ApiErrorNotification) => {
      console.error(`[API] ${title}`, error)
      showToast({
        title,
        description: description ?? DEFAULT_DESCRIPTION,
        variant: 'error'
      })
    },
    [showToast]
  )
}

