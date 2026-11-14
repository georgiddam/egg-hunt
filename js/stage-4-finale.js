/*
 * stage-4-finale.js — the last screen: golden egg, confetti, the full code
 * (put together from the player's own answers) and the button to the prize
 * (the Pastebin link from config.js).
 */
(function () {
  'use strict';

  const EGG_OUTLINE = 'M100 20 C150 20 182 115 182 165 C182 222 146 258 100 258 C54 258 18 222 18 165 C18 115 50 20 100 20Z';

  function goldenEggDrawing() {
    // 12 light rays spinning behind the egg.
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const startAngle = (i / 12) * Math.PI * 2;
      const endAngle = startAngle + Math.PI / 14;
      const x1 = 100 + Math.cos(startAngle) * 130;
      const y1 = 124 + Math.sin(startAngle) * 130;
      const x2 = 100 + Math.cos(endAngle) * 130;
      const y2 = 124 + Math.sin(endAngle) * 130;
      rays += `<polygon points="100,124 ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"/>`;
    }

    return `
      <svg class="gold" viewBox="0 0 200 220" aria-hidden="true">
        <defs>
          <radialGradient id="goldShade" cx="35%" cy="30%" r="80%">
            <stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#f5c400"/><stop offset="1" stop-color="#b8860b"/>
          </radialGradient>
        </defs>
        <g class="rays" fill="#f5b301" opacity=".28">${rays}</g>
        <g class="egg">
          <ellipse cx="100" cy="198" rx="44" ry="6" fill="rgba(60,40,10,.2)"/>
          <path d="${EGG_OUTLINE}" transform="translate(40 40) scale(.6)" fill="url(#goldShade)" stroke="#9a6f00" stroke-width="3"/>
          <path d="M52 118 L64 110 L76 120 L88 108 L100 120 L112 108 L124 120 L136 110 L148 118"
                fill="none" stroke="#7a5600" stroke-width="3" stroke-linejoin="round"/>
          <ellipse cx="80" cy="84" rx="8" ry="12" fill="#fffbe0" opacity=".6"/>
        </g>
      </svg>`;
  }

  // Confetti (with a few eggs) falling for about 5 seconds, drawn on a full-screen canvas.
  function throwConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = window.innerWidth * pixelRatio;
    canvas.height = window.innerHeight * pixelRatio;

    const COLOURS = ['#f5b301', '#c8432b', '#2f6b3a', '#fff3d6', '#3d63c9', '#e2508f'];
    const pieces = [];
    for (let i = 0; i < 180; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.6,      // start above the screen
        speedX: (Math.random() - 0.5) * 3 * pixelRatio,
        speedY: (2 + Math.random() * 3) * pixelRatio,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        width: (6 + Math.random() * 6) * pixelRatio,
        height: (3 + Math.random() * 4) * pixelRatio,
        colour: COLOURS[i % COLOURS.length],
        isEgg: i % 9 === 0
      });
    }

    const startTime = performance.now();
    function drawFrame(now) {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const piece of pieces) {
        piece.x += piece.speedX;
        piece.y += piece.speedY;
        piece.speedY += 0.03 * pixelRatio; // gravity
        piece.angle += piece.spin;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.angle);
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 4000) / 1500); // fade out at the end
        if (piece.isEgg) {
          ctx.fillStyle = '#fffaf0';
          ctx.beginPath();
          ctx.ellipse(0, 0, 5 * pixelRatio, 7 * pixelRatio, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = piece.colour;
          ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        }
        ctx.restore();
      }

      if (elapsed < 5500) requestAnimationFrame(drawFrame);
      else canvas.remove();
    }
    requestAnimationFrame(drawFrame);
  }

  Game.stages.finale = {
    mount(app) {
      const config = Game.config;
      // The code is made of the digits the player earned (nothing is stored in the site).
      const code = Game.fullCode();

      // The 8 digits as yellow boxes, with a small gap between the 3 parts.
      const digitBoxes = Game.PART_LENGTHS
        .map((length, partIndex) => (Game.progress.found[partIndex] || '?'.repeat(length)).split('')
          .map((digit, i) => `<span style="animation-delay:${i * 0.1}s">${Game.escape(digit)}</span>`).join(''))
        .join('<span class="gap"></span>');

      // Game.prizeUrl is already checked to be a plain https:// link (see game.js).
      const prizeSection = Game.prizeUrl
        ? `<a class="btn btn-big" href="${Game.escape(Game.prizeUrl)}" target="_blank" rel="noopener noreferrer">Open your prize 🎁</a>
           <p class="muted small">Use the code above as the password.</p>`
        : `<p class="muted">The prize link is coming soon.</p>`;

      app.innerHTML = `
        <section class="card finale">
          <div class="kicker">EGG-001 · Status: Done ✅</div>
          ${goldenEggDrawing()}
          <h1>You cracked it, ${Game.names.player}!</h1>
          <p>The full code is:</p>
          <div class="big-code" aria-label="${code.split('').join(' ')}">${digitBoxes}</div>
          <p><button class="btn btn-ghost" id="copyButton">Copy code</button></p>
          <p>${Game.escape(Game.fillNames(config.finalMessage))}</p>
          ${prizeSection}
          <p class="sign-off">${Game.escape(Game.fillNames(config.signOff))}</p>
          <p><button class="link" id="replayButton">Play again from the start</button></p>
        </section>`;

      app.querySelector('#copyButton').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.blur();
        try {
          await navigator.clipboard.writeText(code);
          Game.toast('Code copied');
        } catch (error) {
          Game.toast('Copy failed. The code is ' + code);
        }
      });

      app.querySelector('#replayButton').addEventListener('click', () => Game.restart());

      throwConfetti();
    }
  };
})();
