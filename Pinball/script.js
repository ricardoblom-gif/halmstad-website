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
const SPEELVELD_BREEDTE = 340;
const WAND = 10;
const ZWAARTEKRACHT = 0.35;
const BAL_STRAAL = 8;

const FLIPPER_LENGTE = 65;
const FLIPPER_STRAAL = 8;
const LINKER_PIVOT = { x: 100, y: HOOGTE - 70 };
const RECHTER_PIVOT = { x: 240, y: HOOGTE - 70 };
const LINKER_RUST = (20 * Math.PI) / 180;
const LINKER_ACTIEF = (-50 * Math.PI) / 180;
const RECHTER_RUST = Math.PI - LINKER_RUST;
const RECHTER_ACTIEF = Math.PI - LINKER_ACTIEF;

const BUMPERS = [
  { x: 170, y: 150, r: 20, kleur: '#ff6b6b' },
  { x: 105, y: 235, r: 18, kleur: '#e8a33d' },
  { x: 235, y: 235, r: 18, kleur: '#4fc3c3' },
];

const TARGETS = [
  { x: 30, y: 80, breedte: 34, hoogte: 14 },
  { x: SPEELVELD_BREEDTE - 64, y: 80, breedte: 34, hoogte: 14 },
];

const SLINGSHOTS = [
  { a: { x: 38, y: 475 }, b: { x: 108, y: 500 } },
  { a: { x: SPEELVELD_BREEDTE - 38, y: 475 }, b: { x: SPEELVELD_BREEDTE - 108, y: 500 } },
];

const LANE_X = SPEELVELD_BREEDTE;
const LANE_WAND_Y_START = 175;
const PLUNGER_X = SPEELVELD_BREEDTE + (BREEDTE - WAND - SPEELVELD_BREEDTE) / 2;
const PLUNGER_RUST_Y = HOOGTE - WAND - BAL_STRAAL - 12;
const PLUNGER_MAX_OFFSET = 22;

let speler = '';
let bal, ballenOver, score, animatieId;
let linksIngedrukt = false;
let rechtsIngedrukt = false;
let linkerHoek = LINKER_RUST;
let rechterHoek = RECHTER_RUST;
let laatsteBumperHit = [0, 0, 0];
let laatsteTargetHit = [0, 0];
let flitsBumper = [0, 0, 0];
let flitsTarget = [0, 0];
let laatsteFrameTijd = 0;
let scorePopups = [];
let plungerGeladen = false;
let plungerLading = 0;
let balStatus = 'wachtend';

let audioContext = null;
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function speelToon(freq, duur, type = 'square', volume = 0.15) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duur);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duur);
}
const geluidBumper = () => speelToon(520, 0.12, 'square', 0.12);
const geluidTarget = () => speelToon(760, 0.1, 'triangle', 0.12);
const geluidFlipper = () => speelToon(180, 0.06, 'square', 0.08);
const geluidLancering = () => speelToon(220, 0.25, 'sawtooth', 0.1);
const geluidVerlies = () => speelToon(120, 0.4, 'sawtooth', 0.12);

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

function voegPopupToe(x, y, tekst) {
  scorePopups.push({ x, y, tekst, leeftijd: 0 });
}

function verhoogScore(punten, x, y) {
  score += punten;
  huidigeScoreEl.textContent = String(score);
  voegPopupToe(x, y, '+' + punten);
}

function nieuweBal() {
  bal = { x: PLUNGER_X, y: PLUNGER_RUST_Y, vx: 0, vy: 0 };
  balStatus = 'wachtend';
  plungerGeladen = false;
  plungerLading = 0;
}

