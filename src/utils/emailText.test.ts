import { messageToHtml, messageToText } from './emailText';

describe('Quick Send message to email', () => {
  it('keeps paragraphs and line breaks, and turns links into links', () => {
    const html = messageToHtml('Hi Ross,\n\nSee it here:\nhttps://homelistingai.com/partner-invite/demo\n\nChris');
    expect(html).toBe('<p>Hi Ross,</p>\n<p>See it here:<br><a href="https://homelistingai.com/partner-invite/demo">https://homelistingai.com/partner-invite/demo</a></p>\n<p>Chris</p>');
  });

  it('does not let typed angle brackets become HTML in a plain message', () => {
    expect(messageToHtml('a <script>x</script> b')).toContain('<p>');
  });

  it('keeps a message that is already HTML (like a signature) as it is', () => {
    const html = messageToHtml('Hello\n\nBest regards,<br/><strong>Chris</strong>');
    expect(html).toContain('<strong>Chris</strong>');
    expect(html).not.toContain('&lt;');
  });

  it('leaves the trailing dot or bracket of a link outside the link', () => {
    expect(messageToHtml('Visit https://homelistingai.com/lo-signup.')).toContain('<a href="https://homelistingai.com/lo-signup">https://homelistingai.com/lo-signup</a>.');
  });

  it('makes a readable plain-text copy', () => {
    expect(messageToText('<p>Hi Ross,</p>\n<p>See it<br>here</p>')).toBe('Hi Ross,\n\nSee it\nhere');
    expect(messageToText('Plain & simple\n\n\n\nbye')).toBe('Plain & simple\n\nbye');
  });

  it('handles an empty message', () => {
    expect(messageToHtml('')).toBe('');
    expect(messageToText('')).toBe('');
  });
});
