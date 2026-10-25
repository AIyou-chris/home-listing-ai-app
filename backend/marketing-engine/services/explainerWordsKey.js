'use strict';
// A short fingerprint of "this scene, this voice setting, this post and its script". Words written for a campaign are saved with it,
// and the renderer reuses them only while it still matches (so editing the post or changing the scene writes new words).
const crypto = require('node:crypto');
const { videoOptions } = require('./studioVideoOptions');

const postFor = (row) => ({ title: row.outputs?.title || '', text: row.outputs?.facebook || row.outputs?.linkedin || '', script: row.outputs?.videoScript || '', facts: row.brief?.facts || [] });
function wordsKey(row) {
  const o = videoOptions(row.brief);
  return crypto.createHash('sha256').update(JSON.stringify([o.explainer, o.explainerVoice, postFor(row)])).digest('hex').slice(0, 24);
}
module.exports = { wordsKey, postFor };
