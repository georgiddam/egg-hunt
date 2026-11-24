/*
 * village-art.js — pixel-art drawing helpers for Stage 3 (Eggsville).
 *
 * VillageArt(ctx) returns a "painter": a set of small functions that draw
 * rectangles, walls, furniture, people, hens and a robot onto the canvas.
 * Every place in village-places.js draws itself with these.
 *
 * All sizes are in room pixels: each room is 480 x 320.
 */
(function () {
  'use strict';

  window.VillageArt = function makePainter(ctx) {
    const paint = {};

    // The basic building block: a filled rectangle.
    paint.rect = function (x, y, width, height, colour) {
      ctx.fillStyle = colour;
      ctx.fillRect(Math.round(x), Math.round(y), width, height);
    };
    const rect = paint.rect;

    // Small pixel text with a dark outline. Uses fillText, so it's never run as HTML.
    paint.label = function (text, x, y, colour, size) {
      ctx.font = (size || 6) + 'px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1a0f06';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = colour || '#fff3d6';
      ctx.fillText(text, x, y);
    };

    /* ---- Rooms --------------------------------------------------------- */

    // Floor boards across the inside of a room.
    paint.planks = function (colourA, colourB, lineColour) {
      for (let y = 40, row = 0; y < 288; y += 12, row++) {
        rect(32, y, 416, 12, row % 2 ? colourA : colourB);
        for (let x = 32 + (row * 37) % 60; x < 448; x += 60) rect(x, y, 1, 12, lineColour);
        rect(32, y + 11, 416, 1, lineColour);
      }
    };

    // Floor tiles (for the office).
    paint.tiles = function (colourA, colourB) {
      for (let y = 40; y < 288; y += 16) {
        for (let x = 32; x < 448; x += 16) {
          rect(x, y, 16, 16, ((x + y) / 16) % 2 ? colourA : colourB);
        }
      }
    };

    // Top wall, side walls and a bottom wall with an open doorway in the middle.
    paint.walls = function (topA, topB, side, dark) {
      for (let y = 0; y < 40; y += 8) rect(0, y, 480, 8, (y / 8) % 2 ? topA : topB);
      rect(0, 38, 480, 2, dark);
      rect(0, 0, 32, 320, side);
      rect(448, 0, 32, 320, side);
      rect(30, 40, 2, 248, dark);
      rect(448, 40, 2, 248, dark);
      rect(0, 288, 480, 32, side);
      rect(32, 288, 416, 2, dark);
      // Doorway to the outside, with a mat
      rect(224, 288, 32, 32, '#16261a');
      rect(228, 300, 1, 1, '#fff');
      rect(246, 306, 1, 1, '#fff');
      rect(226, 280, 28, 8, '#7a2f2f');
      rect(228, 282, 24, 4, '#9c4040');
    };

    // A window showing the night sky.
    paint.window = function (x, y) {
      rect(x, y, 40, 30, '#3a2412');
      rect(x + 3, y + 3, 34, 24, '#1b2a4a');
      [[6, 6], [12, 14], [26, 8], [30, 16], [18, 5]].forEach(([sx, sy]) => rect(x + sx, y + sy, 1, 1, '#fff'));
      rect(x + 22, y + 5, 5, 5, '#f4efcf');
      rect(x + 3, y + 20, 34, 7, '#20432a');
      rect(x + 19, y + 3, 2, 24, '#3a2412');
      rect(x + 3, y + 14, 34, 2, '#3a2412');
    };

    // Random-looking (but always the same) books for a shelf.
    paint.makeBooks = function (x, y, width, height, seed) {
      const random = Game.random(seed);
      const COLOURS = ['#7a2e2e', '#2e4f7a', '#2f6b3a', '#8a6d1d', '#5b3a7a', '#a0522d', '#cdb57d', '#2b5e5e'];
      const books = [];
      const shelfCount = Math.max(1, Math.floor((height - 8) / 20));
      for (let s = 0; s < shelfCount; s++) {
        const bottom = y + 4 + (s + 1) * 20 - 2;
        let bx = x + 4;
        while (bx < x + width - 6) {
          const bw = 3 + Math.floor(random() * 4);
          const bh = 10 + Math.floor(random() * 6);
          if (bx + bw > x + width - 4) break;
          books.push([bx, bottom - bh, bw - 1, bh, COLOURS[Math.floor(random() * COLOURS.length)]]);
          bx += bw;
        }
      }
      return { x, y, width, height, shelfCount, books };
    };

    paint.bookshelf = function (shelf) {
      rect(shelf.x, shelf.y, shelf.width, shelf.height, '#3d2410');
      rect(shelf.x + 4, shelf.y + 4, shelf.width - 8, shelf.height - 8, '#22140a');
      shelf.books.forEach(([x, y, w, h, colour]) => rect(x, y, w, h, colour));
      for (let s = 0; s < shelf.shelfCount; s++) {
        rect(shelf.x + 4, shelf.y + 4 + (s + 1) * 20 - 2, shelf.width - 8, 3, '#5b371a');
      }
    };

    paint.desk = function (x, y, width, height) {
      rect(x, y, width, height, '#6b4423');
      rect(x, y, width, 4, '#83552c');
      rect(x + 2, y + height, 4, 4, '#4a2e17');
      rect(x + width - 6, y + height, 4, 4, '#4a2e17');
    };

    paint.monitor = function (x, y, screenColour, frame) {
      rect(x, y, 26, 18, '#111');
      rect(x + 2, y + 2, 22, 13, frame % 140 < 136 ? screenColour : '#ffffff');
      rect(x + 10, y + 18, 6, 3, '#222');
      rect(x + 6, y + 21, 14, 2, '#333');
    };

    paint.rug = function (x, y, width, height, outer, inner, trim) {
      rect(x, y, width, height, outer);
      rect(x + 4, y + 4, width - 8, height - 8, inner);
      for (let tx = x + 8; tx < x + width - 8; tx += 8) {
        rect(tx, y + 7, 4, 2, trim);
        rect(tx, y + height - 9, 4, 2, trim);
      }
    };

    // A pot plant. `growth` (0 to 4) makes it taller and bushier; at 4 it flowers.
    paint.plant = function (x, y, growth) {
      const g = growth || 0;
      rect(x + 2, y + 10, 10, 8, '#a0522d');
      rect(x + 1, y + 9, 12, 2, '#8a4423');
      rect(x - g, y, 14 + g * 2, 10, '#2f8a4c');
      for (let i = 0; i <= g; i++) {
        rect(x + 3 - i, y - 4 - i * 5, 8 + i * 2, 6, i % 2 ? '#2f8a4c' : '#3fa35c');
      }
      if (g >= 4) {
        [[x - 2, y - 14], [x + 13, y - 10], [x + 5, y - 26], [x + 1, y - 2]].forEach(([fx, fy]) => {
          rect(fx, fy, 3, 3, '#ff6b8a');
          rect(fx + 1, fy + 1, 1, 1, '#ffd93b');
        });
      }
    };

    // A sheet of paper pinned to a wall, with a few lines of "writing".
    paint.paper = function (x, y, width, height, colour) {
      rect(x, y, width, height, colour || '#f4ecd8');
      for (let ly = y + 4; ly < y + height - 2; ly += 4) rect(x + 3, ly, width - 6, 1, '#9a8a6a');
      rect(x + width / 2 - 1, y + 1, 2, 2, '#c8302a');
    };

    // Little gold "!" above something worth looking at, bobbing up and down.
    paint.marker = function (x, y, frame) {
      const bob = Math.floor(frame / 15) % 2;
      rect(x, y - bob, 4, 4, '#f5b301');
    };

    // A green tick above a hen that has been inspected.
    paint.tick = function (x, y) {
      rect(x, y + 2, 2, 2, '#3fe05a');
      rect(x + 2, y + 3, 2, 2, '#3fe05a');
      rect(x + 4, y + 1, 2, 2, '#3fe05a');
      rect(x + 6, y - 1, 2, 2, '#3fe05a');
    };

    /* ---- Characters ---------------------------------------------------- */

    // A person. `person.x, person.y` is the top-left of their feet (16 x 12).
    paint.person = function (person, frame) {
      if (person.look.robot) return paint.robot(person, frame);
      const look = person.look;
      const left = Math.round(person.x);
      const top = Math.round(person.y + 12 - 27);   // sprite is 27 pixels tall
      const feetY = Math.round(person.y + 12);
      const stepFrame = person.walking ? Math.floor(person.walkTime / 7) % 2 : -1;

      rect(left + 1, feetY - 2, 14, 3, 'rgba(0,0,0,.25)');                        // shadow
      rect(left + 4, top + 21 - (stepFrame === 0 ? 1 : 0), 3, 6, look.pants);    // legs
      rect(left + 9, top + 21 - (stepFrame === 1 ? 1 : 0), 3, 6, look.pants);
      rect(left + 3, top + 12, 10, 10, look.shirt);                               // body
      if (look.plaid) {
        rect(left + 3, top + 15, 10, 1, look.plaid);
        rect(left + 3, top + 19, 10, 1, look.plaid);
        rect(left + 6, top + 12, 1, 10, look.plaid);
        rect(left + 10, top + 12, 1, 10, look.plaid);
      }
      if (look.muscly) {                                                          // big bare arms
        rect(left - 1, top + 12, 4, 9, look.skin);
        rect(left + 13, top + 12, 4, 9, look.skin);
        rect(left, top + 12, 16, 2, look.shirt);
      } else {
        rect(left + 1, top + 13, 2, 7, look.shirt);                               // arms
        rect(left + 13, top + 13, 2, 7, look.shirt);
        rect(left + 1, top + 20, 2, 2, look.skin);                                // hands
        rect(left + 13, top + 20, 2, 2, look.skin);
      }
      rect(left + 4, top + 3, 8, 9, look.skin);                                   // head

      if (look.longHair) {
        rect(left + 3, top + 3, 1, 11, look.hair);
        rect(left + 12, top + 3, 1, 11, look.hair);
      }
      if (person.facing === 'up' && !look.bald) rect(left + 4, top + 3, 8, 8, look.hair);   // back of the head
      if (look.afro) {                                                            // the barber's afro wig
        const AFRO = '#2b1d12';
        rect(left + 1, top - 5, 14, 9, AFRO);
        rect(left + 3, top - 6, 10, 1, AFRO);
        rect(left + 1, top + 4, 3, 5, AFRO);
        rect(left + 12, top + 4, 3, 5, AFRO);
        if (person.facing === 'up') rect(left + 3, top + 3, 10, 8, AFRO);
      } else if (look.bald) {
        rect(left + 5, top + 2, 6, 1, look.skin);                                 // round top of the head
        rect(left + 6, top + 3, 2, 1, '#fff6e6');                                 // shine
      } else if (look.hat) {
        rect(left + 3, top, 10, 5, look.hat);                                     // beanie
        rect(left + 7, top - 2, 2, 2, look.hatBand);
        rect(left + 3, top + 4, 10, 1, look.hatBand);
      } else {
        rect(left + 3, top + 1, 10, 3, look.hair);
        rect(left + 3, top + 3, 1, 4, look.hair);
        rect(left + 12, top + 3, 1, 4, look.hair);
      }
      if (person.facing !== 'up') {
        const eyeShift = person.facing === 'left' ? -1 : person.facing === 'right' ? 1 : 0;
        rect(left + 5 + eyeShift, top + 7, 1, 2, '#1b1b1b');
        rect(left + 10 + eyeShift, top + 7, 1, 2, '#1b1b1b');
      }
      if (look.headphones) {
        rect(left + 2, top + 5, 2, 4, '#222');
        rect(left + 12, top + 5, 2, 4, '#222');
        rect(left + 3, top, 10, 1, '#222');
      }
      if (look.glasses && person.facing !== 'up') {
        rect(left + 4, top + 7, 8, 1, '#1b1b1b');
      }
    };

    // The library robot: a grey box with a blinking antenna.
    paint.robot = function (robot, frame) {
      const left = Math.round(robot.x);
      const top = Math.round(robot.y + 12 - 30);
      rect(left + 1, top + 28, 14, 3, 'rgba(0,0,0,.25)');
      rect(left + 4, top + 24, 3, 5, '#5c6670');                       // legs
      rect(left + 9, top + 24, 3, 5, '#5c6670');
      rect(left + 2, top + 13, 12, 12, '#9aa6b2');                     // body
      rect(left + 5, top + 16, 6, 4, '#2b3a4a');                       // chest panel
      rect(left + 6, top + 17, 1, 1, frame % 40 < 20 ? '#3fe05a' : '#1d5a2a');
      rect(left + 8, top + 17, 2, 1, '#e2a400');
      rect(left, top + 14, 2, 8, '#7d8893');                           // arms
      rect(left + 14, top + 14, 2, 8, '#7d8893');
      rect(left + 3, top + 4, 10, 9, '#b4c0cc');                       // head
      if (robot.facing !== 'up') {
        rect(left + 5, top + 7, 2, 2, '#5ff0ff');                      // eyes
        rect(left + 9, top + 7, 2, 2, '#5ff0ff');
        rect(left + 6, top + 10, 4, 1, '#5c6670');
      }
      rect(left + 7, top, 2, 4, '#7d8893');                            // antenna
      rect(left + 7, top - 2, 2, 2, frame % 60 < 30 ? '#ff4040' : '#992020');
    };

    // A paddock animal. `animal.x, animal.y` is where its feet are; `animal.facing` is 1 (right) or -1 (left).
    paint.animal = function (animal) {
      const x = Math.round(animal.x);
      const y = Math.round(animal.y);
      const f = animal.facing > 0 ? 1 : -1;
      // Draw a box relative to the feet, mirrored when facing left.
      const box = (dx, dy, w, h, colour) => rect(f > 0 ? x + dx : x - dx - w, y + dy, w, h, colour);
      rect(x - 8, y, 16, 2, 'rgba(0,0,0,.22)');   // shadow

      switch (animal.kind) {
        case 'hen':
          paint.hen({ x, y, facing: f, look: { body: '#b5651d', wing: '#8a4a14', tail: '#3a2a1a', earlobe: '#d23030' } });
          break;
        case 'duck':
          box(-6, -8, 12, 7, '#f7f4ea'); box(2, -14, 6, 6, '#2e7d4f'); box(8, -12, 4, 2, '#f2a71b');
          box(5, -13, 1, 1, '#111'); box(-2, -1, 1, 2, '#f2a71b'); box(2, -1, 1, 2, '#f2a71b');
          break;
        case 'goose':
          box(-8, -9, 14, 8, '#f4f1ea'); box(4, -20, 3, 12, '#f4f1ea'); box(4, -22, 6, 4, '#f4f1ea');
          box(10, -21, 4, 2, '#f28c28'); box(7, -21, 1, 1, '#111'); box(-8, -7, 4, 3, '#d8d4c8');
          box(-2, -1, 1, 2, '#f28c28'); box(3, -1, 1, 2, '#f28c28');
          break;
        case 'turtle':
          box(-7, -7, 14, 6, '#3f7a30'); box(-5, -9, 10, 2, '#4f9a3a'); box(-4, -6, 3, 2, '#2e5a22'); box(1, -6, 3, 2, '#2e5a22');
          box(7, -5, 4, 3, '#8ab860'); box(9, -5, 1, 1, '#111');
          box(-6, -1, 2, 1, '#8ab860'); box(4, -1, 2, 1, '#8ab860');
          break;
        case 'platypus':
          box(-7, -6, 13, 5, '#7a5232'); box(6, -5, 6, 3, '#2b2b2b'); box(4, -6, 1, 1, '#111');
          box(-12, -5, 6, 3, '#5a3a20'); box(-5, -1, 2, 1, '#2b2b2b'); box(2, -1, 2, 1, '#2b2b2b');
          break;
        case 'sheep':
          box(-8, -11, 15, 9, '#f2efe6'); box(-7, -12, 12, 1, '#f2efe6'); box(6, -12, 5, 6, '#2b2b2b');
          box(9, -11, 1, 1, '#fff'); box(-6, -2, 2, 2, '#2b2b2b'); box(3, -2, 2, 2, '#2b2b2b');
          break;
        case 'cow':
          box(-10, -13, 18, 10, '#fbfbf6'); box(-7, -12, 5, 4, '#2b2b2b'); box(1, -8, 4, 3, '#2b2b2b');
          box(7, -16, 6, 7, '#fbfbf6'); box(9, -11, 5, 3, '#f2b8b0'); box(10, -14, 1, 1, '#111'); box(7, -18, 1, 2, '#d8c8a8');
          box(-9, -3, 2, 3, '#3a3a3a'); box(-4, -3, 2, 3, '#3a3a3a'); box(2, -3, 2, 3, '#3a3a3a'); box(6, -3, 2, 3, '#3a3a3a');
          break;
        case 'pig':
          box(-8, -10, 15, 8, '#f4a9b0'); box(6, -11, 5, 6, '#f4a9b0'); box(11, -9, 2, 3, '#e58a94');
          box(8, -10, 1, 1, '#111'); box(-10, -9, 2, 2, '#e58a94');
          box(-6, -2, 2, 2, '#d9868a'); box(3, -2, 2, 2, '#d9868a');
          break;
        case 'kiwi':
          box(-7, -10, 13, 9, '#8a6440'); box(-5, -11, 9, 1, '#8a6440'); box(-4, -7, 3, 1, '#6e4c2e'); box(1, -5, 3, 1, '#6e4c2e');
          box(5, -10, 4, 4, '#8a6440'); box(9, -8, 6, 1, '#e8d6a8'); box(14, -7, 1, 1, '#e8d6a8'); box(7, -9, 1, 1, '#111');
          box(-3, -1, 1, 2, '#d9c49a'); box(2, -1, 1, 2, '#d9c49a');
          break;
        case 'owl':
          rect(x - 4, y - 2, 10, 12, '#8a5a34');                 // the fence post it sits on
          rect(x - 5, y - 16, 12, 14, '#7a5a3a'); rect(x - 3, y - 11, 8, 8, '#b89a72');
          rect(x - 5, y - 18, 2, 2, '#7a5a3a'); rect(x + 5, y - 18, 2, 2, '#7a5a3a');
          rect(x - 3, y - 14, 3, 3, '#f2d36b'); rect(x + 2, y - 14, 3, 3, '#f2d36b');
          rect(x - 2, y - 13, 1, 1, '#111'); rect(x + 3, y - 13, 1, 1, '#111'); rect(x, y - 11, 2, 2, '#e2a400');
          break;
        case 'dog':
          box(-7, -9, 13, 6, '#a86b32'); box(5, -14, 6, 6, '#a86b32'); box(11, -12, 3, 3, '#a86b32');
          box(13, -12, 1, 1, '#111'); box(8, -12, 1, 1, '#111'); box(5, -14, 2, 4, '#6e4520');
          box(-10, -12, 3, 2, '#a86b32'); box(-6, -3, 2, 3, '#8a5426'); box(3, -3, 2, 3, '#8a5426');
          break;
      }
    };

    // A hen. `hen.x, hen.y` is where her feet are. `hen.look` has the colours.
    paint.hen = function (hen) {
      const x = Math.round(hen.x);
      const y = Math.round(hen.y);
      const right = hen.facing > 0;
      const look = hen.look;
      rect(x - 7, y, 14, 2, 'rgba(0,0,0,.22)');                         // shadow
      rect(x - 2, y - 2, 1, 3, '#f2a71b');                              // legs
      rect(x + 2, y - 2, 1, 3, '#f2a71b');
      rect(x - 6, y - 10, 12, 8, look.body);                            // body
      if (look.bars) {                                                  // barred feathers
        for (let by = y - 9; by < y - 2; by += 2) rect(x - 6, by, 12, 1, look.bars);
      }
      if (look.speckles) {
        [[-4, -8], [0, -6], [3, -9], [-2, -4], [4, -5]].forEach(([sx, sy]) => rect(x + sx, y + sy, 1, 1, look.speckles));
      }
      rect(right ? x - 3 : x - 3, y - 7, 6, 2, look.wing);              // wing
      rect(right ? x - 9 : x + 6, y - 13, 3, 5, look.tail);             // tail
      rect(right ? x + 3 : x - 8, y - 15, 5, 6, look.body);             // head
      rect(right ? x + 4 : x - 7, y - 17, 3, 2, '#d23030');             // comb
      rect(right ? x + 8 : x - 10, y - 13, 2, 1, '#f2a71b');            // beak
      rect(right ? x + 6 : x - 7, y - 14, 1, 1, '#111');                // eye
      rect(right ? x + 4 : x - 5, y - 11, 1, 2, look.earlobe);          // earlobe
      rect(right ? x + 7 : x - 8, y - 11, 1, 2, '#d23030');             // wattle
    };

    return paint;
  };
})();
