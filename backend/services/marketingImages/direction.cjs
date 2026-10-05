'use strict';
// Adapted from An AI You's hero-image-prompt.cjs; one direction builder,
// separate palettes. HLAI values come from tailwind.config.js/defaultTheme.
const BRANDS = {
  // Snapshot of primary.950 / primary.500 / indigo.950 / amber.500 and font.sans.
  // A regression test compares these with Tailwind, without loading its ESM
  // config into the production CommonJS backend or adding dev dependencies.
  homelistingai: { name: 'HomeListingAI', blue: '#172554', light: '#3b82f6', violet: '#1e1b4b', amber: '#f59e0b', font: 'Inter' },
  // An AI You MarketingShell.tsx: --mk-ink, --mk-blue, --mk-red.
  anaiyou: { name: 'An AI You', blue: '#07143b', light: '#1541a3', violet: '#07143b', amber: '#ff3a1f', font: 'Space Grotesk' }
};
const FORBIDDEN = ['robots', 'glowing brains', 'circuit boards', 'holograms', 'neon cyberpunk', 'floating UI panels', 'humanoid AI faces', 'handshake over a globe', 'fake charts', 'dollar signs', 'stock-photo smiles', 'clip-art houses'];
const BRAND_DIRECTION = 'Premium editorial photography, real working adults in real settings, candid moments, natural textures, subtle film color, natural light and shallow depth of field. One idea, one focal subject, rule of thirds, calm empty space covering forty percent of the image. No identifiable real people or celebrities. No robots, glowing brains, circuit boards, holograms, neon cyberpunk, floating UI panels, humanoid AI faces, handshake over a globe, fake charts, dollar signs, stock-photo smiles or clip-art houses. No readable text, logos, numbers, rates, badges, watermarks or readable screens. No specific real addresses, brokerage signs or competitor branding. No housing preference or exclusion, approval claims, guarantees, fake testimonials, customer photographs or before-and-after results. Show diverse adults naturally, with no suggestion about who belongs in a home. The background only: all headlines, logos and official lending marks are added afterward.';
function brandFor(brand = 'homelistingai') { if (!BRANDS[brand]) throw new Error('Choose a supported brand.'); return BRANDS[brand]; }
function safeDirection(value) {
  const text = String(value || '').trim().slice(0, 1600);
  // Negative clauses are allowed; positive requests for banned visual content are not.
  const positive = text.split(/[.!;\n]|\b(?:but|except|instead|however|yet|then)\b/i).filter(s => !/^\s*(no\b|never\b|without\b|avoid\b|do not\b)/i.test(s)).join(' ');
  const banned=FORBIDDEN.map(s=>s.replace(/s$/,'s?')).join('|');
  if (new RegExp(`\\b(${banned}|logos?|watermarks?|rates?|payment amounts?|guaranteed|Zillow|Redfin|Rocket|readable text|add (?:text|words)|write|spell|numbers|digits|letters|words)\\b`, 'i').test(positive)) throw new Error('Describe a real scene without words, logos, rates or AI effects. We add your headline afterward.');
  return text;
}
function heroImagePrompt(askedFor, written, brand = 'homelistingai') {
  const b = brandFor(brand);
  const body = safeDirection(askedFor || written);
  return `${body}\n\n${BRAND_DIRECTION} Use deep blue ${b.blue}, blue ${b.light}, indigo ${b.violet} shadows and warm amber ${b.amber} light as subtle environmental tones.`;
}
module.exports = { BRANDS, FORBIDDEN, BRAND_DIRECTION, brandFor, safeDirection, heroImagePrompt };
