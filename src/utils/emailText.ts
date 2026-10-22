// Turns the message typed in the Quick Send box into an email that keeps its paragraphs and line breaks.
// (The server puts the message inside an HTML page, where plain new lines would be squashed into one line.)

const HAS_TAGS = /<\/?[a-z][\s\S]*?>/i;
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = (text: string) => text.replace(/(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/g, '<a href="$1">$1</a>');

export function messageToHtml(message: string): string {
  const source = String(message || '').replace(/\r\n/g, '\n').trim();
  if (!source) return '';
  const hasTags = HAS_TAGS.test(source);
  return source
    .split(/\n{2,}/)
    .map((paragraph) => {
      const safe = hasTags ? paragraph : linkify(escapeHtml(paragraph));
      return `<p>${safe.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

// The plain-text version for email programs that do not show HTML.
export function messageToText(message: string): string {
  return String(message || '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
