const SIZE = 3;
const BLANK = 0;
const IMAGE_URL = 'assets/spiderman.jpeg';

let tiles = [];
let moves = 0;
let seconds = 0;
let timerId = null;
let started = false;
let playerName = '';

const boardEl = document.getElementById('board');

// ---------- helpers ----------
function solvedArray(){
  const arr = [];
  for (let i = 1; i < SIZE * SIZE; i++) arr.push(i);
  arr.push(BLANK);
  return arr;
}

function idxToRowCol(i){ return [Math.floor(i / SIZE), i % SIZE]; }

function neighbors(i){
  const [r, c] = idxToRowCol(i);
  const out = [];
  if (r > 0) out.push(i - SIZE);
  if (r < SIZE - 1) out.push(i + SIZE);
  if (c > 0) out.push(i - 1);
  if (c < SIZE - 1) out.push(i + 1);
  return out;
}

function fmtTime(s){
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const r = (s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

// ---------- shuffle (always solvable) ----------
function shuffle(){
  tiles = solvedArray();
  let blankIdx = tiles.indexOf(BLANK);
  let lastIdx = -1;
  const steps = 200;

  for (let s = 0; s < steps; s++){
    const options = neighbors(blankIdx).filter(n => n !== lastIdx);
    const next = options[Math.floor(Math.random() * options.length)];
    [tiles[blankIdx], tiles[next]] = [tiles[next], tiles[blankIdx]];
    lastIdx = blankIdx;
    blankIdx = next;
  }

  moves = 0;
  seconds = 0;
  started = false;
  clearInterval(timerId);
  document.getElementById('hudTime').textContent = '00:00';
  document.getElementById('hudMoves').textContent = '0';
  render();
}

// ---------- rendering ----------
function render(){
  boardEl.innerHTML = '';
  tiles.forEach((tileId, pos) => {
    const div = document.createElement('div');
    if (tileId === BLANK){
      div.className = 'tile blank';
    } else {
      div.className = 'tile';
      const originIdx = tileId - 1;
      const [r, c] = idxToRowCol(originIdx);
      div.style.backgroundImage = `url(${IMAGE_URL})`;
      div.style.backgroundSize = `${SIZE * 100}% ${SIZE * 100}%`;
      div.style.backgroundPosition =
        `${(c / (SIZE - 1)) * 100}% ${(r / (SIZE - 1)) * 100}%`;
      div.addEventListener('click', () => tryMove(pos));
    }
    boardEl.appendChild(div);
  });
}

// ---------- moving ----------
function tryMove(pos){
  if (!started && !document.getElementById('gateBack').classList.contains('visible') === false) {
    // guard: ignore clicks until the name gate has been dismissed
  }
  const blankIdx = tiles.indexOf(BLANK);
  if (neighbors(pos).includes(blankIdx)){
    [tiles[pos], tiles[blankIdx]] = [tiles[blankIdx], tiles[pos]];
    startTimerIfNeeded();
    moves++;
    document.getElementById('hudMoves').textContent = moves;
    render();
    checkWin();
  }
}

document.addEventListener('keydown', (e) => {
  if (document.getElementById('gateBack').classList.contains('visible')) return; // locked until name entered
  const blankIdx = tiles.indexOf(BLANK);
  const [br, bc] = idxToRowCol(blankIdx);
  let target = -1;
  if (e.key === 'ArrowUp'    && br < SIZE - 1) target = blankIdx + SIZE;
  if (e.key === 'ArrowDown'  && br > 0)        target = blankIdx - SIZE;
  if (e.key === 'ArrowLeft'  && bc < SIZE - 1) target = blankIdx + 1;
  if (e.key === 'ArrowRight' && bc > 0)        target = blankIdx - 1;
  if (target >= 0) tryMove(target);
});

// ---------- hint solver (BFS — finds the correct next move from the current state) ----------
function solveNextMove(state){
  const goal = solvedArray().join(',');
  const start = state.join(',');
  if (start === goal) return null;

  const queue = [[state.slice(), []]];
  const seen = new Set([start]);

  while (queue.length){
    const [cur, path] = queue.shift();
    const blank = cur.indexOf(BLANK);
    for (const n of neighbors(blank)){
      const next = cur.slice();
      [next[blank], next[n]] = [next[n], next[blank]];
      const key = next.join(',');
      if (key === goal) return path.length ? path[0] : n; // first move in the shortest path
      if (!seen.has(key)){
        seen.add(key);
        queue.push([next, [...path, n]]);
      }
    }
  }
  return null;
}

// ---------- timer & win ----------
function startTimerIfNeeded(){
  if (started) return;
  started = true;
  timerId = setInterval(() => {
    seconds++;
    document.getElementById('hudTime').textContent = fmtTime(seconds);
  }, 1000);
}

function checkWin(){
  const win = solvedArray();
  for (let i = 0; i < win.length; i++){
    if (tiles[i] !== win[i]) return;
  }
  clearInterval(timerId);
  onSolved();
}

// ---------- leaderboard (talks to server.js) ----------
async function saveScore(entry){
  try{
    await fetch('/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  }catch(err){
    console.error('Could not save score', err);
  }
}

async function loadLeaderboard(){
  try{
    const res = await fetch('/leaderboard');
    if (!res.ok) return [];
    return await res.json();
  }catch(err){
    return [];
  }
}

function renderLeaderboard(list){
  const lbList = document.getElementById('lbList');
  if (!list.length){
    lbList.innerHTML = '<li class="lb-empty">No runs yet — be the first.</li>';
    return;
  }
  lbList.innerHTML = '';
  list.slice(0, 10).forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'lb-row rank-' + (i + 1);
    li.innerHTML = `<span class="lb-rank">${i + 1}</span><span class="lb-name">${entry.name}</span><span class="lb-time">${fmtTime(entry.time)}</span>`;
    lbList.appendChild(li);
  });
}

async function onSolved(){
  const entry = { name: playerName, time: seconds, moves };

  await saveScore(entry);
  const list = await loadLeaderboard();
  const rank = list.findIndex(e => e.name === playerName && e.time === seconds && e.moves === moves) + 1;

  document.getElementById('modalTime').textContent = fmtTime(seconds);
  document.getElementById('modalMoves').textContent = moves;
  document.getElementById('modalRank').textContent = '#' + (rank > 0 ? rank : '-');
  document.getElementById('modalBack').classList.add('visible');

  renderLeaderboard(list);
}

// ---------- name gate ----------
function startGame(){
  const input = document.getElementById('gateNameInput');
  playerName = input.value.trim() || 'Anonymous';
  document.getElementById('playingAs').innerHTML = `Playing as <b>${playerName}</b>`;
  document.getElementById('gateBack').classList.remove('visible');
  shuffle();
}

document.getElementById('gateStartBtn').addEventListener('click', startGame);
document.getElementById('gateNameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame();
});

// ---------- buttons ----------
document.getElementById('shuffleBtn').addEventListener('click', shuffle);
document.getElementById('modalCloseBtn').addEventListener('click', () => {
  document.getElementById('modalBack').classList.remove('visible');
  shuffle();
});

document.getElementById('hintBtn').addEventListener('click', () => {
  if (document.getElementById('gateBack').classList.contains('visible')) return; // not started yet

  const nextMove = solveNextMove(tiles);
  if (nextMove === null) return; // already solved

  startTimerIfNeeded(); // hint before first move still counts as playing
  seconds += 10;        // the penalty
  document.getElementById('hudTime').textContent = fmtTime(seconds);

  const tileEls = boardEl.children;
  const glowEl = tileEls[nextMove];
  glowEl.classList.add('hint-glow');
  setTimeout(() => glowEl.classList.remove('hint-glow'), 1200);
});

// ---------- init ----------
async function init(){
  const list = await loadLeaderboard();
  renderLeaderboard(list);
  // board stays empty until the name gate is dismissed — shuffle() runs in startGame()
}
init();