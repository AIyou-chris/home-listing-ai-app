// A cell that starts with = + - @ runs as a formula when opened in Excel or Sheets. Buyers type
// their own names and messages, so prefix those cells with an apostrophe to keep them as text.
// Plain phone numbers ("+1 (512) 555-0001") are left alone so they stay readable.
const PHONE_LIKE = /^[+-]?[\d\s().-]+$/

export const csvCell = (val: unknown): string => {
  let s = String(val ?? '')
  if (/^[=+\-@\t\r]/.test(s) && !PHONE_LIKE.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}
