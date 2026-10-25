'use strict';
// Which animated scene a post gets. A topic that names a scene keeps it. Otherwise, when the settings turn on
// video.autoScene, the first rule whose words appear in the topic picks one, else the fallback scene.
function pickScene(topic, video) {
  const scenes = Object.keys(video?.scenes || {}).filter((n) => !video.scenes[n].hidden);
  if (topic?.explainer && scenes.includes(topic.explainer)) return topic.explainer;
  const auto = video?.autoScene;
  if (!auto?.enabled) return null;
  const text = [topic?.key, topic?.pillar, topic?.headline, topic?.idea].filter(Boolean).join(' ');
  for (const rule of auto.rules || []) if (scenes.includes(rule.scene) && new RegExp(rule.pattern, 'i').test(text)) return rule.scene;
  return scenes.includes(auto.fallback) ? auto.fallback : null;
}
module.exports = { pickScene };
