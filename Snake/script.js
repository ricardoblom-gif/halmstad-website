const OPSLAG_SLEUTEL = 'halmstad_snake_scores';
const MAX_OPGESLAGEN = 100;
const MAX_ZICHTBAAR = 15;

const GRID_GROOTTE = 20;
const CELLEN = 20; // 20x20 cellen van 20px = 400x400
const SNELHEID_MS = 120;

const naamScherm = document.getElementById('naam-scherm');
const spelScherm = document.getElementById('spel-scherm');
const spelerNaamInput = document.getElementById('speler-naam');
const startKnop = document.getElementById('start-knop');
const opnieuwKnop = document.getElementById('opnieuw-knop');
const huidigeNaamEl = document.getElementById('huidige-naam');
const huidigeScoreEl = document.getElementById('huidige-score');
const eindScoreEl = document.getElementById('eind-score');
const gameOverEl = document.getElementById('game-over');
const scorelijstEl = document.getElementById('scorelijst');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let speler = '';
let snake, richting, volgendeRichting, eten, score, lusId;

function laadScores() {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL);
    return ruw ? JSON.parse(ruw) : [];
  } catch (e) {
    return [];
  }
}

function bewaarScore(naam, punten) {
  const scores = laadScores();
  scores.push({ naam, score: punten, datum: new Date().toISOString() });
  scores.sort((a, b) => b.score - a.score);
  const beperkt = scores.slice(0, MAX_OPGESLAGEN);
  localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(beperkt));
  return beperkt;
}

function toonScorebord() {
  const scores = laadScores();
  scorelijstEl.innerHTML = '';
  scores.slice(0, MAX_ZICHTBAAR).forEach((item) => {
    const li = document.createElement('li');
    const naamSpan = document.createElement('span');
    naamSpan.textContent = item.naam;
    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = item.score;
    li.appendChild(naamSpan);
    li.appendChild(scoreSpan);
    scorelijstEl.appendChild(li);
  });
  if (scores.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nog geen scores';
    scorelijstEl.appendChild(li);
  }
}

function zetNieuwEten() {
  let plek;
  do {
    plek = {
      x: Math.floor(Math.random() * CELLEN),
      y: Math.floor(Math.random() * CELLEN),
    };
  } while (snake.some((deel) => deel.x === plek.x && deel.y === plek.y));
  eten = plek;
}

function startSpel() {
  snake = [{ x: 10, y: 10 }];
  richting = { x: 1, y: 0 };
  volgendeRichting = { x: 1, y: 0 };
  score = 0;
  huidigeScoreEl.textContent = '0';
  zetNieuwEten();
  gameOverEl.hidden = true;
  clearInterval(lusId);
  lusId = setInterval(spelStap, SNELHEID_MS);
}

function spelStap() {
  richting = volgendeRichting;
  const kop = { x: snake[0].x + richting.x, y: snake[0].y + richting.y };

  const buitenRand = kop.x < 0 || kop.x >= CELLEN || kop.y < 0 || kop.y >= CELLEN;
  const raaktZichzelf = snake.some((deel) => deel.x === kop.x && deel.y === kop.y);

  if (buitenRand || raaktZichzelf) {
    eindigSpel();
    return;
  }

  snake.unshift(kop);

  if (kop.x === eten.x && kop.y === eten.y) {
    score += 10;
    huidigeScoreEl.textContent = String(score);
    zetNieuwEten();
  } else {
    snake.pop();
  }

  tekenSpel();
}

function tekenSpel() {
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e8a33d';
  ctx.fillRect(eten.x * GRID_GROOTTE, eten.y * GRID_GROOTTE, GRID_GROOTTE - 2, GRID_GROOTTE - 2);

  ctx.fillStyle = '#0b6e6e';
  snake.forEach((deel, i) => {
    ctx.fillStyle = i === 0 ? '#0f8f8f' : '#0b6e6e';
    ctx.fillRect(deel.x * GRID_GROOTTE, deel.y * GRID_GROOTTE, GRID_GROOTTE - 2, GRID_GROOTTE - 2);
  });
}

function eindigSpel() {
  clearInterval(lusId);
  eindScoreEl.textContent = String(score);
  gameOverEl.hidden = false;
  bewaarScore(speler, score);
  toonScorebord();
}

startKnop.addEventListener('click', () => {
  const naam = spelerNaamInput.value.trim();
  if (!naam) {
    spelerNaamInput.focus();
    return;
  }
  speler = naam;
  huidigeNaamEl.textContent = speler;
  naamScherm.hidden = true;
  spelScherm.hidden = false;
  startSpel();
});

opnieuwKnop.addEventListener('click', () => {
  startSpel();
});

document.addEventListener('keydown', (event) => {
  const doelElement = event.target.tagName;
  if (doelElement === 'INPUT' || doelElement === 'TEXTAREA') {
    return;
  }

  const toets = event.key.toLowerCase();
  const links = { x: -1, y: 0 };
  const rechts = { x: 1, y: 0 };
  const omhoog = { x: 0, y: -1 };
  const omlaag = { x: 0, y: 1 };

  let nieuw = null;
  if (toets === 'arrowleft' || toets === 'a') nieuw = links;
  else if (toets === 'arrowright' || toets === 'd') nieuw = rechts;
  else if (toets === 'arrowup' || toets === 'w') nieuw = omhoog;
  else if (toets === 'arrowdown' || toets === 's') nieuw = omlaag;
  else return;

  event.preventDefault();

  const gaatTegenIn = nieuw.x === -richting.x && nieuw.y === -richting.y;
  if (!gaatTegenIn) {
    volgendeRichting = nieuw;
  }
});

toonScorebord();
