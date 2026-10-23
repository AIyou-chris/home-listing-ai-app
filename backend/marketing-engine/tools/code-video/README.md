# code-video

Animated explainer videos drawn in code. A **scene is a function of time**: it paints everything on screen at second `t`. The engine calls it once per frame, hands the pixels straight to FFmpeg, and you get an MP4. No browser, no paid video AI, no per-video cost.

It ships with four ready scenes, so videos do not all look alike:

- `chat-answer`: a customer asks a question, the assistant answers, a time is booked, a lead is saved.
- `website-edit`: a website's headline is clicked, rewritten by typing, and saved, then a second detail (hours, a service) the same way.
- `phone-call`: a phone rings, the AI answers, the conversation appears, a booking is made and a lead is saved.
- `walkthrough`: an app on a phone guides someone through three steps (the guide speaks, a value is typed, a result appears, a progress bar fills).

Each ends with a closing headline and button. Change a scene's text with a config and you have a new video. Write your own scene in about 100 lines.

This folder is **self-contained**. It does not import anything from the app it lives in.

## Copy it into another project

1. Copy this whole folder (`code-video/`) into the other project, for example `tools/code-video/`.
2. Install its two dependencies, either by running `npm install` inside the folder, or by adding them to the host project's `package.json`:
   - `@napi-rs/canvas` (a prebuilt Skia canvas, no system libraries needed)
   - `ffmpeg-static` (a bundled FFmpeg). If you would rather use the server's own FFmpeg, skip this and set `FFMPEG_PATH=/usr/bin/ffmpeg`.
3. Make a video:

```bash
node tools/code-video/cli.cjs chat-answer out.mp4
node tools/code-video/cli.cjs chat-answer out.mp4 my-config.json --width 1080
```

or from code:

```js
const { renderTemplate } = require('./tools/code-video/src/index.cjs')

await renderTemplate({
  template: 'chat-answer',
  config: { business: 'Sample Plumbing Co.', question: 'Do you fix leaks on Sundays?' /* ...see below */ },
  out: '/tmp/video.mp4',
  width: 720        // default. Height is 16:9 vertical, 1280 at 720 wide.
})
```

Requirements: Node 18 or newer. Runs on Linux (x64 and arm64), macOS and Windows.

## The `chat-answer` config (the other scenes list their fields at the top of their file)

Every field is optional. Text is cut to fit its box, so nothing can overflow.

| Field | What it is | Max |
|---|---|---|
| `brand` | small label top left | 20 |
| `timeLabel`, `timeSuffix` | the big clock, e.g. `11:38` and `PM` | 8, 3 |
| `closedLabel` | the sign | 10 |
| `business` | name in the phone header | 28 |
| `closedLine` | line under the clock | 52 |
| `assistantLabel`, `avatarLetter` | header status line and avatar letter | 30, 1 |
| `question` | what the customer types | 70 |
| `answer` | the assistant's reply | 90 |
| `options` | exactly two short choices, the first is tapped | 12 each |
| `booked` | confirmation bubble | 40 |
| `leadTitle`, `leadLines` | the "saved" card, one to three lines | 34, 36 each |
| `sampleLabel` | small label under the phone | 30 |
| `endHeadline` | one to three closing lines | 16 each |
| `endAccent` | words at the end of the last headline line shown in the accent colour | 16 |
| `endLine`, `cta`, `small`, `url` | closing text, button, fine print, web address | 110, 30, 80, 30 |
| `accent` | brand colour, hex | `#ff5a36` |

## Write your own scene

A scene is `{ duration, draw(ctx, t) }`. Draw into a **720 x 1280** space; the engine scales it to the real size.

