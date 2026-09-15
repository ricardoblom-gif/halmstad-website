const OPSLAG_SLEUTEL = 'halmstad_pinball_scores';
const MAX_OPGESLAGEN = 100;
const MAX_ZICHTBAAR = 15;
const START_BALLEN = 3;

const naamScherm = document.getElementById('naam-scherm');
const spelScherm = document.getElementById('spel-scherm');
const spelerNaamInput = document.getElementById('speler-naam');
const startKnop = document.getElementById('start-knop');
const opnieuwKnop = document.getElementById('opnieuw-knop');
const huidigeNaamEl = document.getElementById('huidige-naam');
const huidigeScoreEl = document.getElementById('huidige-score');
const huidigeBallenEl = document.getElementById('huidige-ballen');
const eindScoreEl = document.getElementById('eind-score');
const gameOverEl = document.getElementById('game-over');
const scorelijstEl = document.getElementById('scorelijst');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const BREEDTE = canvas.width;
const HOOGTE = canvas.height;
const ZWAARTEKRACHT = 0.35;
const BAL_STRAAL = 8;
const WAND = 10;

const FLIPPER_LENGTE = 65;
const FLIPPER_STRAAL = 8;
const LINKER_PIVOT = { x: 110, y: HOOGTE - 60 };
const RECHTER_PIVOT = { x: BREEDTE - 110, y: HOOGTE - 60 };
const LINKER_RUST = (20 * Math.PI) / 180;
const LINKER_ACTIEF = (-50 * Math.PI) / 180;
const RECHTER_RUST = Math.PI - LINKER_RUST;
const RECHTER_ACTIEF = Math.PI - LINKER_ACTIEF;

const BUMPERS = [
  { x: 110, y: 190, r: 18 },
  { x: 250, y: 190, r: 18 },
  { x: 180, y: 120, r: 20 },
];

let speler = '';
let bal, ballenOver, score, animatieId;
let linksIngedrukt = false;
let rechtsIngedrukt = false;
let linkerHoek = LINKER_RUST;
let rechterHoek = RECHTER_RUST;
let laatsteBumperHit = [0, 0, 0];

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

function nieuweBal() {
  bal = {
    x: BREEDTE / 2 + (Math.random() - 0.5) * 40,
    y: 60,
    vx: (Math.random() - 0.5) * 2,
    vy: 0,
  };
}

function startSpel() {
  ballenOver = START_BALLEN;
  score = 0;
  huidigeScoreEl.textContent = '0';
  huidigeBallenEl.textContent = String(ballenOver);
  gameOverEl.hidden = true;
  nieuweBal();
  cancelAnimationFrame(animatieId);
  animatieId = requestAnimationFrame(spelLus);
}

