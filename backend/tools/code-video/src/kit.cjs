/**
 * Drawing helpers for scenes. Every scene draws into a 720 x 1280 "design
 * space"; the engine scales it to the real size, so scenes never think about
 * resolution.
 */
function roundRectPath(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y); ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h); ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl); ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fill) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r, stroke, lineWidth) {
  roundRectPath(ctx, x + lineWidth / 2, y + lineWidth / 2, w - lineWidth, h - lineWidth, Math.max(0, (Array.isArray(r) ? r[0] : r) - lineWidth / 2));
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/** Word-wraps `text` to `maxWidth` using the current font. Returns the lines. */
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function setFont(ctx, { family = 'Inter', weight = 500, size = 32, spacing = 0 } = {}) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.letterSpacing = `${spacing}px`;
}

/**
 * Draws text lines from `x`, first baseline at `y`. `align` is left, center or right
 * relative to x. Returns the y after the last line.
 */
function drawLines(ctx, lines, x, y, lineHeight, align = 'left') {
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

/**
 * Draws something with an opacity, a vertical offset and an optional pop-in
 * scale about its own centre. The workhorse for "things arriving".
 */
function withMotion(ctx, { alpha = 1, dy = 0, dx = 0, scale = 1, cx = 0, cy = 0, rotate = 0 }, draw) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx + dx, cy + dy);
  if (rotate) ctx.rotate(rotate);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
}

module.exports = { roundRectPath, fillRoundRect, strokeRoundRect, wrapText, setFont, drawLines, withMotion };
