# EGG-001 · Crack the Code

A small puzzle website: three stages that each give part of an 8-digit code.

1. **Riddles:** three rhyming riddles. The last answer is the first 2 digits.
2. **Spot the Numbers:** three digits are hidden in a busy farm picture, with a magnifying
   glass.
3. **Eggsville:** a top-down mini game. Walk down a road with three houses (library, barber,
   lodge) and an animal paddock. The safe in the lodge shows 3 pictures under each digit
   that point to where it's found. Things to poke at have fun facts, and a few make sounds
   (crackling fire, an owl, a splash).

Stages 2 and 3 have **timed clues**: after 6 minutes (then 4, then 2) the player can pick a
digit and get a clue for it. Each digit has 2 clues, and a "Clues" button keeps them all.

It's plain HTML, CSS and JavaScript: no build step, no server and no dependencies.

## The code is not in this site

None of the answers, and none of the digits, are written anywhere in these files:

- Each answer is checked against a **fingerprint** (a one-way hash) in `js/answer-hashes.js`.
  A fingerprint can't be turned back into the answer.
- The final code is put together from what the player typed, so the site never holds it.
- The Stage 2 digits exist only as pixels in `img/farm.png`.
- Stage 3's digits only come from working things out in the game (counting things).

One honest caveat: a 3-digit answer has only 1,000 possibilities, so a programmer could
try them all against its fingerprint. Each check is deliberately slow and the game makes
you wait after repeated wrong guesses, but this is a puzzle, not a bank vault. The voucher
itself is never on this site, only on the password-protected Pastebin.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page and its security policy. Loads the scripts in order. |
| `style.css` | All the styling. |
| `js/config.js` | Names, the prize link and the final message. |
| `js/answer-hashes.js` | Fingerprints of the correct answers. |
| `js/game.js` | Shared core: answer checking, progress saving, switching stages, the code bar. |
| `js/sounds.js` | Sound effects and the lo-fi jazz background music, made in the browser (no sound files). The 🔊 button turns the music off. |
| `js/clue-timer.js` | The timed clues and the "Clues" list, used by stages 2 and 3. |
| `js/stage-1-riddles.js` | Intro screen and the riddle chain. |
| `js/stage-2-night-watch.js` | The farm picture, the magnifying glass and the timed clues. |
| `js/village-art.js` | Pixel-art drawing helpers for Stage 3. |
| `js/village-places.js` | Stage 3's places and everything in them. |
| `js/stage-3-village.js` | Stage 3's engine: walking, doors, popups, animals, the safe. |
| `js/stage-4-finale.js` | Golden egg, confetti and the prize button. |
| `js/start.js` | Starts the game. |
| `img/farm.png` | The Stage 2 farm picture. |
| `tools/make-hash.html` | Makes a fingerprint for a new answer. |

## Changing things

- **Name, prize link, final message:** `js/config.js`.
- **An answer:** open `tools/make-hash.html` (through the local server below), choose the
  puzzle, type the new answer and paste the fingerprint into `js/answer-hashes.js`.
- **Wording, clues, facts, quotes:** `js/stage-1-riddles.js`, `js/stage-2-night-watch.js`
  and `js/village-places.js`. If a change alters an answer, update its fingerprint too.
- **After changing any file:** bump the `?v=` number on the links in `index.html`, so
  browsers load the new version instead of a cached one.

## Privacy and security

- The site sends no data anywhere. A security policy in `index.html` blocks all network
  requests from scripts (`connect-src 'none'`), blocks scripts from other sites, and
  blocks form submissions.
- The only outside requests are for the two fonts, from Google Fonts.
- No cookies, tracking or analytics. Progress is kept only in the visitor's own browser.

## Testing shortcuts

- `?reset`: start over.
- `?yolk=2`: jump to stage 2 (0 = intro … 4 = finale). Digits from skipped stages show as `?`.

To run it locally: `python -m http.server 8000` in this folder, then open http://localhost:8000.
Answer checking needs `http://localhost` or `https://`; it won't work from a `file://` link.
