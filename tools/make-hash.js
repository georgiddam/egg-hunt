// make-hash.js — used by make-hash.html. Fingerprints an answer the same way the game does.
document.getElementById('form').addEventListener('submit', async event => {
  event.preventDefault();
  const puzzle = document.getElementById('puzzle').value;
  const answer = document.getElementById('answer').value;
  const result = document.getElementById('result');
  if (!Game.normaliseAnswer(answer)) {
    result.textContent = 'Type an answer first.';
    return;
  }
  result.textContent = "'" + await Game.fingerprint(puzzle, answer) + "'";
});