function startSpel() {
  initAudio();
  ballenOver = START_BALLEN;
  score = 0;
  scorePopups = [];
  huidigeScoreEl.textContent = '0';
  huidigeBallenEl.textContent = String(ballenOver);
  gameOverEl.hidden = true;
  nieuweBal();
  cancelAnimationFrame(animatieId);
  laatsteFrameTijd = performance.now();
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

function botsMetLijnstuk(a, b, straal, extraKick) {
  const dichtst = dichtstbijPuntOpLijn(bal, a, b);
  const dx = bal.x - dichtst.x;
  const dy = bal.y - dichtst.y;
  const afstand = Math.sqrt(dx * dx + dy * dy);
  const minAfstand = BAL_STRAAL + straal;

  if (afstand < minAfstand && afstand > 0) {
    const nx = dx / afstand;
    const ny = dy / afstand;
    bal.x = dichtst.x + nx * minAfstand;
    bal.y = dichtst.y + ny * minAfstand;
    const snelheidLangsNormaal = bal.vx * nx + bal.vy * ny;
    bal.vx -= 2 * snelheidLangsNormaal * nx;
    bal.vy -= 2 * snelheidLangsNormaal * ny;
    if (extraKick) {
      bal.vx += nx * extraKick;
      bal.vy += ny * extraKick - (extraKick > 0 ? 2 : 0);
      return true;
    }
  }
  return false;
}

function verwerkPlunger() {
  if (plungerGeladen && balStatus === 'wachtend') {
    plungerLading = Math.min(1, plungerLading + 0.03);
    bal.y = PLUNGER_RUST_Y + plungerLading * PLUNGER_MAX_OFFSET;
  }
}

function laatPlungerLos() {
  plungerGeladen = false;
  if (balStatus !== 'wachtend') {
    return;
  }
  geluidLancering();
  balStatus = 'onderweg';
  bal.vx = -1.8;
  bal.vy = -(9 + plungerLading * 15);
  plungerLading = 0;
}

function spelStap() {
  linkerHoek += ((linksIngedrukt ? LINKER_ACTIEF : LINKER_RUST) - linkerHoek) * 0.35;
  rechterHoek += ((rechtsIngedrukt ? RECHTER_ACTIEF : RECHTER_RUST) - rechterHoek) * 0.35;

  verwerkPlunger();

  if (balStatus === 'onderweg') {
    bal.vy += ZWAARTEKRACHT;
    bal.x += bal.vx;
    bal.y += bal.vy;
  }

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

  if (bal.y > LANE_WAND_Y_START) {
    if (bal.x + BAL_STRAAL > LANE_X && bal.x < LANE_X + 20) {
      bal.x = LANE_X - BAL_STRAAL;
      bal.vx = -Math.abs(bal.vx) * 0.6;
    } else if (bal.x - BAL_STRAAL < LANE_X && bal.x > LANE_X - 20 && bal.vx > 0) {
      bal.x = LANE_X - BAL_STRAAL;
      bal.vx = -bal.vx * 0.6;
    }
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
      bal.vx += nx * 3;
      bal.vy += ny * 3;

      const nu = performance.now();
      if (nu - laatsteBumperHit[i] > 220) {
        laatsteBumperHit[i] = nu;
        flitsBumper[i] = 1;
        geluidBumper();
        verhoogScore(100, bumper.x, bumper.y - bumper.r - 10);
      }
    }
  });

  TARGETS.forEach((target, i) => {
    const dichtsteX = Math.max(target.x, Math.min(bal.x, target.x + target.breedte));
    const dichtsteY = Math.max(target.y, Math.min(bal.y, target.y + target.hoogte));
    const dx = bal.x - dichtsteX;
    const dy = bal.y - dichtsteY;
    const afstand = Math.sqrt(dx * dx + dy * dy);
    if (afstand < BAL_STRAAL && afstand > 0) {
      const nx = dx / afstand;
      const ny = dy / afstand;
      bal.x = dichtsteX + nx * BAL_STRAAL;
      bal.y = dichtsteY + ny * BAL_STRAAL;
      bal.vy = -Math.abs(bal.vy) * 0.6 - 1;

      const nu = performance.now();
      if (nu - laatsteTargetHit[i] > 300) {
        laatsteTargetHit[i] = nu;
        flitsTarget[i] = 1;
        geluidTarget();
        verhoogScore(50, target.x + target.breedte / 2, target.y - 10);
      }
    }
  });

  SLINGSHOTS.forEach((sling) => {
    const geraakt = botsMetLijnstuk(sling.a, sling.b, 6, 5);
    if (geraakt) {
      geluidFlipper();
    }
  });

  const linksGeraakt = botsMetLijnstuk(LINKER_PIVOT, {
    x: LINKER_PIVOT.x + FLIPPER_LENGTE * Math.cos(linkerHoek),
    y: LINKER_PIVOT.y + FLIPPER_LENGTE * Math.sin(linkerHoek),
  }, FLIPPER_STRAAL, linksIngedrukt ? 6 : 0);
  const rechtsGeraakt = botsMetLijnstuk(RECHTER_PIVOT, {
    x: RECHTER_PIVOT.x + FLIPPER_LENGTE * Math.cos(rechterHoek),
    y: RECHTER_PIVOT.y + FLIPPER_LENGTE * Math.sin(rechterHoek),
  }, FLIPPER_STRAAL, rechtsIngedrukt ? 6 : 0);
  if (linksGeraakt && linksIngedrukt) geluidFlipper();
  if (rechtsGeraakt && rechtsIngedrukt) geluidFlipper();

  scorePopups.forEach((p) => (p.leeftijd += 1));
  scorePopups = scorePopups.filter((p) => p.leeftijd < 40);

  flitsBumper = flitsBumper.map((f) => Math.max(0, f - 0.06));
  flitsTarget = flitsTarget.map((f) => Math.max(0, f - 0.06));

  if (bal.y - BAL_STRAAL > HOOGTE) {
    ballenOver -= 1;
    huidigeBallenEl.textContent = String(ballenOver);
    if (ballenOver <= 0) {
      eindigSpel();
      return;
    }
    geluidVerlies();
    nieuweBal();
  }
}

function tekenAchtergrond() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HOOGTE);
  gradient.addColorStop(0, '#1a1f3a');
  gradient.addColorStop(1, '#0a0c18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);
}

