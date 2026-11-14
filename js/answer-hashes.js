/*
 * answer-hashes.js — fingerprints of the correct answers. NOT the answers.
 *
 * Each puzzle lists the fingerprints of the answers it accepts (sometimes a few
 * spellings). A fingerprint can't be turned back into the answer; the game just
 * fingerprints what the player types and checks if it's in the list.
 * See "Checking answers" in game.js.
 *
 * To change an answer: open tools/make-hash.html, pick the puzzle, type the new
 * answer, and paste the fingerprint it gives you here (replacing the old one).
 *
 *   riddle-1 … riddle-3   Stage 1, the riddles (riddle-3's answer is 2 digits)
 *   night                 Stage 2, the 3 digits hidden in the farm picture
 *   village               Stage 3, the 3-digit safe code
 */
window.EGG_ANSWER_HASHES = {
  'riddle-1': [
    'd78d1224dfc65c23d7fe7c1ce024174ac2d844d65f1e9275eb221ba66eac4d3d',
    '7b21e3ddf8ead21762f3c53782553e89f702689d184ad6b0591b33de2c0f88a0'
  ],
  'riddle-2': [
    'ea19c3229e5617119a2aa97a5833a73ce0a71d7db29fcf415581b39c89669496',
    '4cb0e3b710cf0efd4e619d8b6e9d4de323ddcc2642e78300b90af80244341dd1',
    'ec7185f5ec375e6b432ac85e3cc99d89a6765249cef0b08b606644e60aee4aa4',
    '9e747a9508ffd3068a233872f3e7cdd4fe4f80ea3f1cbf48ddd424922050cdbd'
  ],
  'riddle-3': [
    'c0cd69550eb6cfe2addc3eaec411e34b6434e12c836edd605cea720de297cd82'
  ],
  'night': [
    '4419613c0c3697c43accd8d2845c44811fc1a9ee2478b36e16f3e5e21a6e7dd0'
  ],
  'village': [
    'a3d0e7cddc60c890f9597843f1a25ff3556c8664edff2afe9a6932dc16ee5da3'
  ]
};
