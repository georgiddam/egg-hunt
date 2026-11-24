/*
 * stage-3-village.js — Stage 3: Eggsville, a small top-down game.
 *
 * The player starts at the beginning of a road, reads the sign, and visits three
 * houses and an animal paddock (drawn on a <canvas>). The places and what's in
 * them are in village-places.js; the drawing helpers are in village-art.js.
 * This file is the "engine": movement, walls, doors, popups, wandering
 * animals and the safe keypad (with picture hints under each digit).
 *
 * The safe needs 3 digits. They're checked against a fingerprint (see game.js),
 * so the answer isn't written anywhere.
 *
 * Coordinates: every place is 480 x 320 "pixels", drawn at 2x for sharper text.
 * The player's position is the top-left of their feet (a 16 x 12 box); that
 * box is what bumps into walls and furniture.
 */
(function () {
  'use strict';

  const WIDTH = 480;
  const HEIGHT = 320;
  const DRAW_SCALE = 2;
  const WALK_SPEED = 1.6;      // pixels per frame (at 60 frames per second)
  const FEET_WIDTH = 16;
  const FEET_HEIGHT = 12;

  const PLAYER_LOOK = { skin: '#f1c9a0', bald: true, shirt: '#b8322a', plaid: '#5e1612', pants: '#2c4a7a' };
  const PLAYER_WITH_AFRO = Object.assign({}, PLAYER_LOOK, { afro: true });   // after a visit to the barber

  // Picture hints shown under each digit of the safe: where to look for it.
  const SAFE_HINTS = [
    ['📚', '🤖', '🔢'],
    ['🥚', '🐣', '🔢'],
    ['🪞', '💇', '🔢']
  ];

  // Timed clues for the safe (see clue-timer.js): two per digit.
  const SAFE_CLUES = [
    ['Eight books stand upon the shelf,<br>but not all by the robot man himself.',
     'Count only the library books that Isaac Asimov wrote. Google the titles if you need to.'],
    ['Some were born and some were hatched;<br>count the ones whose shells were scratched.',
     'Count the animals in and around the paddock that hatched from an egg. One furry one counts too.'],
    ['The barber’s mirror tells no lies;<br>count what’s on top, and trust your eyes.',
     'Count the hairs on your head.']
  ];
  const SAFE_DIGIT_LABELS = SAFE_HINTS.map((pictures, i) => `${['1st', '2nd', '3rd'][i]} number ${pictures.slice(0, 2).join('')}`);

  // A rectangle is [x, y, width, height]. Do two rectangles overlap?
  function rectanglesOverlap(a, b) {
    return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] &&
           a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
  }

  /* ---- Choices, saved so a refresh doesn't lose them ------------------ */

  const STATE_KEY = 'egghunt-v2-village';

  function loadVillageState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      if (saved && typeof saved.flags === 'object') return saved;
    } catch (error) { /* storage blocked or empty */ }
    return { flags: {} };
  }

  function saveVillageState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) { /* ignore */ }
  }

  Game.stages.village = {
    mount(app) {
      const state = loadVillageState();

      app.innerHTML = `
        <section class="card">
          <div class="kicker">Stage 3 of 3</div>
          <h1>Eggsville</h1>
          <p class="muted small">
            <span class="desk-only">Move with <kbd>WASD</kbd> or the arrow keys. Press <kbd>E</kbd> or <kbd>Space</kbd> to interact.</span>
            <span class="touch-only">Use the arrows to walk and the E button to interact.</span>
          </p>
        </section>

        <div class="village-bar">
          <span class="place-name" id="placeName"></span>
          <div id="clueBar"></div>
        </div>

        <div class="game-wrap">
          <canvas id="villageCanvas" width="${WIDTH * DRAW_SCALE}" height="${HEIGHT * DRAW_SCALE}"
                  aria-label="Top-down view of the village"></canvas>
          <div class="prompt" id="prompt"></div>
        </div>

        <!-- On-screen controls for phones (hidden on computers by CSS) -->
        <div class="pad">
          <div class="dpad">
            <button data-direction="up" aria-label="Up">▲</button>
            <button data-direction="left" aria-label="Left">◀</button>
            <button data-direction="right" aria-label="Right">▶</button>
            <button data-direction="down" aria-label="Down">▼</button>
          </div>
          <button class="act" id="actionButton" aria-label="Interact">E</button>
        </div>

        <!-- Popup used for conversations, clues, the sign and the keypad -->
        <div class="dialog" id="dialog" hidden>
          <div class="dlg-inner" role="dialog" aria-modal="true">
            <div id="dialogBody"></div>
            <div class="dlg-actions" id="dialogButtons"></div>
          </div>
        </div>`;

      const canvas = app.querySelector('#villageCanvas');
      const ctx = canvas.getContext('2d');
      ctx.setTransform(DRAW_SCALE, 0, 0, DRAW_SCALE, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const paint = window.VillageArt(ctx);

      const promptBox = app.querySelector('#prompt');
      const placeName = app.querySelector('#placeName');
      const dialog = app.querySelector('#dialog');
      const dialogBody = app.querySelector('#dialogBody');
      const dialogButtons = app.querySelector('#dialogButtons');
      const random = Game.random(4242);

      /* ==================================================================
       * Popup dialog
       * ================================================================ */

      let dialogOpen = false;
      let keypad = null; // while the keypad is open: { press(key) }

      // `buttons` is a list of { label, primary, onClick }. Default: a single Close button.
      function openDialog(html, buttons) {
        dialogBody.innerHTML = html;
        dialogButtons.innerHTML = '';
        keypad = null;
        (buttons || [{ label: 'Close', primary: true, onClick: closeDialog }]).forEach(buttonInfo => {
          const button = document.createElement('button');
          button.className = 'btn' + (buttonInfo.primary ? '' : ' btn-ghost');
          button.textContent = buttonInfo.label;
          button.addEventListener('click', () => {
            button.blur(); // so a later Space press doesn't click it again
            buttonInfo.onClick();
          });
          dialogButtons.appendChild(button);
        });
        dialog.hidden = false;
        dialogOpen = true;
        releaseAllKeys();
        return dialogBody;
      }

      function closeDialog() {
        dialog.hidden = true;
        dialogOpen = false;
        keypad = null;
      }

      // Clicking the dark area around the popup closes it.
      dialog.addEventListener('click', event => {
        if (event.target === dialog) closeDialog();
      });

      /* ==================================================================
       * The sign at the start of the road: the rules, in a rhyme
       * ================================================================ */

      function showSign() {
        openDialog(`
          <h3>🪧 Nearly there!</h3>
          <p class="verse">
            You're nearly there, the finish is near,<br>
            just one last puzzle and then you're clear.<br>
            Three houses stand along this lane,<br>
            and one holds a safe with a lock and chain.<br>
            Under each number, three pictures show<br>
            the place to look and the thing to know.
          </p>
          <div class="rules">
            <span>🏠 3 houses</span><span>🔒 1 safe</span><span>🔢 3 numbers</span>
          </div>
          <p class="muted small center">The safe is in the Lodge. Poke at everything: there's lots to find.</p>`,
          [{ label: "Let's go", primary: true, onClick: closeDialog }]);
      }

      // The first popup: just how to play.
      function showTip() {
        openDialog(`
          <h3>👋 Welcome to Eggsville</h3>
          <p class="big-line">Walk up to things and press <kbd>E</kbd> to interact with them.
          That's how you find everything.</p>
          <p class="muted">Start with the sign next to you.</p>`,
          [{ label: 'Got it', primary: true, onClick: closeDialog }]);
      }

      /* ==================================================================
       * The safe (in the lodge)
       * ================================================================ */

      const limiter = Game.makeGuessLimiter();

      function openSafe() {
        if (Game.isSolved(2)) {
          openDialog(
            `<h3>🥚 The safe is open</h3>
             <p>Inside, something golden is waiting. The code was <span class="inline-code">${Game.escape(Game.progress.found[2])}</span>.</p>`,
            [{ label: 'Keep exploring', onClick: closeDialog }, { label: 'Take the golden egg →', primary: true, onClick: () => Game.nextStage() }]
          );
          return;
        }

        const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
        openDialog(`
          <h3>🔒 The safe</h3>
          <div class="kp-screen safe-cols" id="keypadScreen">
            ${SAFE_HINTS.map(pictures => `
              <div class="safe-col">
                <span class="slot"></span>
                ${pictures.map(picture => `<span class="pic">${picture}</span>`).join('')}
              </div>`).join('')}
          </div>
          <div class="kp-msg" id="keypadMessage"></div>
          <div class="kp-grid">${KEYS.map(key => `<button type="button" data-key="${key}">${key}</button>`).join('')}</div>`,
          [{ label: 'Close', onClick: closeDialog }]);

        const screen = dialogBody.querySelector('#keypadScreen');
        const message = dialogBody.querySelector('#keypadMessage');
        const WRONG_CODE_LINES = [
          'ACCESS DENIED.',
          'Wrong code. The safe says no.',
          'Nope. Check the pictures again.'
        ];
        let entered = '';
        let checking = false;
        let lockedUntil = 0;

        function showEntered() {
          [...screen.querySelectorAll('.slot')].forEach((box, i) => { box.textContent = entered[i] || ''; });
        }

        async function submit() {
          if (entered.length < 3) {
            message.textContent = 'Needs 3 digits.';
            return;
          }
          if (Date.now() < lockedUntil) {
            message.textContent = `The safe is on hold. Wait ${Math.ceil((lockedUntil - Date.now()) / 1000)} s.`;
            return;
          }
          checking = true;
          message.textContent = 'Checking…';
          const digits = entered;
          const correct = await Game.checkAnswer('village', digits);
          checking = false;
          if (!keypad) return; // the keypad was closed while checking

          if (correct) {
            limiter.right();
            unlockSafe(digits);
            return;
          }
          const wait = limiter.wrong();
          lockedUntil = Date.now() + wait * 1000;
          message.textContent = Game.pickRandom(WRONG_CODE_LINES) + (wait ? ` (Wait ${wait} s.)` : '');
          screen.classList.remove('shake');
          void screen.offsetWidth; // restart the shake animation
          screen.classList.add('shake');
          entered = '';
          showEntered();
        }

        keypad = {
          press(key) {
            if (checking) return;
            if (/^[0-9]$/.test(key)) {
              if (entered.length < 3) entered += key;
              message.textContent = '';
            } else if (key === '⌫' || key === 'Backspace') {
              entered = entered.slice(0, -1);
            } else if (key === 'OK' || key === 'Enter') {
              submit();
              return;
            }
            showEntered();
          }
        };

        dialogBody.querySelectorAll('.kp-grid button').forEach(button => {
          button.addEventListener('click', () => {
            button.blur();
            if (keypad) keypad.press(button.dataset.key);
          });
        });
      }

      function unlockSafe(digits) {
        Game.completePart(2, digits);
        Game.sound.chime();
        clueTimer.hide();
        state.flags.safeOpen = true;
        saveVillageState(state);
        openDialog(
          `<h3>✅ Click. The safe swings open.</h3>
           <p>The code is <span class="inline-code">${Game.escape(digits)}</span>. That's the last part.</p>
           <p>Inside, wrapped in straw, something golden is glowing.</p>`,
          [{ label: 'Keep exploring', onClick: closeDialog }, { label: 'Take the golden egg →', primary: true, onClick: () => Game.nextStage() }]
        );
      }

      /* ==================================================================
       * Places
       * ================================================================ */

      // What village-places.js is allowed to use.
      const api = {
        say: openDialog,
        close: closeDialog,
        showSign,
        sound: Game.sound,
        flags: state.flags,
        setFlag(name, value) {
          state.flags[name] = value === undefined ? true : value;
          saveVillageState(state);
        },
        openSafe
      };

      const places = window.VillagePlaces(api);
      const player = { x: 0, y: 0, facing: 'up', walking: false, walkTime: 0, look: PLAYER_LOOK };
      let place = null;
      let animals = [];
      let exitsArmed = false; // exits only work once you've stepped off them

      // Give each place's people their own conversation counter.
      Object.values(places).forEach(p => p.people.forEach(person => { person.lineIndex = 0; }));

      function makeAnimals(setup) {
        const area = setup.area;
        const list = [];
        setup.list.forEach(info => {
          if (info.fixed) {
            list.push(Object.assign({}, info, { x: info.fixed.x, y: info.fixed.y, speedX: 0, speedY: 0, timeUntilNewDirection: Infinity, facing: info.fixed.facing || 1 }));
            return;
          }
          let x, y, attempts = 0;
          do {
            x = area.left + random() * (area.right - area.left);
            y = area.top + random() * (area.bottom - area.top);
            attempts++;
          } while (attempts < 50 && list.some(other => Math.hypot(other.x - x, other.y - y) < 30));
          list.push(Object.assign({}, info, {
            x, y, speedX: 0, speedY: 0,
            timeUntilNewDirection: random() * 90,
            facing: random() < 0.5 ? 1 : -1
          }));
        });
        return list;
      }

      // Animals keep their positions while you're indoors.
      const animalsByPlace = {};

      function enterPlace(placeId, fromPlaceId) {
        place = places[placeId];
        const arrival = (place.arriveFrom && place.arriveFrom[fromPlaceId]) || place.arrive;
        player.x = arrival.x;
        player.y = arrival.y;
        player.facing = arrival.facing;
        exitsArmed = false;
        if (place.animals && !animalsByPlace[placeId]) animalsByPlace[placeId] = makeAnimals(place.animals);
        animals = animalsByPlace[placeId] || [];
        placeName.textContent = '📍 ' + place.title;
        thingInReach = null;
        promptBox.classList.remove('show');
      }

      /* ==================================================================
       * Interacting
       * ================================================================ */

      function talkTo(person) {
        const lineNumber = person.lineIndex % person.lines.length;
        const line = person.lines[lineNumber];
        person.lineIndex++;
        const text = typeof line === 'string' ? line : line.text;
        openDialog(`
          <div class="speaker">
            <div class="avatar" style="background:${person.avatarColour}">${person.name.slice(0, 2).toUpperCase()}</div>
            <div><div class="who">${person.name}</div><p>${text}</p></div>
          </div>
          <p class="muted small">(${person.lineIndex % person.lines.length === 0 ? 'That\'s everything. Talk again to hear it from the start.' : 'Talk again for more.'})</p>`);
      }

      // Everything you can interact with right now: things, people and animals.
      function interactiveThings() {
        const list = place.things.slice();
        place.people.forEach(person => list.push({
          area: [person.x - 2, person.y - 14, 20, 28],
          label: 'Talk to ' + person.name,
          person,
          action: () => (person.talk ? person.talk() : talkTo(person))
        }));
        animals.forEach(animal => list.push({
          area: [animal.x - 9, animal.y - 16, 18, 18],
          label: 'Look at the ' + animal.name,
          animal,
          action: () => {
            animal.inspected = true;
            place.inspectAnimal(animal);
          }
        }));
        return list;
      }

      // The closest interactive thing within reach of the player, or null.
      function findThingInReach() {
        const reach = [player.x - 12, player.y - 14, FEET_WIDTH + 24, FEET_HEIGHT + 26];
        const centreX = player.x + FEET_WIDTH / 2;
        const centreY = player.y + FEET_HEIGHT / 2;
        let closest = null;
        let closestDistance = Infinity;

        for (const thing of interactiveThings()) {
          if (!rectanglesOverlap(reach, thing.area)) continue;
          const [x, y, w, h] = thing.area;
          const nearestX = Math.max(x, Math.min(centreX, x + w));
          const nearestY = Math.max(y, Math.min(centreY, y + h));
          const distance = Math.hypot(nearestX - centreX, nearestY - centreY) - (thing.person || thing.animal ? 4 : 0);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = thing;
          }
        }
        return closest;
      }

      let thingInReach = null;

      function interact() {
        if (dialogOpen) {
          if (!keypad) closeDialog();
          return;
        }
        if (!thingInReach) return;

        // Make a person turn to face the player.
        if (thingInReach.person) {
          const person = thingInReach.person;
          const dx = player.x - person.x;
          const dy = player.y - person.y;
          person.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        }
        // An animal stops for a moment when you look at it.
        if (thingInReach.animal) {
          thingInReach.animal.speedX = 0;
          thingInReach.animal.speedY = 0;
          thingInReach.animal.timeUntilNewDirection = 120;
        }
        thingInReach.action();
      }

      /* ==================================================================
       * Keyboard and touch controls
       * ================================================================ */

      const heldDirections = { up: false, down: false, left: false, right: false };
      const KEY_TO_DIRECTION = {
        ArrowUp: 'up', KeyW: 'up',
        ArrowDown: 'down', KeyS: 'down',
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right'
      };

      function releaseAllKeys() {
        Object.keys(heldDirections).forEach(direction => { heldDirections[direction] = false; });
      }

      function onKeyDown(event) {
        if (event.target && /INPUT|TEXTAREA/.test(event.target.tagName)) return;

        // While the keypad is open, number keys, Backspace and Enter go to it.
        if (dialogOpen && keypad) {
          if (/^[0-9]$/.test(event.key) || event.key === 'Backspace' || event.key === 'Enter') {
            event.preventDefault();
            keypad.press(event.key);
            return;
          }
          if (event.key === 'Escape') {
            closeDialog();
            return;
          }
        }

        const direction = KEY_TO_DIRECTION[event.code];
        if (direction) {
          event.preventDefault(); // stop the arrow keys scrolling the page
          if (!dialogOpen) heldDirections[direction] = true;
          return;
        }

        if (event.code === 'KeyE' || event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          if (event.repeat) return;
          if (dialogOpen) {
            if (!keypad || event.code === 'KeyE') closeDialog();
          } else {
            interact();
          }
          return;
        }

        if (event.key === 'Escape' && dialogOpen) closeDialog();
      }

      function onKeyUp(event) {
        const direction = KEY_TO_DIRECTION[event.code];
        if (direction) heldDirections[direction] = false;
      }

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', releaseAllKeys); // don't keep walking if the window loses focus

      // Phone arrow buttons: walk while held down.
      app.querySelectorAll('.dpad button').forEach(button => {
        const direction = button.dataset.direction;
        const press = event => {
          event.preventDefault();
          if (!dialogOpen) heldDirections[direction] = true;
          button.classList.add('held');
          try { button.setPointerCapture(event.pointerId); } catch (error) { /* not supported */ }
        };
        const release = () => {
          heldDirections[direction] = false;
          button.classList.remove('held');
        };
        button.addEventListener('pointerdown', press);
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('lostpointercapture', release);
        button.addEventListener('contextmenu', event => event.preventDefault());
      });

      app.querySelector('#actionButton').addEventListener('click', event => {
        event.currentTarget.blur();
        interact();
      });

      /* ==================================================================
       * Movement, doors and animals (runs every frame)
       * ================================================================ */

      function isBlocked(x, y) {
        const feet = [x, y, FEET_WIDTH, FEET_HEIGHT];
        if (x < 0 || y < 0 || x + FEET_WIDTH > WIDTH || y + FEET_HEIGHT > HEIGHT) return true;
        if (place.solids.some(area => rectanglesOverlap(feet, area))) return true;
        return place.people.some(person => rectanglesOverlap(feet, [person.x, person.y, FEET_WIDTH, FEET_HEIGHT]));
      }

      function tryToMove(dx, dy) {
        if (!isBlocked(player.x + dx, player.y + dy)) {
          player.x += dx;
          player.y += dy;
        }
      }

      function checkExits() {
        const feet = [player.x, player.y, FEET_WIDTH, FEET_HEIGHT];
        const exit = place.exits.find(e => rectanglesOverlap(feet, e.area));
        if (!exit) {
          exitsArmed = true;
          return;
        }
        if (exitsArmed) enterPlace(exit.to, place.id);
      }

      function moveAnimals(frameFactor) {
        const area = place.animals && place.animals.area;
        if (!area) return;

        for (const hen of animals) {
          if (hen.fixed) continue;
          hen.timeUntilNewDirection -= frameFactor;
          if (hen.timeUntilNewDirection <= 0) {
            if (random() < 0.3) {
              hen.speedX = 0;
              hen.speedY = 0;
            } else {
              const angle = random() * Math.PI * 2;
              const speed = 0.3 + random() * 0.45;
              hen.speedX = Math.cos(angle) * speed;
              hen.speedY = Math.sin(angle) * speed;
            }
            hen.timeUntilNewDirection = 40 + random() * 120;
          }

          hen.x += hen.speedX * frameFactor;
          hen.y += hen.speedY * frameFactor;

          // Bounce off the edges of their area.
          if (hen.x < area.left) { hen.x = area.left; hen.speedX = Math.abs(hen.speedX); }
          if (hen.x > area.right) { hen.x = area.right; hen.speedX = -Math.abs(hen.speedX); }
          if (hen.y < area.top) { hen.y = area.top; hen.speedY = Math.abs(hen.speedY); }
          if (hen.y > area.bottom) { hen.y = area.bottom; hen.speedY = -Math.abs(hen.speedY); }

          if (hen.speedX > 0.05) hen.facing = 1;
          else if (hen.speedX < -0.05) hen.facing = -1;
        }

        // Gently push animals apart so they never stack on top of each other.
        for (let i = 0; i < animals.length; i++) {
          for (let j = i + 1; j < animals.length; j++) {
            const a = animals[i];
            const b = animals[j];
            if (a.fixed || b.fixed) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 0 && distance < 18) {
              const push = (18 - distance) * 0.25;
              a.x -= dx / distance * push;
              a.y -= dy / distance * push;
              b.x += dx / distance * push;
              b.y += dy / distance * push;
            }
          }
        }
      }

      // `frameFactor` is 1 at 60 fps, 0.5 at 120 fps, so speed is the same on every screen.
      function update(frameFactor) {
        let dx = (heldDirections.right ? 1 : 0) - (heldDirections.left ? 1 : 0);
        let dy = (heldDirections.down ? 1 : 0) - (heldDirections.up ? 1 : 0);

        if (!dialogOpen && (dx || dy)) {
          const length = Math.hypot(dx, dy); // so diagonal walking isn't faster
          dx /= length;
          dy /= length;
          const step = WALK_SPEED * frameFactor;
          tryToMove(dx * step, 0); // move each direction separately so you slide along walls
          tryToMove(0, dy * step);
          player.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          player.walking = true;
          player.walkTime += frameFactor;
        } else {
          player.walking = false;
        }

        checkExits();
        if (!dialogOpen) moveAnimals(frameFactor);

        // "Press E to ..." prompt
        const nearest = dialogOpen ? null : findThingInReach();
        const label = nearest ? nearest.label : '';
        if (label !== (thingInReach ? thingInReach.label : '')) {
          if (nearest) {
            promptBox.innerHTML = '<b>E</b>' + nearest.label;
            promptBox.classList.add('show');
          } else {
            promptBox.classList.remove('show');
          }
        }
        thingInReach = nearest;
      }

      /* ==================================================================
       * Drawing
       * ================================================================ */

      function draw(frame) {
        place.draw(paint, frame);
        player.look = state.flags.afro ? PLAYER_WITH_AFRO : PLAYER_LOOK;

        // Draw everyone, further down the screen last, so they appear in front.
        const characters = place.people.map(person => ({ y: person.y + FEET_HEIGHT, draw: () => paint.person(person, frame) }))
          .concat(animals.map(animal => ({ y: animal.y, draw: () => paint.animal(animal) })))
          .concat([{ y: player.y + FEET_HEIGHT, draw: () => paint.person(player, frame) }]);
        characters.sort((a, b) => a.y - b.y).forEach(character => character.draw());

        place.people.forEach(person => paint.label(person.plainName, person.x + 8, person.y - 19));
        animals.forEach(animal => { if (animal.inspected) paint.tick(animal.x - 3, animal.y - 26); });

        // Door labels outside
        if (place.id === 'outside') {
          place.exits.forEach(exit => paint.rect(exit.area[0] + 6, exit.area[1] + 6, 8, 2, '#f5b301'));
        }

        // A small bobbing marker above whoever you can talk to.
        if (thingInReach && thingInReach.person) {
          paint.marker(thingInReach.person.x + 6, thingInReach.person.y - 36, frame);
        }
      }

      /* ==================================================================
       * Game loop: update and draw about 60 times a second
       * ================================================================ */

      let animationId = 0;
      let lastTime = performance.now();
      let frame = 0;
      let running = true;

      function gameLoop(now) {
        if (!running) return;
        const frameFactor = Math.min(3, (now - lastTime) / 16.67);
        lastTime = now;
        frame++;
        update(frameFactor);
        draw(frame);
        animationId = requestAnimationFrame(gameLoop);
      }

      enterPlace('outside');
      animationId = requestAnimationFrame(gameLoop);

      const clueTimer = Game.makeClueTimer({
        id: 'village',
        clues: SAFE_CLUES,
        digitLabels: SAFE_DIGIT_LABELS,
        bar: app.querySelector('#clueBar'),
        openDialog,
        closeDialog
      });
      if (Game.isSolved(2)) clueTimer.hide();

      // Called when leaving this stage: stop the loop and remove keyboard listeners.
      this.stop = () => {
        running = false;
        cancelAnimationFrame(animationId);
        clueTimer.stop();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', releaseAllKeys);
      };

      // The first time: a tip on how to play. The rules are on the sign.
      if (!state.flags.greeted) {
        api.setFlag('greeted');
        setTimeout(() => {
          if (running && !dialogOpen) showTip();
        }, 500);
      }
    },

    unmount() {
      if (this.stop) this.stop();
    }
  };
})();
