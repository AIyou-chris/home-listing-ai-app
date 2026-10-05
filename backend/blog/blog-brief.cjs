// Adapted from ai-landing-template/server/lib/marketing/blog-brief.cjs.
/**
 * What makes a blog post worth publishing, in one place.
 *
 * Both studios generate a blog article -- the staff one in
 * server/routes/marketing.cjs, the customer one in
 * server/routes/customer-marketing.cjs -- and before this file they each
 * carried their own two-line description of what an article should be. The
 * result read like an advertisement: three hundred words, a heading that said
 * "Introduction", and the product's name in the first sentence. Nobody
 * finishes that, and nothing that nobody finishes ranks.
 *
 * These rules are the standard both prompts now quote, so an improvement to
 * one is an improvement to both and the two cannot drift apart again.
 *
 * `productName` is whose product may be mentioned -- AI You on the staff side,
 * the customer's own business on theirs. The rule is the same either way: the
 * article earns the mention, it does not open with it.
 */

/** Words that make a paragraph sound like it was written by a machine. */
const BANNED_PHRASES = [
  'in today\'s fast-paced world', 'in today\'s digital age', 'game-changer',
  'game changing', 'revolutionary', 'unlock the power', 'leverage', 'seamless',
  'seamlessly', 'elevate your', 'take it to the next level', 'delve into',
  'in conclusion', 'look no further', 'the bottom line is', 'that\'s where',
  'imagine a world', 'buckle up', 'let\'s dive in'
];

/**
 * The editorial standard, as prompt lines.
 *
 * Deliberately specific and countable -- "write a good long article" produces
 * six hundred words every time, "1,100 to 1,600 words across 5 to 8 sections"
 * produces an article. Every number here is a floor the model can be held to,
 * not a style note it can interpret away.
 */
function blogRules({ productName = 'HomeListingAI', role = 'spoke' } = {}) {
  return [
    'HOW TO WRITE THE BLOG ARTICLE (content). These rules are not optional.',
    '',
    `Length: ${role === 'hub' ? '2,500 to 4,000' : '1,100 to 1,800'} words of real body copy.`,
    '',
    'Opening: the first 120 words describe the reader\'s own situation, concretely, on a specific',
    `day, in specific words they would use themselves. Do not name ${productName} in the opening.`,
    'Do not define the category, do not describe the state of the industry, and do not open with a',
    'statistic. Open the way one owner starts telling another owner what happened to them.',
    '',
    'Shape: 5 to 8 <h2> sections, one idea each. Write each heading as a phrase a person would',
    'actually type into a search box or say out loud -- never "Introduction", "Overview",',
    '"Conclusion", "Final Thoughts" or "Key Takeaways". Use <h3> only for steps inside a section.',
    'Paragraphs are one to three sentences. Use a list only where the content is genuinely a list.',
    '',
    'Substance: at least two sections must teach the reader how to fix the problem themselves,',
    'with the actual steps, the actual words to say, or the actual checklist -- useful to somebody',
    'who never buys anything. An article that only describes a problem and then sells is an',
    'advertisement, and that is the thing to avoid. Be concrete: name the situation (the call that',
    'comes in at 6:40pm while you are under a sink), not the abstraction (customer engagement).',
    '',
    `Selling: mention ${productName} at most twice, never in the first half, and only after the`,
    'reader has already been given something they can use. Include the planned contextual internal links.',
    'No pressure, no urgency, no "limited time". The last paragraph is one calm sentence.',
    '',
    'FAQ: return 3 to 5 questions separately in the faq JSON array, not inside body HTML.',
    'Each question should be phrased the way somebody types it into Google, each answered',
    'in its answer field in 2 to 4 plain sentences. Answer the question in the first sentence.',
    '',
    'Voice: second person, short sentences, plain words. Write like an experienced operator talking',
    'to another owner, not like a brochure. No exclamation marks. No rhetorical questions stacked',
    'together. Never use these phrases: ' + BANNED_PHRASES.join(', ') + '.',
    '',
    'Honesty: never invent a statistic, a customer, a quote, a review, a result, or a number. If a',
    'number is not in the approved facts above, write the sentence without a number.',
    '',
    'HTML: use only <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote> and <br>.',
    'No inline styles, no classes, no images, no tables. Do not repeat the title as a heading --',
    'the page already prints it above the body.'
  ];
}

/**
 * The search-listing fields, as prompt lines. Kept beside the article rules
 * because they are written from the same draft and are worthless if they
 * disagree with it.
 */
function blogSeoRules() {
  return [
    'SEARCH LISTING:',
    'title: 55 characters or fewer where possible, specific, no brand name, no colon-stuffing.',
    'seo_title: the title as it should appear in a search result, 60 characters maximum.',
    'seo_description: 140 to 155 characters, written to earn the click, describing what the',
    'reader gets. Not a summary of the company.',
    'excerpt: one or two sentences shown on the blog index.',
    'seo_keywords: 3 to 6 lowercase, hyphenated tags.'
  ];
}

module.exports = { blogRules, blogSeoRules, BANNED_PHRASES };
