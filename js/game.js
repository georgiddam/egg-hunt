/*
 * game.js — the core every stage shares.
 *
 * It creates one global object, `Game`, which:
 *   - checks answers WITHOUT the answers being written anywhere (see "Checking answers")
 *   - remembers progress in this browser so a page refresh doesn't lose it
 *   - shows one stage (screen) at a time
 *   - draws the code bar at the top of the page
 *   - offers small helpers: popup messages, safe HTML text, repeatable randomness
 *
 * Nothing in this site talks to a server. No cookies, no tracking, no analytics.
 */
(function () {
  'use strict';

  const config = window.EGG_CONFIG;

  /* ------------------------------------------------------------------------
   * Checking answers
   *
   * The site never contains the answers or the code. js/answer-hashes.js only
   * holds a "fingerprint" (hash) of each correct answer. When the player types
   * something, we fingerprint what they typed the same way and compare.
   * A fingerprint can't be turned back into the answer.
   *
   * The fingerprint is PBKDF2-SHA256 (built into every browser), salted with
   * the puzzle's name, so the same answer gives a different fingerprint in
   * each puzzle. tools/make-hash.html makes new fingerprints.
   * --------------------------------------------------------------------- */

  const HASH_ROUNDS = 100000;

  // "The Foundation!" -> "foundation", "Pâté" -> "pate". Both the checker and the tool use this.
  function normaliseAnswer(text) {
    return String(text)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove accents: â -> a, é -> e
      .toLowerCase()
      .trim()
      .replace(/^(the|a|an)\s+/, '')   // ignore a leading "the", "a" or "an"
      .replace(/[^a-z0-9]/g, '');      // ignore spaces, punctuation and accents
  }

  async function fingerprint(puzzleId, text) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(normaliseAnswer(text)), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode('egg-001/' + puzzleId), iterations: HASH_ROUNDS },
      key, 256);
    return [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Resolves to true if `text` is a correct answer to puzzle `puzzleId`.
  async function checkAnswer(puzzleId, text) {
    const accepted = (window.EGG_ANSWER_HASHES || {})[puzzleId] || [];
    if (!normaliseAnswer(text) || !window.crypto || !crypto.subtle) return false;
    return accepted.includes(await fingerprint(puzzleId, text));
  }

  /* ------------------------------------------------------------------------
   * Saved progress (localStorage, this browser only)
   *
   *   stage — which screen the player is on (0 = intro … 4 = finale)
   *   found — the digits the player has earned, one string per part:
   *           ['', '', ''] at the start, e.g. ['12', '345', ''] later.
   *           These come from the player's own correct answers.
   * --------------------------------------------------------------------- */

  const STORAGE_KEY = 'egghunt-v2';
  const PART_LENGTHS = [2, 3, 3];   // riddles, night, village

  function freshProgress() {
    return { stage: 0, found: ['', '', ''] };
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Number.isInteger(saved.stage) && Array.isArray(saved.found) && saved.found.length === 3 &&
          saved.found.every((part, i) => part === '' || new RegExp('^\\d{' + PART_LENGTHS[i] + '}$').test(part))) {
        return { stage: saved.stage, found: saved.found };
      }
    } catch (error) {
      // Storage can be blocked (private mode). The game still works, it just won't remember.
    }
    return freshProgress();
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      // Ignore: see loadProgress.
    }
  }

  /* ------------------------------------------------------------------------
   * Helpers
   * --------------------------------------------------------------------- */

  // Repeatable "random" numbers: the same seed always gives the same sequence,
  // so the scenery looks the same on every visit. ("mulberry32" generator.)
  function seededRandom(seed) {
    let state = seed;
    return function nextRandom() {
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // a number from 0 to 1
    };
  }

  // Makes text safe to put inside HTML (so a name like "<b>" shows as text).
  function escapeHtml(text) {
    const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text).replace(/[&<>"']/g, character => replacements[character]);
  }

  // The player's name from config.js, already escaped for use inside HTML templates.
  const names = {
    player: escapeHtml(config.playerName)
  };

  // The prize link is only used if it is a plain https:// address.
  const prizeUrl = /^https:\/\/[^\s"'<>]+$/.test((config.prizeUrl || '').trim())
    ? config.prizeUrl.trim()
    : '';

  /* ------------------------------------------------------------------------
   * The Game object
   * --------------------------------------------------------------------- */

  const Game = {
    config,
    names,
    prizeUrl,
    PART_LENGTHS,

    // Each stage file adds itself here, e.g. Game.stages.riddles = { mount() {…} }.
    stages: {},
    order: ['intro', 'riddles', 'night', 'village', 'finale'],

    progress: loadProgress(),
    currentStage: null,

    random: seededRandom,
    escape: escapeHtml,
    checkAnswer,
    fingerprint,
    normaliseAnswer,

    // Called once when the page loads (see start.js).
    start() {
      // Testing shortcuts: ?reset starts over, ?yolk=3 jumps to stage 3
      // (digits from skipped stages show as "?", because the site doesn't know them).
      const params = new URLSearchParams(location.search);
      if (params.has('reset')) {
        this.progress = freshProgress();
      }
      if (params.has('yolk')) {
        const stage = Math.max(0, Math.min(4, parseInt(params.get('yolk'), 10) || 0));
        this.progress.stage = stage;
      }
      saveProgress(this.progress);
      this.drawCodeBar();
      this.showStage(this.progress.stage);
    },

    // Replace whatever is on screen with stage number `index`.
    showStage(index) {
      if (this.currentStage && this.currentStage.unmount) {
        this.currentStage.unmount(); // let the old stage stop its timers and listeners
      }
      const app = document.getElementById('app');
      app.innerHTML = '';
      app.className = 'stage-' + this.order[index];

      this.currentStage = this.stages[this.order[index]];
      this.currentStage.mount(app);
      window.scrollTo(0, 0);
    },

    nextStage() {
      this.progress.stage = Math.min(this.progress.stage + 1, this.order.length - 1);
      saveProgress(this.progress);
      this.showStage(this.progress.stage);
    },

    restart() {
      this.progress = freshProgress();
      saveProgress(this.progress);
      this.drawCodeBar();
      this.showStage(0);
    },

    // Has part `partIndex` (0, 1 or 2) been solved?
    isSolved(partIndex) {
      return this.progress.found[partIndex] !== '';
    },

    // Store the digits the player just proved correct, and show them in the code bar.
    completePart(partIndex, digits) {
      const wasSolved = this.isSolved(partIndex);
      this.progress.found[partIndex] = String(digits);
      saveProgress(this.progress);
      this.drawCodeBar(wasSolved ? undefined : partIndex);
    },

    // The full code so far, e.g. "12345678" (or with "?" for unknown digits).
    fullCode() {
      return this.progress.found.map((part, i) => part || '?'.repeat(PART_LENGTHS[i])).join('');
    },

    // Draw the 8 boxes at the top. Earned digits show; the rest show "?".
    // `newPart` (optional) makes that part's digits pop.
    drawCodeBar(newPart) {
      const bar = document.getElementById('code');
      bar.innerHTML = '';

      PART_LENGTHS.forEach((length, partIndex) => {
        const group = document.createElement('span');
        group.className = 'grp';
        const digits = this.progress.found[partIndex];

        for (let i = 0; i < length; i++) {
          const box = document.createElement('span');
          box.className = 'd' + (digits ? ' on' : '') + (partIndex === newPart ? ' pop' : '');
          box.style.animationDelay = (i * 0.15) + 's';
          box.textContent = digits ? digits[i] : '?';
          group.appendChild(box);
        }

        bar.appendChild(group);
      });
    },

    // A short message that slides up from the bottom for a few seconds.
    toast(message, milliseconds) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => toast.classList.remove('show'), milliseconds || 2600);
    },

    // Replace {name} in a sentence with the player's name.
    // The result is plain text: put it in textContent, or escape it before using as HTML.
    fillNames(sentence) {
      return sentence.replace(/\{name\}/g, config.playerName);
    },

    pickRandom(list) {
      return list[Math.floor(Math.random() * list.length)];
    },

    // Slows down guessing: after a few wrong tries in a row, each new try has to wait.
    // Returns an object with .wrong() (call on a wrong answer, returns seconds to wait)
    // and .right() (call on a right answer).
    makeGuessLimiter() {
      let wrongInARow = 0;
      return {
        wrong() {
          wrongInARow++;
          return wrongInARow < 3 ? 0 : Math.min(30, (wrongInARow - 2) * 5);
        },
        right() { wrongInARow = 0; }
      };
    }
  };

  window.Game = Game;
})();
