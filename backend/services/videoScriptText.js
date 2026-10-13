'use strict';
// Scripts from the writer often carry directions like "[Opening shot: Bold text on screen]".
// Those are for a person filming, not words to show or say, so they never reach captions or the voice.
function spokenScript(script) {
  return String(script || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\((?:opening|cut|show|scene|b-?roll|music|sfx|text on screen|voice-?over)[^)]*\)/gi, ' ')
    .replace(/^\s*(?:voice-?over|narrator|speaker|on-?screen text)\s*:\s*/gim, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}
module.exports = { spokenScript };
