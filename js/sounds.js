/*
 * sounds.js — small sound effects, made on the fly with the Web Audio API.
 * No sound files are downloaded. Sounds only play after the player does something
 * (browsers don't allow sound before that anyway).
 *
 *   Game.sound.crackle()  a fire crackling for a few seconds
 *   Game.sound.hoot()     an owl: hoo-hoooo
 *   Game.sound.splash()   a fishing line hitting the water
 *   Game.sound.chime()    a happy little tune (the safe opening)
 *   Game.sound.writing()  a pen scribbling
 *   Game.sound.animal(kind)  moo, baa, oink, woof, cluck, honk, hoot...
 *
 * The animal noises are cartoon versions, built from simple tones and filters.
 */
(function () {
  'use strict';

  let audio = null;

  function getAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audio) audio = new AudioContextClass();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  // A buffer of random "white noise", the raw material for fire and water sounds.
  function noise(ac, seconds) {
    const buffer = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * seconds)), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Play `buffer` through a filter with a volume envelope.
  function playNoise(ac, buffer, start, filterType, frequency, volume, length) {
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter).connect(gain).connect(ac.destination);
    source.start(start);
    source.stop(start + length + 0.05);
  }

  function tone(ac, start, frequency, length, volume, type) {
    const osc = ac.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + length + 0.05);
    return osc;
  }

  Game.sound = {
    crackle(seconds) {
      const ac = getAudio();
      if (!ac) return;
      const length = seconds || 4;
      const now = ac.currentTime;
      // A soft rumble underneath...
      const rumble = ac.createBufferSource();
      rumble.buffer = noise(ac, length);
      const lowpass = ac.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 500;
      const rumbleGain = ac.createGain();
      rumbleGain.gain.setValueAtTime(0.0001, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + length);
      rumble.connect(lowpass).connect(rumbleGain).connect(ac.destination);
      rumble.start(now);
      // ...and lots of tiny random pops on top.
      const pop = noise(ac, 0.05);
      for (let i = 0; i < length * 10; i++) {
        const at = now + Math.random() * length;
        playNoise(ac, pop, at, 'bandpass', 1200 + Math.random() * 3500, 0.15 + Math.random() * 0.4, 0.02 + Math.random() * 0.05);
      }
    },

    hoot() {
      const ac = getAudio();
      if (!ac) return;
      const now = ac.currentTime;
      [[0, 0.35, 390], [0.45, 0.8, 370]].forEach(([at, length, frequency]) => {
        const osc = tone(ac, now + at, frequency, length, 0.25);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.88, now + at + length);
      });
    },

    splash() {
      const ac = getAudio();
      if (!ac) return;
      const now = ac.currentTime;
      playNoise(ac, noise(ac, 0.6), now, 'lowpass', 1400, 0.4, 0.5);
      playNoise(ac, noise(ac, 0.3), now + 0.05, 'bandpass', 3000, 0.15, 0.25);
    },

    chime() {
      const ac = getAudio();
      if (!ac) return;
      const now = ac.currentTime;
      [523, 659, 784, 1047].forEach((frequency, i) => tone(ac, now + i * 0.12, frequency, 0.5, 0.2, 'triangle'));
    },

    animal(kind) {
      const ac = getAudio();
      if (!ac) return;
      const now = ac.currentTime;
      // One "voice": a buzzy tone sliding from one pitch to another, shaped by a filter.
      const voice = (at, from, to, length, volume, filterFrequency, wobble) => {
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(from, now + at);
        osc.frequency.exponentialRampToValueAtTime(to, now + at + length);
        if (wobble) {   // vibrato, for the sheep's "baa-aa-aa"
          const lfo = ac.createOscillator();
          lfo.frequency.value = wobble;
          const depth = ac.createGain();
          depth.gain.value = from * 0.06;
          lfo.connect(depth).connect(osc.frequency);
          lfo.start(now + at);
          lfo.stop(now + at + length + 0.05);
        }
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFrequency;
        filter.Q.value = 4;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.0001, now + at);
        gain.gain.exponentialRampToValueAtTime(volume, now + at + Math.min(0.08, length / 3));
        gain.gain.setValueAtTime(volume, now + at + length * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + length);
        osc.connect(filter).connect(gain).connect(ac.destination);
        osc.start(now + at);
        osc.stop(now + at + length + 0.05);
      };
      switch (kind) {
        case 'cow':      voice(0, 120, 95, 1.3, 0.35, 500); break;                                   // mooooo
        case 'sheep':    voice(0, 280, 250, 0.9, 0.25, 1600, 9); break;                              // baa-aa-aa
        case 'pig':      voice(0, 220, 150, 0.16, 0.3, 900); voice(0.22, 240, 160, 0.18, 0.3, 900); break;   // oink oink
        case 'dog':      voice(0, 420, 200, 0.12, 0.35, 1400); voice(0.22, 440, 210, 0.14, 0.35, 1400); break; // woof woof
        case 'hen':      [0, 0.13, 0.26].forEach(at => voice(at, 700, 500, 0.08, 0.2, 2200)); voice(0.42, 600, 900, 0.3, 0.22, 2200); break; // buk-buk-bukAAK
        case 'goose':    voice(0, 360, 320, 0.25, 0.3, 1300); voice(0.35, 380, 330, 0.3, 0.3, 1300); break;    // honk honk
        case 'platypus': voice(0, 90, 80, 0.6, 0.3, 400, 18); break;                                 // a low little growl
        case 'kiwi':     [0, 0.3, 0.6].forEach(at => tone(ac, now + at, 1800, 0.22, 0.15).frequency.exponentialRampToValueAtTime(3200, now + at + 0.22)); break; // shrill whistles
        case 'owl':      Game.sound.hoot(); break;
      }
    },

    // A pen scribbling on paper: short scratchy strokes with little pauses.
    writing(seconds) {
      const ac = getAudio();
      if (!ac) return;
      const length = seconds || 2.2;
      const scratch = noise(ac, 0.3);
      let at = ac.currentTime + 0.05;
      const end = at + length;
      while (at < end) {
        const stroke = 0.06 + Math.random() * 0.18;
        playNoise(ac, scratch, at, 'bandpass', 3500 + Math.random() * 2500, 0.08 + Math.random() * 0.1, stroke);
        at += stroke + (Math.random() < 0.2 ? 0.2 + Math.random() * 0.2 : 0.02 + Math.random() * 0.05);
      }
    }
  };

  /* ==========================================================================
   * Background music: slow lo-fi jazz, made live in the browser.
   *
   * Jazzy chords on a soft electric-piano sound, a walking bass, brushed drums,
   * a few lazy melody notes and some vinyl crackle, all through a warm filter.
   * Browsers only allow sound after the player clicks or presses a key, so it
   * starts on the first one. The 🔊 button in the top bar turns it off and on,
   * and the choice is remembered.
   * ======================================================================= */

  const MUSIC_KEY = 'egghunt-music';
  const BEAT = 60 / 70;   // 70 beats per minute
  // Each chord: bass root, then the notes on top (as frequencies in Hz).
  const midi = note => 440 * Math.pow(2, (note - 69) / 12);
  const CHORDS = [
    { root: 50, notes: [65, 69, 72, 76] },   // Dm9
    { root: 43, notes: [65, 69, 71, 76] },   // G13
    { root: 48, notes: [64, 67, 71, 74] },   // Cmaj9
    { root: 45, notes: [64, 67, 70, 73] }    // A7(b9)-ish
  ];
  const MELODY = [72, 74, 76, 79, 81, 84];   // a pentatonic scale that fits every chord

  let musicOn = false;
  let master = null;
  let scheduler = 0;
  let nextBarTime = 0;
  let barNumber = 0;
  let crackleSource = null;

  function wantsMusic() {
    try { return localStorage.getItem(MUSIC_KEY) !== 'off'; } catch (error) { return true; }
  }
  function rememberMusic(on) {
    try { localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off'); } catch (error) { /* ignore */ }
  }

  // A soft electric-piano note.
  function keys(ac, start, note, length, volume) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midi(note);
    const overtone = ac.createOscillator();
    overtone.type = 'triangle';
    overtone.frequency.value = midi(note) * 2;
    const overtoneGain = ac.createGain();
    overtoneGain.gain.value = 0.15;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(volume * 0.4, start + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    overtone.connect(overtoneGain).connect(gain);
    gain.connect(master);
    [osc, overtone].forEach(o => { o.start(start); o.stop(start + length + 0.1); });
  }

  function bass(ac, start, note, length) {
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midi(note);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  function kick(ac, start) {
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(110, start);
    osc.frequency.exponentialRampToValueAtTime(40, start + 0.15);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.5, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 0.3);
  }

  function brush(ac, start, volume) {
    const source = ac.createBufferSource();
    source.buffer = noise(ac, 0.15);
    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
  }

  // Plans one bar (4 beats) of music starting at `start`.
  function scheduleBar(ac, start) {
    const chord = CHORDS[barNumber % CHORDS.length];
    const swing = BEAT * 0.66;   // the "and" of each beat comes late: that's the swing

    // Chord: played on beat 1, and sometimes again just before beat 3
    chord.notes.forEach((note, i) => keys(ac, start + i * 0.015, note, BEAT * 3.5, 0.05));
    if (barNumber % 2) chord.notes.forEach(note => keys(ac, start + BEAT * 2 - BEAT / 3, note, BEAT * 1.8, 0.03));

    // Walking bass: root, fifth, octave, a step towards the next chord
    const nextRoot = CHORDS[(barNumber + 1) % CHORDS.length].root;
    [chord.root, chord.root + 7, chord.root + 12, nextRoot + 1].forEach((note, beat) => bass(ac, start + beat * BEAT, note, BEAT * 0.9));

    // Drums: soft kick on 1 and 3, brushes on every beat and the swung "and"
    kick(ac, start);
    kick(ac, start + BEAT * 2);
    for (let beat = 0; beat < 4; beat++) {
      brush(ac, start + beat * BEAT, beat % 2 ? 0.12 : 0.07);
      brush(ac, start + beat * BEAT + swing, 0.05);
    }

    // A couple of lazy melody notes, different every time
    const melodyNotes = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < melodyNotes; i++) {
      const note = MELODY[Math.floor(Math.random() * MELODY.length)];
      keys(ac, start + Math.floor(Math.random() * 8) * (BEAT / 2), note, BEAT * 1.5, 0.035);
    }
    barNumber++;
  }

  function startMusic() {
    const ac = getAudio();
    if (!ac || musicOn) return;
    musicOn = true;

    master = ac.createGain();
    master.gain.setValueAtTime(0.0001, ac.currentTime);
    master.gain.exponentialRampToValueAtTime(0.35, ac.currentTime + 2);   // fade in
    const warmth = ac.createBiquadFilter();   // takes the edge off: the "lo-fi" sound
    warmth.type = 'lowpass';
    warmth.frequency.value = 2200;
    master.connect(warmth).connect(ac.destination);

    // Vinyl crackle underneath everything
    crackleSource = ac.createBufferSource();
    const vinyl = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = vinyl.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.01;
    crackleSource.buffer = vinyl;
    crackleSource.loop = true;
    crackleSource.connect(master);
    crackleSource.start();

    // Plan the music a little ahead of time, one bar at a time.
    nextBarTime = ac.currentTime + 0.1;
    scheduler = setInterval(() => {
      while (nextBarTime < ac.currentTime + 1.5) {
        scheduleBar(ac, nextBarTime);
        nextBarTime += BEAT * 4;
      }
    }, 250);
  }

  function stopMusic() {
    if (!musicOn) return;
    musicOn = false;
    clearInterval(scheduler);
    const ac = getAudio();
    const oldMaster = master;
    oldMaster.gain.cancelScheduledValues(ac.currentTime);
    oldMaster.gain.setValueAtTime(oldMaster.gain.value, ac.currentTime);
    oldMaster.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);   // quick fade out
    const oldCrackle = crackleSource;
    setTimeout(() => { oldCrackle.stop(); oldMaster.disconnect(); }, 500);
  }

  /* ---- The 🔊 button and starting on the first click ------------------- */

  const button = document.getElementById('soundToggle');

  function showButton() {
    if (!button) return;
    button.textContent = wantsMusic() ? '🔊' : '🔇';
    button.setAttribute('aria-label', wantsMusic() ? 'Turn music off' : 'Turn music on');
    button.title = button.getAttribute('aria-label');
  }

  if (button) {
    button.addEventListener('click', event => {
      event.stopPropagation();
      event.currentTarget.blur();
      const on = !wantsMusic();
      rememberMusic(on);
      if (on) startMusic(); else stopMusic();
      showButton();
    });
  }
  showButton();

  function startOnFirstGesture() {
    window.removeEventListener('pointerdown', startOnFirstGesture);
    window.removeEventListener('keydown', startOnFirstGesture);
    if (wantsMusic()) startMusic();
  }
  window.addEventListener('pointerdown', startOnFirstGesture);
  window.addEventListener('keydown', startOnFirstGesture);

  Game.music = { start: startMusic, stop: stopMusic, isOn: () => musicOn };
})();
