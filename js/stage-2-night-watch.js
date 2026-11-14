/*
 * stage-2-night-watch.js — Stage 2: "Spot the numbers" in a busy farm picture.
 *
 * How it works:
 *   - img/farm.png is a busy farm scene. Three digits are hidden in it, drawn in a
 *     colour only a little different from what's behind them.
 *   - A magnifying glass follows the mouse or finger (an SVG clip with a zoomed
 *     copy of the picture inside it).
 *   - Every 3 minutes the game offers a clue: a short rhyme saying where to look.
 *   - The player types the 3 digits, which are checked against a fingerprint.
 *
 * The digits exist only as pixels in the picture, never in this code.
 */
(function () {
  'use strict';

  const PICTURE_WIDTH = 800;
  const PICTURE_HEIGHT = 500;
  const LENS_RADIUS = 70;           // in picture units
  const ZOOM = 2.5;
  const CLUE_EVERY_MS = 3 * 60 * 1000;

  // Where to look, one rhyme per digit (left to right).
  const CLUES = [
    'The first is painted, red on red,<br>on planks where all the cows are fed.',
    'The second is carved in the old tree’s bark,<br>low on the trunk, where the wood is dark.',
    'The last is woven, gold on gold,<br>in the pile of hay the farmer rolled.'
  ];

  const WRONG_LINES = [
    'Nope. Look closer.',
    'Not quite. Read them left to right.',
    'Wrong. Those numbers are hiding better than that.'
  ];

  // Clues already given, and when the next one is offered, survive a refresh.
  const CLUE_KEY = 'egghunt-v2-clues';
  function loadClues() {
    try {
      const saved = JSON.parse(localStorage.getItem(CLUE_KEY));
      if (saved && Number.isInteger(saved.shown) && typeof saved.nextAt === 'number') return saved;
    } catch (error) { /* storage blocked or empty */ }
    return { shown: 0, nextAt: Date.now() + CLUE_EVERY_MS };
  }
  function saveClues(clues) {
    try { localStorage.setItem(CLUE_KEY, JSON.stringify(clues)); } catch (error) { /* ignore */ }
  }

  Game.stages.night = {
    mount(app) {
      app.innerHTML = `
        <section class="card">
          <div class="kicker">Stage 2 of 3</div>
          <h1>Spot the Numbers</h1>
          <p class="verse">
            Three little numbers are hiding in sight,<br>
            read them in order, from left to the right.
          </p>
          <p class="muted small">
            <span class="desk-only">Move the mouse over the picture to use the magnifying glass.</span>
            <span class="touch-only">Drag your finger over the picture to use the magnifying glass.</span>
          </p>
        </section>

        <div class="scene-wrap">
          <svg class="farm" viewBox="0 0 ${PICTURE_WIDTH} ${PICTURE_HEIGHT}" role="img" aria-label="A busy farm">
            <defs>
              <clipPath id="lensClip"><circle class="lens" r="${LENS_RADIUS}" cx="-999" cy="-999"/></clipPath>
            </defs>
            <image href="img/farm.png" width="${PICTURE_WIDTH}" height="${PICTURE_HEIGHT}"/>
            <g clip-path="url(#lensClip)">
              <image class="zoomed" href="img/farm.png" width="${PICTURE_WIDTH * ZOOM}" height="${PICTURE_HEIGHT * ZOOM}" x="-9999" y="-9999"/>
            </g>
            <circle class="lens lens-rim" r="${LENS_RADIUS}" cx="-999" cy="-999" pointer-events="none"/>
          </svg>
        </div>

        <div class="clue-offer" id="clueOffer" hidden>
          <span>🔍 Stuck? Want a clue?</span>
          <button type="button" class="btn btn-small" id="clueYes">Yes please</button>
          <button type="button" class="btn btn-ghost btn-small" id="clueNo">Not yet</button>
        </div>
        <div id="clueList"></div>

        <section class="card" id="answerCard">
          <form id="answerForm" autocomplete="off">
            <input id="answer" type="text" inputmode="numeric" maxlength="3" placeholder="3 digits"
                   aria-label="The three digits" autocapitalize="off" autocorrect="off" spellcheck="false">
            <button class="btn" id="submitButton">Check</button>
          </form>
          <p class="msg" id="message" aria-live="polite"></p>
        </section>`;

      const svg = app.querySelector('svg.farm');
      const lensCircles = [...svg.querySelectorAll('.lens')];
      const zoomed = svg.querySelector('.zoomed');
      const answerCard = app.querySelector('#answerCard');
      const input = app.querySelector('#answer');
      const submitButton = app.querySelector('#submitButton');
      const message = app.querySelector('#message');
      const clueOffer = app.querySelector('#clueOffer');
      const clueList = app.querySelector('#clueList');
      const limiter = Game.makeGuessLimiter();
      const clues = loadClues();

      /* ---- The magnifying glass ---------------------------------------- */

      function toPicturePoint(event) {
        const screenToPicture = svg.getScreenCTM();
        if (!screenToPicture) return { x: -999, y: -999 };
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        return point.matrixTransform(screenToPicture.inverse());
      }

      function moveLens(x, y) {
        lensCircles.forEach(circle => {
          circle.setAttribute('cx', x);
          circle.setAttribute('cy', y);
        });
        // Shift the big copy so the point under the lens stays under the lens.
        zoomed.setAttribute('x', x - x * ZOOM);
        zoomed.setAttribute('y', y - y * ZOOM);
      }

      const followPointer = event => {
        const point = toPicturePoint(event);
        moveLens(point.x, point.y);
      };
      svg.addEventListener('pointermove', followPointer);
      svg.addEventListener('pointerdown', followPointer);
      svg.addEventListener('pointerleave', event => {
        if (event.pointerType === 'mouse') moveLens(-999, -999);
      });

      /* ---- Clues every 3 minutes ---------------------------------------- */

      function showClues() {
        clueList.innerHTML = CLUES.slice(0, clues.shown)
          .map((clue, i) => `<p class="verse clue"><b>Clue ${i + 1}:</b><br>${clue}</p>`).join('');
      }

      function checkClueTimer() {
        if (Game.isSolved(1) || clues.shown >= CLUES.length) {
          clueOffer.hidden = true;
          return;
        }
        if (Date.now() >= clues.nextAt) clueOffer.hidden = false;
      }

      app.querySelector('#clueYes').addEventListener('click', () => {
        clues.shown = Math.min(CLUES.length, clues.shown + 1);
        clues.nextAt = Date.now() + CLUE_EVERY_MS;
        saveClues(clues);
        clueOffer.hidden = true;
        showClues();
      });
      app.querySelector('#clueNo').addEventListener('click', () => {
        clues.nextAt = Date.now() + CLUE_EVERY_MS;
        saveClues(clues);
        clueOffer.hidden = true;
      });

      saveClues(clues);
      showClues();
      checkClueTimer();
      const clueTimer = setInterval(checkClueTimer, 5000);
      this.stop = () => clearInterval(clueTimer);

      /* ---- Answer ------------------------------------------------------- */

      function waitBeforeNextTry(seconds) {
        submitButton.disabled = true;
        let left = seconds;
        const tick = () => {
          if (left <= 0) {
            submitButton.disabled = false;
            message.textContent = 'You can try again.';
            return;
          }
          message.textContent = `Hold on ${left} s. Have another look.`;
          left--;
          setTimeout(tick, 1000);
        };
        tick();
      }

      function finish(digits) {
        clueOffer.hidden = true;
        answerCard.innerHTML = `
          <div class="kicker">Stage 2 complete</div>
          <h1>Sharp eyes! 🔍</h1>
          <p>That's <span class="inline-code">${Game.escape(digits)}</span>. It's in the code bar now.</p>
          <button class="btn btn-big" id="next">On to the last stop →</button>`;
        answerCard.querySelector('#next').addEventListener('click', () => Game.nextStage());
      }

      app.querySelector('#answerForm').addEventListener('submit', async event => {
        event.preventDefault(); // stay on the page; nothing is sent anywhere
        if (submitButton.disabled) return;
        const digits = input.value.replace(/\D/g, '');
        if (digits.length !== 3) {
          message.className = 'msg bad';
          message.textContent = 'The answer is 3 digits.';
          return;
        }

        submitButton.disabled = true;
        const correct = await Game.checkAnswer('night', digits);
        submitButton.disabled = false;

        if (correct) {
          limiter.right();
          Game.completePart(1, digits);
          Game.toast('Correct! 🔍');
          finish(digits);
        } else {
          message.className = 'msg bad';
          message.textContent = Game.pickRandom(WRONG_LINES);
          answerCard.classList.remove('shake');
          void answerCard.offsetWidth;
          answerCard.classList.add('shake');
          input.select();
          const wait = limiter.wrong();
          if (wait) waitBeforeNextTry(wait);
        }
      });

      if (Game.isSolved(1)) finish(Game.progress.found[1]);
    },

    unmount() {
      if (this.stop) this.stop();
    }
  };
})();
