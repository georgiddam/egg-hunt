/*
 * clue-timer.js — timed clues, shared by Stage 2 and Stage 3.
 *
 * A small bar shows a countdown. When it reaches zero the "Get a clue" button
 * lights up, the player picks which digit they want help with, and gets the
 * next clue for that digit. Then the countdown starts again.
 *
 *   Countdowns: 6 minutes for the first clue, 4 for the second, then 2 for each after.
 *   Each digit has 2 clues. Once both are used, that digit can't be picked again.
 *   The "Clues" button shows every clue given so far.
 *
 * Progress is saved in this browser, so a refresh doesn't reset the countdown.
 *
 * Game.makeClueTimer({
 *   id:          name used for saving, e.g. 'night'
 *   clues:       [[clue, clue], [clue, clue], [clue, clue]]  (HTML, one pair per digit)
 *   digitLabels: ['1st number', ...]  (HTML, shown on the picker buttons)
 *   bar:         element to draw the bar into
 *   openDialog(html, buttons) -> element holding the html;  closeDialog()
 * }) -> { stop() }
 */
(function () {
  'use strict';

  const MINUTES = [6, 4, 2];   // then 2 for every clue after that
  const minutesBeforeClue = number => (MINUTES[number] || MINUTES[MINUTES.length - 1]) * 60 * 1000;

  Game.makeClueTimer = function (options) {
    const storageKey = 'egghunt-v2-cluetimer-' + options.id;
    const digitCount = options.clues.length;

    function load() {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (saved && typeof saved.readyAt === 'number' && Array.isArray(saved.given)) return saved;
      } catch (error) { /* storage blocked or empty */ }
      return { readyAt: Date.now() + minutesBeforeClue(0), given: [] };   // given: [[digit, clueIndex], ...]
    }
    function save() {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* ignore */ }
    }

    const state = load();
    save();

    const usedFor = digit => state.given.filter(([d]) => d === digit).length;
    const cluesLeft = () => options.clues.reduce((sum, pair, digit) => sum + pair.length - usedFor(digit), 0);

    options.bar.innerHTML = `
      <div class="clue-bar">
        <span class="clue-countdown" aria-live="polite"></span>
        <button type="button" class="btn btn-small" data-role="get" disabled>💡 Get a clue</button>
        <button type="button" class="btn btn-ghost btn-small" data-role="list">📜 Clues (<span data-role="count">0</span>)</button>
      </div>`;
    const countdown = options.bar.querySelector('.clue-countdown');
    const getButton = options.bar.querySelector('[data-role="get"]');
    const listButton = options.bar.querySelector('[data-role="list"]');
    const countLabel = options.bar.querySelector('[data-role="count"]');

    function refresh() {
      countLabel.textContent = state.given.length;
      if (cluesLeft() === 0) {
        countdown.textContent = 'No clues left';
        getButton.disabled = true;
        return;
      }
      const left = state.readyAt - Date.now();
      if (left <= 0) {
        countdown.textContent = 'A clue is ready!';
        getButton.disabled = false;
        getButton.classList.add('ready');
      } else {
        const seconds = Math.ceil(left / 1000);
        countdown.textContent = `Next clue in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        getButton.disabled = true;
        getButton.classList.remove('ready');
      }
    }

    function showClue(digit, clueIndex) {
      options.openDialog(`
        <h3>💡 Clue for the ${options.digitLabels[digit]}</h3>
        <p class="verse">${options.clues[digit][clueIndex]}</p>`);
    }

    function pickDigit() {
      if (getButton.disabled) return;
      const body = options.openDialog(`
        <h3>💡 Which number do you want a clue for?</h3>
        <div class="clue-pick">
          ${options.clues.map((pair, digit) => {
            const used = usedFor(digit);
            return `<button type="button" class="btn" data-digit="${digit}" ${used >= pair.length ? 'disabled' : ''}>
              ${options.digitLabels[digit]}<small>${used >= pair.length ? 'no clues left' : `clue ${used + 1} of ${pair.length}`}</small></button>`;
          }).join('')}
        </div>`, [{ label: 'Cancel', onClick: options.closeDialog }]);
      body.querySelectorAll('[data-digit]').forEach(button => {
        button.addEventListener('click', () => {
          const digit = Number(button.dataset.digit);
          const clueIndex = usedFor(digit);
          if (clueIndex >= options.clues[digit].length) return;
          state.given.push([digit, clueIndex]);
          state.readyAt = Date.now() + minutesBeforeClue(state.given.length);
          save();
          refresh();
          showClue(digit, clueIndex);
        });
      });
    }

    function listClues() {
      const items = [];
      for (let digit = 0; digit < digitCount; digit++) {
        state.given.filter(([d]) => d === digit).forEach(([d, i]) => {
          items.push(`<li><b>${options.digitLabels[d]}, clue ${i + 1}:</b><br>${options.clues[d][i]}</li>`);
        });
      }
      options.openDialog(`
        <h3>📜 Your clues</h3>
        ${items.length ? `<ul class="clue-list">${items.join('')}</ul>`
          : '<p class="muted">No clues yet. When the countdown ends, press "Get a clue".</p>'}`);
    }

    getButton.addEventListener('click', event => { event.currentTarget.blur(); pickDigit(); });
    listButton.addEventListener('click', event => { event.currentTarget.blur(); listClues(); });

    refresh();
    const timer = setInterval(refresh, 1000);
    return {
      stop() { clearInterval(timer); },
      hide() { clearInterval(timer); options.bar.hidden = true; }
    };
  };

  /* A simple popup for screens that don't have their own (Stage 2). */
  Game.makeDialog = function (container) {
    container.insertAdjacentHTML('beforeend', `
      <div class="dialog" hidden>
        <div class="dlg-inner" role="dialog" aria-modal="true">
          <div class="dlg-body"></div>
          <div class="dlg-actions"></div>
        </div>
      </div>`);
    const dialog = container.lastElementChild;
    const body = dialog.querySelector('.dlg-body');
    const actions = dialog.querySelector('.dlg-actions');
    const close = () => { dialog.hidden = true; };
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    function open(html, buttons) {
      body.innerHTML = html;
      actions.innerHTML = '';
      (buttons || [{ label: 'Close', primary: true, onClick: close }]).forEach(info => {
        const button = document.createElement('button');
        button.className = 'btn' + (info.primary ? '' : ' btn-ghost');
        button.textContent = info.label;
        button.addEventListener('click', info.onClick);
        actions.appendChild(button);
      });
      dialog.hidden = false;
      return body;
    }
    return { open, close };
  };
})();