function tekenBumper(bumper, flits) {
  const straalMetFlits = bumper.r + flits * 4;
  ctx.save();
  ctx.shadowColor = bumper.kleur;
  ctx.shadowBlur = 12 + flits * 20;
  const gradient = ctx.createRadialGradient(bumper.x - 5, bumper.y - 5, 2, bumper.x, bumper.y, straalMetFlits);
  gradient.addColorStop(0, flits > 0.3 ? '#ffffff' : '#ffffffaa');
  gradient.addColorStop(0.5, bumper.kleur);
  gradient.addColorStop(1, '#000000aa');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(bumper.x, bumper.y, straalMetFlits, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function tekenTarget(target, flits) {
  ctx.save();
  ctx.shadowColor = '#7dd3d3';
  ctx.shadowBlur = 6 + flits * 16;
  ctx.fillStyle = flits > 0.3 ? '#ffffff' : '#7dd3d3';
  ctx.fillRect(target.x, target.y, target.breedte, target.hoogte);
  ctx.restore();
}

function tekenFlipper(pivot, hoek) {
  const tip = { x: pivot.x + FLIPPER_LENGTE * Math.cos(hoek), y: pivot.y + FLIPPER_LENGTE * Math.sin(hoek) };
  const gradient = ctx.createLinearGradient(pivot.x, pivot.y, tip.x, tip.y);
  gradient.addColorStop(0, '#14a8a8');
  gradient.addColorStop(1, '#0b6e6e');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = FLIPPER_STRAAL * 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
}

function tekenSlingshot(sling) {
  ctx.strokeStyle = '#556';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sling.a.x, sling.a.y);
  ctx.lineTo(sling.b.x, sling.b.y);
  ctx.stroke();
}

function tekenBal() {
  const gradient = ctx.createRadialGradient(bal.x - 3, bal.y - 3, 1, bal.x, bal.y, BAL_STRAAL);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#a0a0a8');
  ctx.save();
  ctx.shadowColor = '#000000aa';
  ctx.shadowBlur = 6;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(bal.x, bal.y, BAL_STRAAL, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function tekenPlunger() {
  const staafY = PLUNGER_RUST_Y + BAL_STRAAL + 6 + plungerLading * PLUNGER_MAX_OFFSET;
  ctx.fillStyle = '#e8a33d';
  ctx.fillRect(PLUNGER_X - 6, staafY, 12, HOOGTE - WAND - staafY);
}

function tekenPopups() {
  scorePopups.forEach((p) => {
    const alpha = 1 - p.leeftijd / 40;
    ctx.fillStyle = `rgba(255, 219, 112, ${alpha})`;
    ctx.font = 'bold 16px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.tekst, p.x, p.y - p.leeftijd * 0.8);
  });
  ctx.textAlign = 'left';
}

function tekenSpel() {
  tekenAchtergrond();

  ctx.strokeStyle = '#4a4f6a';
  ctx.lineWidth = WAND;
  ctx.strokeRect(WAND / 2, WAND / 2, BREEDTE - WAND, HOOGTE - WAND);

  ctx.strokeStyle = '#333850';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(LANE_X, LANE_WAND_Y_START);
  ctx.lineTo(LANE_X, HOOGTE - WAND);
  ctx.stroke();

  tekenPlunger();

  SLINGSHOTS.forEach(tekenSlingshot);
  BUMPERS.forEach((bumper, i) => tekenBumper(bumper, flitsBumper[i]));
  TARGETS.forEach((target, i) => tekenTarget(target, flitsTarget[i]));

  tekenFlipper(LINKER_PIVOT, linkerHoek);
  tekenFlipper(RECHTER_PIVOT, rechterHoek);

  tekenBal();
  tekenPopups();

  if (plungerGeladen) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LADEN', PLUNGER_X, PLUNGER_RUST_Y - 40);
    ctx.textAlign = 'left';
  }
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
  geluidVerlies();
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

function verwerkToetsDown(event) {
  const doelElement = event.target.tagName;
  if (doelElement === 'INPUT' || doelElement === 'TEXTAREA') {
    return;
  }
  const toets = event.key.toLowerCase();
  if (toets === 'arrowleft' || toets === 'a') {
    linksIngedrukt = true;
    event.preventDefault();
  } else if (toets === 'arrowright' || toets === 'd') {
    rechtsIngedrukt = true;
    event.preventDefault();
  } else if (toets === ' ') {
    plungerGeladen = true;
    event.preventDefault();
  }
}

function verwerkToetsUp(event) {
  const doelElement = event.target.tagName;
  if (doelElement === 'INPUT' || doelElement === 'TEXTAREA') {
    return;
  }
  const toets = event.key.toLowerCase();
  if (toets === 'arrowleft' || toets === 'a') {
    linksIngedrukt = false;
    event.preventDefault();
  } else if (toets === 'arrowright' || toets === 'd') {
    rechtsIngedrukt = false;
    event.preventDefault();
  } else if (toets === ' ') {
    laatPlungerLos();
    event.preventDefault();
  }
}

document.addEventListener('keydown', verwerkToetsDown);
document.addEventListener('keyup', verwerkToetsUp);

toonScorebord();
