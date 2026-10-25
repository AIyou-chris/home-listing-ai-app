const engine = require('./engine.cjs');
const easing = require('./easing.cjs');
const kit = require('./kit.cjs');
const chatAnswer = require('./templates/chat-answer.cjs');
const websiteEdit = require('./templates/website-edit.cjs');
const phoneCall = require('./templates/phone-call.cjs');
const walkthrough = require('./templates/walkthrough.cjs');
const plan = require('./templates/plan.cjs');
const music = require('./music.cjs');

/** Ready-made scenes. Each has createScene(config) returning { duration, draw }. */
const templates = { 'chat-answer': chatAnswer, 'website-edit': websiteEdit, 'phone-call': phoneCall, walkthrough, plan };

/** Renders a named template with a config to an MP4. */
async function renderTemplate({ template = 'chat-answer', config = {}, out, ...rest }) {  // rest may include width, preset and audio
  const t = templates[template];
  if (!t) throw new Error(`Unknown template "${template}". Available: ${Object.keys(templates).join(', ')}`);
  const scene = t.createScene(config);
  return engine.renderVideo({ draw: scene.draw, duration: scene.duration, out, ...rest });
}

module.exports = { ...engine, renderTemplate, templates, easing, kit, music };
