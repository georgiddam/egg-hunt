/*
 * village-places.js — the places in Stage 3 (Eggsville) and everything in them.
 *
 *   outside   the road, a sign with the rules, three houses and the animal paddock
 *   library   a bookshelf and a robot librarian          -> 1st digit
 *   (paddock) animals wandering outside                  -> 2nd digit
 *   barber    a mirror                                   -> 3rd digit
 *   lodge     the safe, with picture hints for each digit
 *
 * The digits are NOT written here. They come from working things out
 * (see the private ANSWERS.md).
 *
 * Each place has:
 *   title     shown above the game
 *   solids    rectangles [x, y, width, height] you can't walk through
 *   things    what you can inspect: { area, label, action }
 *   people    who you can talk to: lines are said in order, then repeat
 *   animals   (outside only) the animals and the area they wander in
 *   exits     walking into `area` takes you to place `to`
 *   arrive    where you stand when you come in
 *   draw      paints the place (people and animals are drawn by the engine)
 */
(function () {
  'use strict';

  // Walls of every indoor room, with a doorway at the bottom middle.
  const ROOM_WALLS = [[0, 0, 480, 40], [0, 0, 32, 320], [448, 0, 32, 320], [0, 288, 224, 32], [256, 288, 224, 32]];
  const ROOM_EXIT_AREA = [224, 306, 32, 14];
  const ROOM_ARRIVE = { x: 232, y: 262, facing: 'up' };

  const LOOKS = {
    robot: { robot: true },
    barber: { skin: '#e9be98', hair: '#2b2b2b', shirt: '#f4f1ea', pants: '#2b2b33', glasses: true }
  };

  // The bookshelf in the library: [title, spine colour]. No authors, on purpose.
  const BOOKS = [
    ['Dune', '#c98a3a'],
    ['Foundation', '#2e4f7a'],
    ['Home Brewing for Beginners', '#8a6d1d'],
    ['The Hobbit', '#2f6b3a'],
    ['I, Robot', '#6d7883'],
    ['Fishing the Lakes of NZ', '#2b5e5e'],
    ['The Caves of Steel', '#5b3a7a'],
    ['The Martian', '#a0522d']
  ];

  window.VillagePlaces = function buildPlaces(api) {
    const n = Game.names;        // the player's name, already safe for HTML
    const say = api.say;

    /* ======================================================================
     * OUTSIDE: the road, the sign, three houses and the paddock
     * =================================================================== */

    const grassRandom = Game.random(9001);
    const grassTufts = [];
    for (let i = 0; i < 140; i++) grassTufts.push([8 + grassRandom() * 464, 8 + grassRandom() * 304, grassRandom() < 0.5 ? '#4f8a3a' : '#3f7a30']);
    const flowers = [];
    for (let i = 0; i < 40; i++) flowers.push([8 + grassRandom() * 464, 8 + grassRandom() * 304, ['#ff6b8a', '#fff', '#ffd93b', '#b07aff'][i % 4]]);

    // A house seen from the front: roof, wall, door, windows and a name.
    function house(paint, x, y, width, height, wall, roof, name) {
      const doorX = x + width / 2 - 10;
      paint.rect(x - 4, y, width + 8, 26, roof);
      paint.rect(x - 4, y + 22, width + 8, 4, 'rgba(0,0,0,.25)');
      for (let rx = x; rx < x + width; rx += 12) paint.rect(rx, y + 4, 1, 18, 'rgba(0,0,0,.15)');
      paint.rect(x, y + 26, width, height - 26, wall);
      for (let wy = y + 32; wy < y + height; wy += 8) paint.rect(x, wy, width, 1, 'rgba(0,0,0,.18)');
      paint.rect(doorX, y + height - 24, 20, 24, '#2a160a');
      paint.rect(doorX + 2, y + height - 22, 16, 22, '#5a3418');
      paint.rect(doorX + 14, y + height - 12, 2, 2, '#c9a24d');
      paint.rect(x + 8, y + 34, 16, 12, '#ffd27a');
      paint.rect(x + width - 24, y + 34, 16, 12, '#ffd27a');
      paint.label(name, x + width / 2, y + 16, '#fff3d6', 7);
    }

    function tree(paint, x, y) {
      paint.rect(x + 6, y + 14, 4, 8, '#5a3a1a');
      paint.rect(x, y + 4, 16, 12, '#2f6b2a');
      paint.rect(x + 3, y, 10, 6, '#3f8a38');
    }

    // The animals in the paddock. `kind` picks the drawing in village-art.js.
    const ANIMAL_LINES = {
      hen: '🐔 A hen. She gives you a look that says "eggs are extra".',
      duck: '🦆 A duck. Quack. That\'s all you\'re getting.',
      goose: '🪿 A goose. It honks at you. You leave it alone.',
      turtle: '🐢 A turtle. It\'s been walking to the fence since Tuesday.',
      platypus: '🦫 A platypus! Duck bill, beaver tail, otter feet. Nature\'s group project.',
      sheep: '🐑 A sheep. Her ear tag says "Butcher: Tuesday".',
      cow: '🐄 A cow. Moo.',
      pig: '🐖 A pig, rolling in something you hope is mud.',
      dog: '🐕 A farm dog. Very good boy. Counts sheep for fun.'
    };

    const outside = {
      id: 'outside',
      title: 'Eggsville',
      solids: [
        [0, 0, 480, 6], [0, 0, 6, 320], [474, 0, 6, 320], [0, 314, 480, 6],   // edges of the map
        [90, 70, 100, 70],    // library
        [220, 70, 90, 70],    // barber
        [340, 70, 120, 70],   // lodge
        [30, 178, 26, 10],    // the sign
        [100, 234, 130, 4], [254, 234, 126, 4], [100, 234, 4, 74], [376, 234, 4, 74], [100, 304, 280, 4],   // paddock fence
        [16, 20, 56, 30]      // pond
      ],
      things: [
        { area: [26, 164, 34, 26], label: 'Read the sign', action: () => api.showSign() },
        { area: [16, 16, 56, 38], label: 'Go fishing', action: () => say(`
            <h3>🎣 The pond</h3>
            <p>Nothing's biting. The river fish is still on the bucket list.</p>`) }
      ],
      people: [],
      animals: {
        area: { left: 116, right: 364, top: 254, bottom: 298 },
        list: ['hen', 'sheep', 'duck', 'cow', 'platypus', 'pig', 'goose', 'dog', 'turtle']
          .map(kind => ({ kind, name: kind }))
      },
      inspectAnimal(animal) {
        say(`<p class="big-line">${ANIMAL_LINES[animal.kind]}</p>`);
      },
      exits: [
        { area: [130, 138, 20, 8], to: 'library' },
        { area: [255, 138, 20, 8], to: 'barber' },
        { area: [390, 138, 20, 8], to: 'lodge' }
      ],
      arrive: { x: 10, y: 204, facing: 'right' },
      arriveFrom: {
        library: { x: 132, y: 150, facing: 'down' },
        barber: { x: 257, y: 150, facing: 'down' },
        lodge: { x: 392, y: 150, facing: 'down' }
      },
      draw(paint, frame) {
        paint.rect(0, 0, 480, 320, '#5a9a44');
        grassTufts.forEach(([x, y, colour]) => paint.rect(x, y, 3, 2, colour));
        flowers.forEach(([x, y, colour]) => paint.rect(x, y, 2, 2, colour));
        // The road, and paths up to each door
        paint.rect(0, 196, 480, 28, '#b8955a');
        for (let x = 6; x < 480; x += 24) paint.rect(x, 209, 10, 2, '#d8b87a');
        [130, 255, 390].forEach(x => paint.rect(x, 140, 20, 58, '#b8955a'));

        house(paint, 90, 70, 100, 70, '#8a7a9a', '#3a3050', 'LIBRARY');
        house(paint, 220, 70, 90, 70, '#e8e2d4', '#3a5a8a', 'BARBER');
        house(paint, 340, 70, 120, 70, '#7a4a28', '#4a2a14', 'LODGE');
        // Barber pole, with moving stripes
        paint.rect(300, 100, 6, 34, '#fff');
        for (let i = 0; i < 4; i++) paint.rect(300, 100 + ((i * 9 + Math.floor(frame / 8)) % 34), 6, 3, '#d23030');
        paint.rect(299, 98, 8, 3, '#c9a24d');
        // A padlock over the lodge door: the safe is in here
        paint.rect(396, 116, 8, 6, '#c9a24d');
        paint.rect(398, 112, 4, 5, '#8a6a20');

        // The sign at the start of the road
        paint.rect(36, 184, 3, 12, '#5a3a1a');
        paint.rect(48, 184, 3, 12, '#5a3a1a');
        paint.rect(28, 166, 30, 20, '#c79a5b');
        paint.rect(30, 168, 26, 16, '#e2c08a');
        paint.rect(34, 172, 18, 1, '#8a6a3a');
        paint.rect(34, 176, 14, 1, '#8a6a3a');
        paint.rect(34, 180, 16, 1, '#8a6a3a');

        // Pond
        paint.rect(16, 20, 56, 30, '#3a78b8');
        paint.rect(20, 24, 48, 22, '#4a8ac8');
        paint.rect(30, 30, 6, 1, '#9fd0ff');
        paint.rect(48, 38, 6, 1, '#9fd0ff');

        // Paddock: fence with a gap at the top to walk in
        paint.rect(104, 238, 272, 66, '#6aa84f');
        const fence = '#c79a5b';
        paint.rect(100, 234, 130, 4, fence);
        paint.rect(254, 234, 126, 4, fence);
        paint.rect(100, 234, 4, 74, fence);
        paint.rect(376, 234, 4, 74, fence);
        paint.rect(100, 304, 280, 4, fence);
        for (let x = 100; x <= 376; x += 23) {
          if (x > 226 && x < 254) continue;
          paint.rect(x, 230, 4, 8, '#8a5a34');
        }
        paint.label('PADDOCK', 240, 316, '#fff3d6', 5);

        tree(paint, 200, 16);
        tree(paint, 440, 20);
        tree(paint, 20, 270);
        tree(paint, 420, 270);
        tree(paint, 440, 236);
      }
    };

    /* ======================================================================
     * LIBRARY: one bookshelf and a robot librarian
     * =================================================================== */

    const SHELF_X = 168;
    const library = {
      id: 'library',
      title: 'The Library',
      solids: ROOM_WALLS.concat([
        [SHELF_X - 8, 40, 160, 30],   // bookshelf
        [70, 180, 60, 22]             // reading table
      ]),
      things: [
        { area: [SHELF_X - 8, 40, 160, 34], label: 'Look at the bookshelf', action: () => say(`
            <h3>📚 The bookshelf</h3>
            <div class="shelf">${BOOKS.map(([title, colour]) =>
              `<span class="book" style="background:${colour}">${Game.escape(title)}</span>`).join('')}</div>`) },
        { area: [70, 176, 60, 28], label: 'Read the open book', action: () => say(`
            <p class="big-line">📖 "Pâté de Foie Gras", open at the goose with the golden eggs.
            A bookmark says: <i>"Short read." — ${n.player}</i></p>`) }
      ],
      people: [
        {
          id: 'robot', name: 'Librarian', plainName: 'LIBRARIAN', x: 360, y: 110, facing: 'left', look: LOOKS.robot, avatarColour: '#7d8893',
          lines: [
            'GREETINGS, HUMAN. Not every book on my shelf is by Dr Asimov. I find that upsetting.',
            '"Violence is the last refuge of the incompetent." That\'s from <i>Foundation</i>. Remember it next time you go hunting.',
            'FACT: Dr Asimov wrote or edited more than 500 books. I have read all of them. Twice.'
          ]
        }
      ],
      exits: [{ area: ROOM_EXIT_AREA, to: 'outside' }],
      arrive: ROOM_ARRIVE,
      draw(paint) {
        paint.planks('#6a4a3a', '#735040', '#4e3428');
        paint.walls('#4a3a5a', '#54446a', '#3a2e48', '#221a2c');
        // The bookshelf, with the same books as the popup
        paint.rect(SHELF_X - 8, 6, 160, 64, '#3d2410');
        paint.rect(SHELF_X - 4, 10, 152, 56, '#22140a');
        BOOKS.forEach(([title, colour], i) => {
          const tall = 34 + (i * 7) % 12;
          paint.rect(SHELF_X + i * 18, 62 - tall, 14, tall, colour);
          paint.rect(SHELF_X + i * 18 + 2, 62 - tall + 4, 10, 2, 'rgba(255,255,255,.35)');
        });
        paint.rect(SHELF_X - 4, 62, 152, 4, '#5b371a');
        paint.rug(150, 120, 180, 110, '#2e3f6e', '#3d5290', '#f5d76e');
        // Reading table with an open book
        paint.desk(70, 180, 60, 22);
        paint.rect(90, 182, 9, 8, '#f4ecd8');
        paint.rect(100, 182, 9, 8, '#efe6d4');
        paint.rect(99, 182, 1, 8, '#9a8a6a');
        paint.plant(410, 250);
        paint.plant(46, 250);
      }
    };

    /* ======================================================================
     * BARBER: a chair, a barber and a mirror
     * =================================================================== */

    const MIRROR_SVG = `
      <svg class="mirror" viewBox="0 0 200 220" role="img" aria-label="Your reflection in the mirror">
        <ellipse cx="100" cy="110" rx="92" ry="104" fill="#c9a24d"/>
        <ellipse cx="100" cy="110" rx="82" ry="94" fill="#dff1fb"/>
        <rect x="62" y="150" width="76" height="60" rx="24" fill="#b8322a"/>
        <path d="M62 170 h76 M62 190 h76 M86 150 v60 M114 150 v60" stroke="#5e1612" stroke-width="3"/>
        <ellipse cx="54" cy="104" rx="9" ry="14" fill="#efc39b"/>
        <ellipse cx="146" cy="104" rx="9" ry="14" fill="#efc39b"/>
        <ellipse cx="100" cy="96" rx="46" ry="56" fill="#f1c9a0"/>
        <ellipse cx="82" cy="58" rx="16" ry="8" fill="#fff" opacity=".75" transform="rotate(-20 82 58)"/>
        <circle cx="84" cy="100" r="5" fill="#1b1b1b"/><circle cx="116" cy="100" r="5" fill="#1b1b1b"/>
        <path d="M84 126 q16 12 32 0" stroke="#7a3a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M30 40 l8 8 M38 40 l-8 8 M160 160 l6 6 M166 160 l-6 6" stroke="#fff" stroke-width="3"/>
      </svg>`;

    const barber = {
      id: 'barber',
      title: 'The Barber',
      solids: ROOM_WALLS.concat([
        [200, 40, 80, 24],    // mirror and counter
        [224, 100, 32, 30]    // barber chair
      ]),
      things: [
        { area: [196, 40, 88, 28], label: 'Look in the mirror', action: () => say(`
            ${MIRROR_SVG}
            <p class="big-line center">Count the hairs. Take your time.</p>`) },
        { area: [380, 40, 40, 30], label: 'Read the price list', action: () => say(`
            <h3>💈 Price list</h3>
            <p>Haircut ... $30<br>Beard trim ... $15<br>Polish ... free</p>`) }
      ],
      people: [
        {
          id: 'barber', name: 'Barber', plainName: 'BARBER', x: 290, y: 140, facing: 'left', look: LOOKS.barber, avatarColour: '#3a5a8a',
          lines: [
            'Take a seat! So, what are we doing today... ah.',
            "Tell you what, I'll give it a quick polish. On the house."
          ]
        }
      ],
      exits: [{ area: ROOM_EXIT_AREA, to: 'outside' }],
      arrive: ROOM_ARRIVE,
      draw(paint) {
        paint.tiles('#e8e2d4', '#cfc8b8');
        paint.walls('#3a5a8a', '#46689a', '#2e4a72', '#1a2a44');
        // Mirror over a counter
        paint.rect(204, 4, 72, 34, '#c9a24d');
        paint.rect(208, 8, 64, 26, '#bfe6ff');
        paint.rect(214, 12, 10, 3, '#ffffff');
        paint.rect(200, 40, 80, 20, '#6b4423');
        paint.rect(200, 40, 80, 4, '#83552c');
        paint.rect(212, 44, 6, 10, '#3fa35c');   // tonic bottles
        paint.rect(222, 46, 5, 8, '#c8302a');
        paint.rect(258, 46, 12, 3, '#9aa6b2');   // scissors and comb
        // Barber chair
        paint.rect(226, 100, 28, 26, '#c8302a');
        paint.rect(230, 104, 20, 14, '#e04a40');
        paint.rect(236, 126, 8, 8, '#9aa6b2');
        // Price list
        paint.paper(384, 6, 32, 28);
        paint.plant(46, 250);
        paint.plant(410, 250);
      }
    };

    /* ======================================================================
     * LODGE: the safe and the brew fridge
     * =================================================================== */

    const lodge = {
      id: 'lodge',
      title: 'The Lodge',
      solids: ROOM_WALLS.concat([
        [32, 140, 26, 60],    // fireplace
        [208, 40, 64, 34],    // safe
        [380, 40, 26, 32],    // brew fridge
        [64, 206, 24, 22]     // armchair
      ]),
      things: [
        { area: [204, 40, 72, 38], label: 'Open the safe', action: () => api.openSafe() },
        { area: [376, 40, 34, 36], label: 'Open the brew fridge', action: () => say(`
            <p class="big-line">🍺 Your home brew, nicely chilled. Strictly for after the code.</p>`) }
      ],
      people: [],
      exits: [{ area: ROOM_EXIT_AREA, to: 'outside' }],
      arrive: ROOM_ARRIVE,
      draw(paint, frame) {
        paint.planks('#8a5a34', '#946139', '#6e4527');
        paint.walls('#5d3b1f', '#6b4524', '#4a2e17', '#2f1c0d');
        paint.window(90, 4);
        paint.window(330, 4);
        paint.rug(150, 132, 180, 90, '#6e1f1f', '#9c3232', '#e2a400');
        // Fireplace
        paint.rect(32, 140, 26, 60, '#6f6f75');
        paint.rect(36, 154, 18, 34, '#1a1010');
        const flicker = Math.floor(frame / 6) % 3;
        paint.rect(39, 172 - flicker, 12, 14 + flicker, '#e2581a');
        paint.rect(42, 176 - flicker * 2, 7, 10 + flicker * 2, '#ffb02e');
        // Armchair
        paint.rect(64, 206, 24, 22, '#3d6b4a');
        paint.rect(66, 208, 20, 14, '#4f8a5c');
        // The safe: big, with a blinking light
        paint.rect(208, 40, 64, 34, '#4a4f58');
        paint.rect(211, 43, 58, 28, '#5c626c');
        paint.rect(232, 49, 16, 16, '#2b2f36');
        paint.rect(239, 56, 2, 2, '#c9a24d');
        paint.rect(262, 46, 4, 3, api.flags.safeOpen ? '#3fe05a' : (frame % 60 < 30 ? '#ff4040' : '#992020'));
        // Brew fridge
        paint.rect(380, 40, 26, 32, '#d8dde2');
        paint.rect(382, 42, 22, 28, '#c0c6cc');
        paint.rect(400, 48, 2, 8, '#6a7078');
        paint.rect(385, 45, 7, 3, '#e2a400');
      }
    };

    return { outside, library, barber, lodge };
  };
})();
