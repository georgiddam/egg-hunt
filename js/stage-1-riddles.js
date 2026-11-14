/*
 * stage-1-riddles.js — the intro "ticket" screen and Stage 1 (the riddle chain).
 *
 * Stage 1 is a chain of three riddles. Each answer leads into the next one, and
 * each correct answer cracks the big egg a bit more. The answer to the last
 * riddle is a 2-digit number: those are the first 2 digits of the code.
 *
 * The answers are not in this file. Answers are checked with Game.checkAnswer,
 * which compares fingerprints (see game.js and js/answer-hashes.js).
 */
(function () {
  'use strict';

  const names = Game.names;

  /* ========================================================================
   * Intro screen: a work ticket assigned to the player
   * ===================================================================== */

  Game.stages.intro = {
    mount(app) {
      app.innerHTML = `
        <section class="card ticket">
          <div class="ticket-head">
            <span class="ticket-key">EGG-001</span>
            <span class="pill pill-red">Priority: Highest</span>
            <span class="pill">Status: To Do</span>
          </div>
          <h1>Crack the Code</h1>
          <dl class="ticket-meta">
            <div><dt>Assignee</dt><dd>${names.player}</dd></div>
          </dl>

          <h2>Description</h2>
          <p>Hi ${names.player}. Something nice has been locked away behind an <b>8-digit code</b>.
          For once, <em>you</em> are the one who has to deliver. 🥚</p>

          <h2>Acceptance criteria</h2>
          <ul class="checklist">
            <li>🥚 Crack 3 riddles <span>· 2 digits</span></li>
            <li>🔍 Spot the numbers hidden on the farm <span>· 3 digits</span></li>
            <li>🔒 Open the safe in Eggsville <span>· 3 digits</span></li>
          </ul>

          <p class="muted small">Estimate: 15–30 minutes. Googling is allowed. Progress is saved in this browser.</p>
          <button class="btn btn-big" id="go">Move to In Progress →</button>
        </section>`;

      app.querySelector('#go').addEventListener('click', () => Game.nextStage());
    }
  };

  /* ========================================================================
   * Stage 1: the riddle chain
   *
   * Each riddle has:
   *   id          the name its answer fingerprint is stored under (answer-hashes.js)
   *   question    HTML shown to the player
   *   hints       shown one at a time when the player asks
   *   digitsOnly  the answer is a number: only the digits typed are checked
   * ===================================================================== */

  const RIDDLES = [
    {
      id: 'riddle-1',
      title: 'A rhyme to start',
      question: `
        <p class="verse">
          I'm laid before building, though nobody clucks;<br>
          I hold up the house when the wild weather bucks.<br>
          Brushed onto faces, I even out skin;<br>
          I fund noble causes with money brought in.<br>
          And when a great Empire was doomed to decay,<br>
          a mathematician set me up far away.
        </p>
        <p>What am I? <span class="muted small">(one word)</span></p>`,
      hints: [
        'Every line describes a different meaning of the same word.',
        'Builders pour it, make-up artists brush it on, charities are called it. The last two lines are an Isaac Asimov novel.'
      ]
    },
    {
      id: 'riddle-2',
      title: 'Home brew',
      question: `
        <p class="verse">
          I start out as barley, with hops in a pot;<br>
          then yeast eats my sugar while I'm kept not too hot.<br>
          Bottled and capped, I wait weeks in the dark,<br>
          then open me up and I fizz with a spark.<br>
          Someone you know used to brew me at home,<br>
          a fridge full of bottles, all crowned with my foam.
        </p>
        <p>What am I? <span class="muted small">(one word)</span></p>`,
      hints: [
        "It's a drink. You'd want it cold.",
        'You brewed it yourself for a while.'
      ]
    },
    {
      id: 'riddle-3',
      title: 'The last crack',
      digitsOnly: true,
      question: `
        <p class="verse">
          A hen keeps her egg warm for days in a row;<br>
          count them until the chick's ready to go.<br>
          Then times it by Laws that keep robots in line,<br>
          the Three, plus the Zeroth he added in time.
        </p>
        <p>The answer is the first 2 digits of your code.</p>`,
      hints: [
        'Search "how many days for a chicken egg to hatch".',
        'Asimov wrote three Laws of Robotics, and later added the Zeroth Law: 4 in total.'
      ]
    }
  ];

  const WRONG_ANSWER_LINES = [
    'Nope. That one goes back into the backlog.',
    'Not quite. Try again.',
    'Scrambled. Try again.',
    'Close? Maybe. Correct? No.'
  ];
  const RIGHT_ANSWER_LINES = ['Crack! 🥚', 'Correct! The shell is giving way.', 'Nice one.'];

  /* ---- The egg drawing (SVG) ------------------------------------------- */

  // Outline of the egg, in a 200 x 280 box.
  const EGG_OUTLINE = 'M100 20 C150 20 182 115 182 165 C182 222 146 258 100 258 C54 258 18 222 18 165 C18 115 50 20 100 20Z';

  // A zig-zag line across the middle of the egg: where it splits when it hatches.
  const zigzagPoints = [];
  for (let x = 0, i = 0; x <= 200; x += 20, i++) {
    zigzagPoints.push(x + ',' + (i % 2 ? 162 : 142));
  }
  // Shapes above and below the zig-zag, used to cut the egg into a top and bottom shell.
  const TOP_HALF = '0,-40 200,-40 ' + zigzagPoints.slice().reverse().join(' ');
  const BOTTOM_HALF = zigzagPoints.join(' ') + ' 200,290 0,290';

  // One crack per riddle. The last crack follows the zig-zag.
  const CRACKS = [
    'M30 120 L52 130 L45 145 L66 152 L60 166',
    'M166 98 L146 112 L158 124 L138 136 L150 150',
    'M' + zigzagPoints.join(' L')
  ];

  // Little brown speckles on the shell: [x, y, size].
  const SPECKLES = [[70, 70, 4], [128, 92, 3], [58, 196, 5], [142, 212, 4], [104, 232, 3], [150, 170, 3], [86, 112, 2.5]]
    .map(([x, y, size]) => `<ellipse cx="${x}" cy="${y}" rx="${size}" ry="${size * 0.8}" fill="#c8ab7c" opacity=".55"/>`)
    .join('');

  function eggDrawing() {
    return `
      <svg class="egg-svg" viewBox="0 -30 200 310" role="img" aria-label="A large egg">
        <defs>
          <radialGradient id="eggShade" cx="38%" cy="30%" r="80%">
            <stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#f4e7cd"/><stop offset="1" stop-color="#d8bf95"/>
          </radialGradient>
          <clipPath id="eggTop"><polygon points="${TOP_HALF}"/></clipPath>
          <clipPath id="eggBottom"><polygon points="${BOTTOM_HALF}"/></clipPath>
          <clipPath id="eggClip"><path d="${EGG_OUTLINE}"/></clipPath>
        </defs>

        <ellipse cx="100" cy="266" rx="66" ry="8" fill="rgba(60,40,10,.18)"/>

        <!-- The chick: hidden inside until the egg hatches. The sign is filled in
             with the player's own answer. -->
        <g class="chick">
          <line x1="100" y1="62" x2="100" y2="96" stroke="#7a5230" stroke-width="4"/>
          <rect x="48" y="12" width="104" height="54" rx="8" fill="#fff" stroke="#2b1d12" stroke-width="3"/>
          <text x="100" y="52" text-anchor="middle" class="sign-digits"></text>
          <circle cx="100" cy="132" r="40" fill="#ffd23f"/>
          <path d="M94 94 q6 -12 12 0" stroke="#ffd23f" stroke-width="5" fill="none" stroke-linecap="round"/>
          <circle cx="86" cy="122" r="5" fill="#2b1d12"/><circle cx="114" cy="122" r="5" fill="#2b1d12"/>
          <circle cx="88" cy="120" r="1.6" fill="#fff"/><circle cx="116" cy="120" r="1.6" fill="#fff"/>
          <path d="M92 132 L108 132 L100 143Z" fill="#f28c28"/>
          <circle cx="75" cy="136" r="5" fill="#ff9f9f" opacity=".6"/><circle cx="125" cy="136" r="5" fill="#ff9f9f" opacity=".6"/>
        </g>

        <!-- The shell, as a bottom half and a top half that flies off -->
        <g class="shell-bot" clip-path="url(#eggBottom)">
          <path d="${EGG_OUTLINE}" fill="url(#eggShade)" stroke="#b79b6c" stroke-width="2"/>${SPECKLES}
        </g>
        <g class="shell-top" clip-path="url(#eggTop)">
          <path d="${EGG_OUTLINE}" fill="url(#eggShade)" stroke="#b79b6c" stroke-width="2"/>${SPECKLES}
        </g>

        <!-- Cracks: invisible until given the "on" class -->
        <g class="cracks" clip-path="url(#eggClip)">
          ${CRACKS.map((path, i) => `<path class="crack" data-i="${i}" d="${path}" pathLength="1"/>`).join('')}
        </g>
      </svg>`;
  }

  /* ---- Stage logic ---------------------------------------------------- */

  // Which riddle the player is on survives a page refresh (but not the answers).
  const STEP_KEY = 'egghunt-v2-riddle-step';
  function loadStep() {
    try { return Math.max(0, Math.min(RIDDLES.length - 1, parseInt(localStorage.getItem(STEP_KEY), 10) || 0)); }
    catch (error) { return 0; }
  }
  function saveStep(step) {
    try { localStorage.setItem(STEP_KEY, String(step)); } catch (error) { /* ignore */ }
  }

  Game.stages.riddles = {
    mount(app) {
      app.innerHTML = `
        <div class="riddles">
          <div class="egg-wrap">${eggDrawing()}</div>
          <section class="card riddle" id="riddleCard"></section>
        </div>`;

      const egg = app.querySelector('.egg-svg');
      const card = app.querySelector('#riddleCard');
      const limiter = Game.makeGuessLimiter();

      let riddleIndex = Game.isSolved(0) ? RIDDLES.length : loadStep();

      function showCrack(index) {
        const crack = egg.querySelector(`.crack[data-i="${index}"]`);
        if (crack) crack.classList.add('on');
      }
      for (let i = 0; i < Math.min(riddleIndex, RIDDLES.length); i++) showCrack(i);

      // Restart a CSS animation by removing the class, forcing a reflow, and adding it back.
      function replayAnimation(element, className) {
        element.classList.remove(className);
        void element.getBoundingClientRect();
        element.classList.add(className);
      }

      function showRiddle() {
        const riddle = RIDDLES[riddleIndex];
        let hintsShown = 0;

        card.innerHTML = `
          <div class="kicker">Stage 1 of 3 · Riddle ${riddleIndex + 1} of ${RIDDLES.length} · ${riddle.title}</div>
          <div class="q">${riddle.question}</div>
          <form id="answerForm" autocomplete="off">
            <input id="answer" type="text" placeholder="Your answer" aria-label="Your answer"
                   ${riddle.digitsOnly ? 'inputmode="numeric"' : ''}
                   autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="80">
            <button class="btn" id="submitButton">Crack it</button>
          </form>
          <div class="row"><button type="button" class="link" id="hintButton">Need a hint?</button></div>
          <p class="msg hint" id="hintText"></p>
          <p class="msg" id="message" aria-live="polite"></p>`;

        const input = card.querySelector('#answer');
        const submitButton = card.querySelector('#submitButton');
        const message = card.querySelector('#message');
        const hintText = card.querySelector('#hintText');
        const hintButton = card.querySelector('#hintButton');
        if (riddleIndex > 0) input.focus();

        hintButton.addEventListener('click', () => {
          hintsShown = Math.min(riddle.hints.length, hintsShown + 1);
          hintText.innerHTML = riddle.hints.slice(0, hintsShown).map(hint => 'Hint: ' + Game.escape(hint)).join('<br>');
          if (hintsShown === riddle.hints.length) hintButton.hidden = true;
        });

        // Locks the form for a few seconds after too many wrong guesses in a row.
        function waitBeforeNextTry(seconds) {
          submitButton.disabled = true;
          let left = seconds;
          const tick = () => {
            if (left <= 0) {
              submitButton.disabled = false;
              message.textContent = 'You can try again.';
              return;
            }
            message.textContent = `On hold for ${left} s. Think it through.`;
            left--;
            setTimeout(tick, 1000);
          };
          tick();
        }

        card.querySelector('#answerForm').addEventListener('submit', async event => {
          event.preventDefault(); // stay on the page; nothing is sent anywhere
          if (submitButton.disabled) return;
          const typed = riddle.digitsOnly ? input.value.replace(/\D/g, '') : input.value;
          if (!Game.normaliseAnswer(typed)) return;

          submitButton.disabled = true;
          const correct = await Game.checkAnswer(riddle.id, typed);
          submitButton.disabled = false;

          if (correct) {
            limiter.right();
            showCrack(riddleIndex);
            replayAnimation(egg, 'wobble');
            riddleIndex++;
            if (riddleIndex >= RIDDLES.length) {
              Game.completePart(0, typed);   // the last answer IS the 2 digits
              setTimeout(hatch, 700);
            } else {
              saveStep(riddleIndex);
              Game.toast(Game.pickRandom(RIGHT_ANSWER_LINES));
              showRiddle();
            }
          } else {
            message.className = 'msg bad';
            message.textContent = Game.pickRandom(WRONG_ANSWER_LINES);
            replayAnimation(card, 'shake');
            input.select();
            const wait = limiter.wrong();
            if (wait) waitBeforeNextTry(wait);
          }
        });
      }

      function hatch() {
        const digits = Game.progress.found[0];
        CRACKS.forEach((path, i) => showCrack(i));
        egg.querySelector('.sign-digits').textContent = digits;
        egg.classList.add('hatched'); // CSS flies the top shell off and raises the chick

        card.innerHTML = `
          <div class="kicker">Stage 1 complete</div>
          <h1>It hatched! 🐣</h1>
          <p>The chick is holding your first two digits: <span class="inline-code">${Game.escape(digits)}</span>.
          They've been added to the code bar at the top.</p>
          <p>Next: three more numbers are hiding somewhere on the farm.</p>
          <button class="btn btn-big" id="next">Go to the farm →</button>`;
        card.querySelector('#next').addEventListener('click', () => Game.nextStage());
      }

      if (riddleIndex >= RIDDLES.length) hatch();
      else showRiddle();
    }
  };
})();