function dichtstbijPuntOpLijn(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const lengteKwadraat = abx * abx + aby * aby;
  let t = lengteKwadraat === 0 ? 0 : (apx * abx + apy * aby) / lengteKwadraat;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

function botsMetFlipper(pivot, hoek, actief) {
  const tip = { x: pivot.x + FLIPPER_LENGTE * Math.cos(hoek), y: pivot.y + FLIPPER_LENGTE * Math.sin(hoek) };
  const dichtst = dichtstbijPuntOpLijn(bal, pivot, tip);
  const dx = bal.x - dichtst.x;
  const dy = bal.y - dichtst.y;
  const afstand = Math.sqrt(dx * dx + dy * dy);
  const minAfstand = BAL_STRAAL + FLIPPER_STRAAL;

  if (afstand < minAfstand && afstand > 0) {
    const nx = dx / afstand;
    const ny = dy / afstand;

    bal.x = dichtst.x + nx * minAfstand;
    bal.y = dichtst.y + ny * minAfstand;

    const snelheidLangsNormaal = bal.vx * nx + bal.vy * ny;
    bal.vx -= 2 * snelheidLangsNormaal * nx;
    bal.vy -= 2 * snelheidLangsNormaal * ny;

    if (actief) {
      bal.vx += nx * 6;
      bal.vy += ny * 6 - 4;
    }
  }
}

function spelStap() {
  linkerHoek += ((linksIngedrukt ? LINKER_ACTIEF : LINKER_RUST) - linkerHoek) * 0.35;
  rechterHoek += ((rechtsIngedrukt ? RECHTER_ACTIEF : RECHTER_RUST) - rechterHoek) * 0.35;

  bal.vy += ZWAARTEKRACHT;
  bal.x += bal.vx;
  bal.y += bal.vy;

  if (bal.x - BAL_STRAAL < WAND) {
    bal.x = WAND + BAL_STRAAL;
    bal.vx = -bal.vx * 0.7;
  }
  if (bal.x + BAL_STRAAL > BREEDTE - WAND) {
    bal.x = BREEDTE - WAND - BAL_STRAAL;
    bal.vx = -bal.vx * 0.7;
  }
  if (bal.y - BAL_STRAAL < WAND) {
    bal.y = WAND + BAL_STRAAL;
    bal.vy = -bal.vy * 0.7;
  }

  BUMPERS.forEach((bumper, i) => {
    const dx = bal.x - bumper.x;
    const dy = bal.y - bumper.y;
    const afstand = Math.sqrt(dx * dx + dy * dy);
    const minAfstand = BAL_STRAAL + bumper.r;
    if (afstand < minAfstand && afstand > 0) {
      const nx = dx / afstand;
      const ny = dy / afstand;
      bal.x = bumper.x + nx * minAfstand;
      bal.y = bumper.y + ny * minAfstand;
      const snelheidLangsNormaal = bal.vx * nx + bal.vy * ny;
      bal.vx -= 2 * snelheidLangsNormaal * nx;
      bal.vy -= 2 * snelheidLangsNormaal * ny;
      bal.vx += nx * 2;
      bal.vy += ny * 2;

      const nu = Date.now();
      if (nu - laatsteBumperHit[i] > 250) {
        laatsteBumperHit[i] = nu;
        score += 100;
        huidigeScoreEl.textContent = String(score);
      }
    }
  });

  botsMetFlipper(LINKER_PIVOT, linkerHoek, linksIngedrukt);
  botsMetFlipper(RECHTER_PIVOT, rechterHoek, rechtsIngedrukt);

  if (bal.y - BAL_STRAAL > HOOGTE) {
    ballenOver -= 1;
    huidigeBallenEl.textContent = String(ballenOver);
    if (ballenOver <= 0) {
      eindigSpel();
      return;
    }
    nieuweBal();
  }
}

function tekenSpel() {
  ctx.fillStyle = '#101420';
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);

  ctx.strokeStyle = '#334';
  ctx.lineWidth = WAND;
  ctx.strokeRect(WAND / 2, WAND / 2, BREEDTE - WAND, HOOGTE - WAND);

  ctx.fillStyle = '#e8a33d';
  BUMPERS.forEach((bumper) => {
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = '#0f8f8f';
  ctx.lineWidth = FLIPPER_STRAAL * 2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(LINKER_PIVOT.x, LINKER_PIVOT.y);
  ctx.lineTo(LINKER_PIVOT.x + FLIPPER_LENGTE * Math.cos(linkerHoek), LINKER_PIVOT.y + FLIPPER_LENGTE * Math.sin(linkerHoek));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(RECHTER_PIVOT.x, RECHTER_PIVOT.y);
  ctx.lineTo(RECHTER_PIVOT.x + FLIPPER_LENGTE * Math.cos(rechterHoek), RECHTER_PIVOT.y + FLIPPER_LENGTE * Math.sin(rechterHoek));
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(bal.x, bal.y, BAL_STRAAL, 0, Math.PI * 2);
  ctx.fill();
}

function spelLus() {
  spelStap();
  if (ballenOver > 0) {
    tekenSpel();
    animatieId = requestAnimationFrame(spelLus);
  }
}

function eindigSpel() {
  cancelAnimationFrame(animatieId);
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

function verwerkToets(event, ingedrukt) {
  const doelElement = event.target.tagName;
  if (doelElement === 'INPUT' || doelElement === 'TEXTAREA') {
    return;
  }
  const toets = event.key.toLowerCase();
  if (toets === 'arrowleft' || toets === 'a') {
    linksIngedrukt = ingedrukt;
    event.preventDefault();
  } else if (toets === 'arrowright' || toets === 'd') {
    rechtsIngedrukt = ingedrukt;
    event.preventDefault();
  }
}

document.addEventListener('keydown', (event) => verwerkToets(event, true));
document.addEventListener('keyup', (event) => verwerkToets(event, false));

toonScorebord();
