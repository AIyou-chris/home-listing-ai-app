'use strict';
// Listing-only scene: no software tour, fictional booking, or captured lead.
const { setFont, wrapText, fillRoundRect } = require('../marketing-engine/tools/code-video/src/kit.cjs');
const { backdrop } = require('../marketing-engine/tools/code-video/src/templates/shared.cjs');
const DURATION = 20.5;
function narration(c) {
  return [
    { id: 'home', at: 0.4, maxSeconds: 4, role: 'narrator', text: `Take a look at ${c.business}.` },
    { id: 'facts', at: 4.6, maxSeconds: 6, role: 'narrator', text: c.homeFacts || 'See the listing for the details.' },
    { id: 'question', at: 11, maxSeconds: 2.5, role: 'customer', text: c.question },
    { id: 'answer', at: 13.6, maxSeconds: 3, role: 'assistant', text: c.answer },
    { id: 'visit', at: 17, maxSeconds: 3.2, role: 'narrator', text: 'Open the listing link to see more and ask about this home.' }
  ];
}
function createScene(c) {
  const drawText = (ctx, text, y, size, color = '#ffffff', maxLines = 4) => {
    setFont(ctx, { size, weight: 700 });
    ctx.fillStyle = color; ctx.textAlign = 'left';
    wrapText(ctx, text, 600).slice(0, maxLines).forEach((line, i) => ctx.fillText(line, 60, y + i * size * 1.3));
  };
  return { duration: DURATION, draw(ctx, t) {
    backdrop(ctx, t, c);
    drawText(ctx, 'EXPLORE THIS HOME', 100, 25, '#67e8f9');
    drawText(ctx, c.business, 200, 52, '#ffffff', 2);
    if (t < 10.8) {
      fillRoundRect(ctx, 40, 380, 640, 430, 28, '#0f172a');
      drawText(ctx, c.homeFacts || 'See the listing for details.', 460, 44, '#ffffff', 5);
      drawText(ctx, 'See more at the listing link', 890, 30, '#67e8f9');
    } else if (t < 17) {
      drawText(ctx, 'A QUESTION ABOUT THIS HOME', 380, 23, '#67e8f9');
      drawText(ctx, c.question, 450, 38, '#ffffff', 3);
      drawText(ctx, c.answer, 650, 36, '#ffffff', 5);
    } else {
      drawText(ctx, 'See this home.', 410, 58);
      drawText(ctx, 'Open the listing link for photos and details.', 530, 35);
      drawText(ctx, c.url, 760, 26, '#67e8f9', 3);
    }
    drawText(ctx, c.endLine, 1030, 24, '#ffffff', 3);
    drawText(ctx, c.small, 1170, 20, '#cbd5e1', 3);
  } };
}
module.exports = { createScene, narration, DURATION };