```js
const { renderVideo, easing: { seg, outC }, kit: { fillRoundRect } } = require('./tools/code-video/src/index.cjs')

await renderVideo({
  duration: 3, out: 'hello.mp4',
  draw(ctx, t) {
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, 720, 1280)
    const p = outC(seg(t, 0.2, 1.0))            // 0 to 1 between 0.2s and 1.0s, eased
    ctx.globalAlpha = p
    fillRoundRect(ctx, 60, 500 + (1 - p) * 80, 600, 200, 40, '#ff5a36')
  }
})
```

Helpers: `easing` (`seg`, `outC`, `outB`, `inOut`, `lerp`, `typed`) and `kit` (`fillRoundRect`, `strokeRoundRect`, `wrapText`, `setFont`, `drawLines`, `withMotion`). Fonts `Anton` and `Inter` are bundled and registered; add more with `loadFonts({ Family: '/path/font.ttf' })`.

Rule of thumb: **a scene must be a pure function of `t`**. No timers, no state carried between frames. Then any frame can be drawn on its own, which is how you check your work: `renderFrame({ draw, t: 6.7 })` returns a PNG buffer.

## Voice and music

A video can have a spoken voice over a music bed. The music is **made in code** (`src/music.cjs`, a soft pad, plucks and a quiet beat), so there is nothing to license. The voice is whatever audio files you give it, so use any text-to-speech you like.

```js
const { renderTemplate, templates } = require('./tools/code-video/src/index.cjs')

// 1. Ask the template what is said and when
const lines = templates['chat-answer'].narration(config)
//    [{ id: 'open', at: 0.7, role: 'narrator', maxSeconds: 2.4, text: "It's 11:38 PM. ..." }, ...]
//    templates['chat-answer'].ROLES says how each role should sound.

// 2. Record each line with your text-to-speech and save it as a file, then:
await renderTemplate({
  template: 'chat-answer', config, out: 'video.mp4',
  audio: {
    cues: lines.map(l => ({ at: l.at, file: `/tmp/${l.id}.mp3`, maxSeconds: l.maxSeconds })),
    music: true            // or { mood: 'warm' | 'bright', gain: 0.32, seed: 7 }
  }
})
```

- A spoken line longer than `maxSeconds` is sped up a little (at most 1.3x) to fit.
- The music dips while someone is talking, and the whole mix is brought to a normal social-video loudness (about -15 LUFS).
- Leave `audio` out for a silent video. Pass `music: true` with no `cues` for music only.
- The sound is mixed in its own FFmpeg pass that finishes before the video is drawn, so the two never use memory at the same time.

## Memory

Built to run on a small server.

- Frames are streamed to FFmpeg and never kept.
- Garbage is collected every 12 frames, because each frame is megabytes of native memory.
- Default encoder preset is `veryfast` with one thread.

Measured in Docker with no swap, 720 x 1280, 24 fps, 18.5 seconds (444 frames):

| Memory limit | Result |
|---|---|
| 300 MB | passes on x64 and arm64 |
| 200 MB | passes (about 155 MB for Node plus 100 MB for FFmpeg) |
| 150 MB | fails |

With voice and music (six spoken lines over the music bed), the same video passes at **250 MB** and fails at 200 MB.

For comparison, a headless-Chrome renderer needed about 450 MB for the same video. To re-run the test, build an image from `node:22-slim`, copy this folder in, run `npm install`, then `docker run --memory=200m --memory-swap=200m <image> node cli.cjs chat-answer /tmp/o.mp4`.

## Files

```
code-video/
  cli.cjs                  command line
  package.json             dependencies
  fonts/                   Anton and Inter (SIL Open Font License, see fonts/OFL.txt)
  src/index.cjs            public API
  src/engine.cjs           renderVideo, renderFrame, loadFonts, the audio mix
  src/music.cjs            music bed made in code
  src/easing.cjs           timing helpers
  src/kit.cjs              drawing helpers
  src/templates/           ready scenes (chat-answer, website-edit, phone-call, walkthrough) and shared.cjs
  test/selftest.cjs        node --test test/
```

## Tests

`npm test` inside this folder runs a quick self-check (draws frames and a one-second video).
