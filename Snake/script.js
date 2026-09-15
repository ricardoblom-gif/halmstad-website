const OPSLAG_SLEUTEL = 'halmstad_snake_scores';
const MAX_OPGESLAGEN = 100;
const MAX_ZICHTBAAR = 15;

const GRID_GROOTTE = 25;
const CELLEN = 24; // 24x24 cellen van 25px = 600x600
const SNELHEID_MS = 110;

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
let etenFase = 0;
let spelActief = false;

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
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  richting = { x: 1, y: 0 };
  volgendeRichting = { x: 1, y: 0 };
  score = 0;
  huidigeScoreEl.textContent = '0';
  zetNieuwEten();
  gameOverEl.hidden = true;
  spelActief = true;
  clearInterval(lusId);
  lusId = setInterval(spelStap, SNELHEID_MS);
  requestAnimationFrame(tekenLus);
}

function spelStap() {
  if (!spelActief) return;
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
}

function tekenAchtergrond() {
  for (let y = 0; y < CELLEN; y++) {
    for (let x = 0; x < CELLEN; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#182b1f' : '#152618';
      ctx.fillRect(x * GRID_GROOTTE, y * GRID_GROOTTE, GRID_GROOTTE, GRID_GROOTTE);
    }
  }
}

function rondeRect(x, y, breedte, hoogte, straal) {
  ctx.beginPath();
  ctx.moveTo(x + straal, y);
  ctx.arcTo(x + breedte, y, x + breedte, y + hoogte, straal);
  ctx.arcTo(x + breedte, y + hoogte, x, y + hoogte, straal);
  ctx.arcTo(x, y + hoogte, x, y, straal);
  ctx.arcTo(x, y, x + breedte, y, straal);
  ctx.closePath();
}

function tekenEten() {
  const cx = eten.x * GRID_GROOTTE + GRID_GROOTTE / 2;
  const cy = eten.y * GRID_GROOTTE + GRID_GROOTTE / 2;
  const puls = Math.sin(etenFase) * 1.5;
  const straal = GRID_GROOTTE / 2 - 4 + puls;

  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(cx - 1.5, cy - straal - 6, 3, 6);

  ctx.fillStyle = '#3fae4a';
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy - straal - 3, 5, 3, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = '#ff4d4d';
  ctx.shadowBlur = 10;
  const gradient = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, straal);
  gradient.addColorStop(0, '#ff8a8a');
  gradient.addColorStop(0.6, '#e83b3b');
  gradient.addColorStop(1, '#a11f1f');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, straal, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function tekenSlang() {
  for (let i = snake.length - 1; i >= 1; i--) {
    const deel = snake[i];
    const fractie = 1 - i / snake.length;
    const kleurHelder = Math.round(90 + fractie * 60);
    ctx.fillStyle = `rgb(20, ${kleurHelder}, ${Math.round(kleurHelder * 0.85)})`;
    const marge = 2;
    rondeRect(
      deel.x * GRID_GROOTTE + marge,
      deel.y * GRID_GROOTTE + marge,
      GRID_GROOTTE - marge * 2,
      GRID_GROOTTE - marge * 2,
      7
    );
    ctx.fill();
  }

  const kop = snake[0];
  const kopX = kop.x * GRID_GROOTTE;
  const kopY = kop.y * GRID_GROOTTE;

  ctx.save();
  ctx.shadowColor = '#2fe3a3';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#2fe3a3';
  rondeRect(kopX + 1, kopY + 1, GRID_GROOTTE - 2, GRID_GROOTTE - 2, 9);
  ctx.fill();
  ctx.restore();

  const midX = kopX + GRID_GROOTTE / 2;
  const midY = kopY + GRID_GROOTTE / 2;

  let tongX = midX;
  let tongY = midY;
  let oog1 = { x: midX - 5, y: midY - 5 };
  let oog2 = { x: midX - 5, y: midY - 5 };

  if (richting.x === 1) {
    tongX = kopX + GRID_GROOTTE;
    tongY = midY;
    oog1 = { x: kopX + GRID_GROOTTE - 7, y: kopY + 6 };
    oog2 = { x: kopX + GRID_GROOTTE - 7, y: kopY + GRID_GROOTTE - 6 };
  } else if (richting.x === -1) {
    tongX = kopX;
    tongY = midY;
    oog1 = { x: kopX + 7, y: kopY + 6 };
    oog2 = { x: kopX + 7, y: kopY + GRID_GROOTTE - 6 };
  } else if (richting.y === 1) {
    tongX = midX;
    tongY = kopY + GRID_GROOTTE;
    oog1 = { x: kopX + 6, y: kopY + GRID_GROOTTE - 7 };
    oog2 = { x: kopX + GRID_GROOTTE - 6, y: kopY + GRID_GROOTTE - 7 };
  } else if (richting.y === -1) {
    tongX = midX;
    tongY = kopY;
    oog1 = { x: kopX + 6, y: kopY + 7 };
    oog2 = { x: kopX + GRID_GROOTTE - 6, y: kopY + 7 };
  }

  ctx.strokeStyle = '#e34a4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(tongX, tongY);
  ctx.stroke();

  [oog1, oog2].forEach((oog) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(oog.x, oog.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(oog.x, oog.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function tekenSpel() {
  etenFase += 0.12;
  tekenAchtergrond();
  tekenEten();
  tekenSlang();
}

function tekenLus() {
  tekenSpel();
  if (!gameOverEl.hidden) return;
  requestAnimationFrame(tekenLus);
}

function eindigSpel() {
  spelActief = false;
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

function toonPreview() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  richting = { x: 1, y: 0 };
  volgendeRichting = { x: 1, y: 0 };
  zetNieuwEten();
  tekenSpel();
}

toonScorebord();
toonPreview();
