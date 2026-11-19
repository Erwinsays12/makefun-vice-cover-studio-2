[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Erwinsays12/makefun-vice-cover-studio-2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Erwinsays12/makefun-vice-cover-studio-2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Cover Studio

An offline browser web app that turns a person's photo and a caption into
GTA-style multi-panel cover art, exported as a PNG to share.

- 5 panel layouts (vice-grid, sunset-trio, hero-duo, quad, solo) with a
  caption band, sunset / neon / vice colour grades, halftone and grain.
- Any photo: load your own photos from your machine, crop and position each
  panel, fill several panels with one photo or several, edit the caption.
- One step to a PNG in the common post sizes: 1080 x 1080, 1080 x 1350 and
  1920 x 1080.

Open `app/index.html` from any static HTTP server (for example
`python3 -m http.server` inside `app/`). Everything runs offline: every
script, font and image is a file under `app/`, photos are read on your own
machine and never uploaded. The caption font is Anton (SIL Open Font
License, see `app/fonts/OFL.txt`).

Built for the [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01)
bounty on [make.fun](https://make.fun).
