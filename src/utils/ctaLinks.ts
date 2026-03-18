import type { NavigateFunction } from 'react-router-dom'

const SAMPLE_REPORT_URL = '/sample-property-report.pdf'
const LIVE_EXAMPLE_URL = '/demo-live/demo-124-oak-street-austin'

let homepageCtaHealthChecked = false

const warnDev = (message: string, details?: unknown) => {
  if (import.meta.env.DEV) {
    console.warn(`[cta-links] ${message}`, details)
  }
}

export const getSampleReportUrl = () => SAMPLE_REPORT_URL

export const getLiveExampleUrl = () => LIVE_EXAMPLE_URL

export const openInNewTab = (url: string): boolean => {
  if (!url) {
    warnDev('Missing URL passed to openInNewTab')
    return false
  }

  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (openedWindow) return true

  warnDev('window.open returned null, falling back to same-tab navigation', { url })
  window.location.assign(url)
  return false
}

export const safeNavigate = (navigate: NavigateFunction, url: string): boolean => {
  if (!url) {
    warnDev('Missing URL passed to safeNavigate')
    return false
  }

  try {
    navigate(url)
    return true
  } catch (error) {
    warnDev('Navigation failed, falling back to window.location.assign', { url, error })
    window.location.assign(url)
    return false
  }
}

export const verifyHomepageCtaTargetsOnce = () => {
  if (!import.meta.env.DEV || homepageCtaHealthChecked) return
  homepageCtaHealthChecked = true

  const sampleReportUrl = getSampleReportUrl()
  const liveExampleUrl = getLiveExampleUrl()

  void fetch(sampleReportUrl, { method: 'HEAD' })
    .then((response) => {
      if (!response.ok) {
        warnDev('Sample report URL returned a non-200 response', { url: sampleReportUrl, status: response.status })
      }
    })
    .catch((error) => {
      warnDev('Sample report URL could not be reached', { url: sampleReportUrl, error })
    })

  void fetch(liveExampleUrl, { method: 'GET', headers: { Accept: 'text/html' } })
    .then((response) => {
      if (!response.ok) {
        warnDev('Live example route returned a non-200 response', { url: liveExampleUrl, status: response.status })
      }
    })
    .catch((error) => {
      warnDev('Live example route could not be reached', { url: liveExampleUrl, error })
    })
}
