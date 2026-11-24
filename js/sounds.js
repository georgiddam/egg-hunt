/*
 * sounds.js — small sound effects, made on the fly with the Web Audio API.
 * No sound files are downloaded. Sounds only play after the player does something
 * (browsers don't allow sound before that anyway).
 *
 *   Game.sound.crackle()  a fire crackling for a few seconds
 *   Game.sound.hoot()     an owl: hoo-hoooo
 *   Game.sound.splash()   a fishing line hitting the water
 *   Game.sound.chime()    a happy little tune (the safe opening)
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
    }
  };
})();
