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
const huidigeComboEl = document.getElementById('huidige-combo');
const eindScoreEl = document.getElementById('eind-score');
const gameOverEl = document.getElementById('game-over');
const scorelijstEl = document.getElementById('scorelijst');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const BREEDTE = canvas.width;
const HOOGTE = canvas.height;
const SPEELVELD_BREEDTE = 380;
const WAND = 10;
const ZWAARTEKRACHT = 0.35;
const BAL_STRAAL = 8;

const FLIPPER_LENGTE = 68;
const FLIPPER_STRAAL = 8;
const LINKER_PIVOT = { x: 115, y: HOOGTE - 75 };
const RECHTER_PIVOT = { x: SPEELVELD_BREEDTE - 115, y: HOOGTE - 75 };
const LINKER_RUST = (20 * Math.PI) / 180;
const LINKER_ACTIEF = (-50 * Math.PI) / 180;
const RECHTER_RUST = Math.PI - LINKER_RUST;
const RECHTER_ACTIEF = Math.PI - LINKER_ACTIEF;

const BUMPERS = [
  { x: SPEELVELD_BREEDTE / 2, y: 165, r: 21, kleur: '#ff6b6b' },
  { x: SPEELVELD_BREEDTE / 2 - 65, y: 255, r: 18, kleur: '#e8a33d' },
  { x: SPEELVELD_BREEDTE / 2 + 65, y: 255, r: 18, kleur: '#4fc3c3' },
];

const TARGETS = [
  { x: 26, y: 340, breedte: 34, hoogte: 14 },
  { x: SPEELVELD_BREEDTE - 60, y: 340, breedte: 34, hoogte: 14 },
];

const SLINGSHOTS = [
  { a: { x: 42, y: 510 }, b: { x: 118, y: 542 } },
  { a: { x: SPEELVELD_BREEDTE - 42, y: 510 }, b: { x: SPEELVELD_BREEDTE - 118, y: 542 } },
];

const TUNNEL_Y_MIN = 210;
const TUNNEL_Y_MAX = 260;
const TUNNEL_DUUR = 26;
const TUNNELS = {
  links: {
    exit: { x: 130, y: 55, vx: 3.4, vy: 3 },
    kleur: '#8be0d6',
  },
  rechts: {
    exit: { x: SPEELVELD_BREEDTE - 130, y: 55, vx: -3.4, vy: 3 },
    kleur: '#f4b183',
  },
};

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
let bumperGeraakt = [false, false, false];
let scorePopups = [];
let deeltjes = [];
let balTrail = [];
let plungerGeladen = false;
let plungerLading = 0;
let balStatus = 'wachtend';
let tunnelInfo = null;
let combo = 1;
let laatsteHitTijd = 0;
let schermSchudTijd = 0;
let schermFlitsKleur = null;
let schermFlitsTijd = 0;
let sterren = [];
for (let i = 0; i < 40; i++) {
  sterren.push({
    x: Math.random() * BREEDTE,
    y: Math.random() * HOOGTE,
    r: Math.random() * 1.5 + 0.5,
    fase: Math.random() * Math.PI * 2,
  });
}
let frameTeller = 0;

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
function speelZweep(vanaf, naar, duur) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(vanaf, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(naar, audioContext.currentTime + duur);
  gain.gain.setValueAtTime(0.14, audioContext.currentTime);
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
const geluidTunnelIn = () => speelZweep(300, 900, 0.3);
const geluidTunnelUit = () => speelZweep(900, 400, 0.25);
const geluidJackpot = () => {
  speelToon(660, 0.15, 'square', 0.14);
  setTimeout(() => speelToon(880, 0.15, 'square', 0.14), 90);
  setTimeout(() => speelToon(1100, 0.25, 'square', 0.14), 180);
};

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

function voegPopupToe(x, y, tekst, groot) {
  scorePopups.push({ x, y, tekst, leeftijd: 0, groot: !!groot });
}

function spawnDeeltjes(x, y, kleur, aantal = 14) {
  for (let i = 0; i < aantal; i++) {
    const hoek = Math.random() * Math.PI * 2;
    const snelheid = 1 + Math.random() * 3.5;
    deeltjes.push({
      x,
      y,
      vx: Math.cos(hoek) * snelheid,
      vy: Math.sin(hoek) * snelheid,
      leeftijd: 0,
      maxLeeftijd: 20 + Math.random() * 16,
      kleur,
      straal: 1.5 + Math.random() * 2,
    });
  }
}

function schud(sterkte) {
  schermSchudTijd = Math.max(schermSchudTijd, sterkte);
}

function flitsScherm(kleur, duur) {
  schermFlitsKleur = kleur;
  schermFlitsTijd = duur;
}

function verhoogScore(basisPunten, x, y, forceerCombo) {
  const nu = performance.now();
  if (!forceerCombo) {
    if (nu - laatsteHitTijd < 1500) {
      combo = Math.min(5, combo + 1);
    } else {
      combo = 1;
    }
    laatsteHitTijd = nu;
  }
  const punten = basisPunten * combo;
  score += punten;
  huidigeScoreEl.textContent = String(score);
  huidigeComboEl.textContent = 'x' + combo;
  voegPopupToe(x, y, '+' + punten + (combo > 1 ? ' (x' + combo + ')' : ''));
}

function nieuweBal() {
  bal = { x: PLUNGER_X, y: PLUNGER_RUST_Y, vx: 0, vy: 0 };
  balStatus = 'wachtend';
  plungerGeladen = false;
  plungerLading = 0;
  balTrail = [];
  tunnelInfo = null;
  combo = 1;
  huidigeComboEl.textContent = 'x1';
  bumperGeraakt = [false, false, false];
}

function startSpel() {
  initAudio();
  ballenOver = START_BALLEN;
  score = 0;
  scorePopups = [];
  deeltjes = [];
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

function controleerTunnels() {
  if (bal.x - BAL_STRAAL < WAND + 6 && bal.vx < -1 && bal.y > TUNNEL_Y_MIN && bal.y < TUNNEL_Y_MAX) {
    startTunnel('links');
  } else if (bal.x + BAL_STRAAL > SPEELVELD_BREEDTE - WAND - 6 && bal.vx > 1 && bal.y > TUNNEL_Y_MIN && bal.y < TUNNEL_Y_MAX) {
    startTunnel('rechts');
  }
}

function startTunnel(kant) {
  balStatus = 'in_tunnel';
  tunnelInfo = { kant, tijd: 0 };
  geluidTunnelIn();
  spawnDeeltjes(bal.x, bal.y, TUNNELS[kant].kleur, 16);
  schud(4);
}

function eindigTunnel() {
  const tunnel = TUNNELS[tunnelInfo.kant];
  bal.x = tunnel.exit.x;
  bal.y = tunnel.exit.y;
  bal.vx = tunnel.exit.vx;
  bal.vy = tunnel.exit.vy;
  balStatus = 'onderweg';
  geluidTunnelUit();
  spawnDeeltjes(bal.x, bal.y, tunnel.kleur, 16);
  verhoogScore(300, bal.x, bal.y - 20, true);
  tunnelInfo = null;
}

function controleerJackpot() {
  if (bumperGeraakt.every(Boolean)) {
    bumperGeraakt = [false, false, false];
    score += 1000;
    huidigeScoreEl.textContent = String(score);
    voegPopupToe(SPEELVELD_BREEDTE / 2, 260, 'JACKPOT +1000', true);
    geluidJackpot();
    flitsScherm('#ffe08a', 10);
    schud(8);
    spawnDeeltjes(SPEELVELD_BREEDTE / 2, 200, '#ffe08a', 40);
  }
}

function spelStap() {
  frameTeller++;
  linkerHoek += ((linksIngedrukt ? LINKER_ACTIEF : LINKER_RUST) - linkerHoek) * 0.35;
  rechterHoek += ((rechtsIngedrukt ? RECHTER_ACTIEF : RECHTER_RUST) - rechterHoek) * 0.35;

  verwerkPlunger();

  if (balStatus === 'in_tunnel') {
    tunnelInfo.tijd++;
    if (tunnelInfo.tijd > TUNNEL_DUUR) {
      eindigTunnel();
    }
  }

  if (balStatus === 'onderweg') {
    bal.vy += ZWAARTEKRACHT;
    bal.x += bal.vx;
    bal.y += bal.vy;

    balTrail.push({ x: bal.x, y: bal.y });
    if (balTrail.length > 8) balTrail.shift();

    controleerTunnels();
  }

  if (balStatus === 'onderweg') {
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
          bumperGeraakt[i] = true;
          geluidBumper();
          spawnDeeltjes(bumper.x, bumper.y, bumper.kleur, 10);
          verhoogScore(100, bumper.x, bumper.y - bumper.r - 10);
          controleerJackpot();
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
          spawnDeeltjes(target.x + target.breedte / 2, target.y, '#7dd3d3', 10);
          verhoogScore(50, target.x + target.breedte / 2, target.y - 10);
        }
      }
    });

    SLINGSHOTS.forEach((sling) => {
      const geraakt = botsMetLijnstuk(sling.a, sling.b, 6, 5);
      if (geraakt) {
        geluidFlipper();
        spawnDeeltjes((sling.a.x + sling.b.x) / 2, (sling.a.y + sling.b.y) / 2, '#aab', 8);
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
  }

  scorePopups.forEach((p) => (p.leeftijd += 1));
  scorePopups = scorePopups.filter((p) => p.leeftijd < 45);

  deeltjes.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.leeftijd += 1;
  });
  deeltjes = deeltjes.filter((p) => p.leeftijd < p.maxLeeftijd);

  flitsBumper = flitsBumper.map((f) => Math.max(0, f - 0.06));
  flitsTarget = flitsTarget.map((f) => Math.max(0, f - 0.06));
  if (schermSchudTijd > 0) schermSchudTijd -= 1;
  if (schermFlitsTijd > 0) schermFlitsTijd -= 1;

  if (balStatus === 'onderweg' && bal.y - BAL_STRAAL > HOOGTE) {
    ballenOver -= 1;
    huidigeBallenEl.textContent = String(ballenOver);
    if (ballenOver <= 0) {
      eindigSpel();
      return;
    }
    geluidVerlies();
    schud(6);
    nieuweBal();
  }
}

function tekenAchtergrond() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HOOGTE);
  gradient.addColorStop(0, '#1a1f3a');
  gradient.addColorStop(1, '#0a0c18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);

  sterren.forEach((ster) => {
    const alpha = 0.3 + 0.4 * Math.sin(frameTeller * 0.03 + ster.fase);
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
    ctx.beginPath();
    ctx.arc(ster.x, ster.y, ster.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function tekenTunnels() {
  Object.entries(TUNNELS).forEach(([kant, tunnel]) => {
    const isLinks = kant === 'links';
    const wandX = isLinks ? WAND : SPEELVELD_BREEDTE - WAND;
    ctx.save();
    ctx.shadowColor = tunnel.kleur;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = tunnel.kleur;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wandX, TUNNEL_Y_MIN);
    ctx.lineTo(wandX, TUNNEL_Y_MAX);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = tunnel.kleur;
    ctx.beginPath();
    ctx.arc(tunnel.exit.x, tunnel.exit.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
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

function tekenBalTrail() {
  balTrail.forEach((p, i) => {
    const alpha = (i / balTrail.length) * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, BAL_STRAAL * (0.5 + (i / balTrail.length) * 0.5), 0, Math.PI * 2);
    ctx.fill();
  });
}

function tekenBal() {
  if (balStatus === 'in_tunnel') return;
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

function tekenDeeltjes() {
  deeltjes.forEach((p) => {
    const alpha = 1 - p.leeftijd / p.maxLeeftijd;
    ctx.fillStyle = p.kleur;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.straal, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function tekenPopups() {
  scorePopups.forEach((p) => {
    const alpha = 1 - p.leeftijd / 45;
    ctx.fillStyle = p.groot ? `rgba(255, 224, 138, ${alpha})` : `rgba(255, 219, 112, ${alpha})`;
    ctx.font = p.groot ? 'bold 22px system-ui, Arial, sans-serif' : 'bold 16px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.tekst, p.x, p.y - p.leeftijd * 0.9);
  });
  ctx.textAlign = 'left';
}

function tekenSpel() {
  ctx.save();
  if (schermSchudTijd > 0) {
    ctx.translate((Math.random() - 0.5) * schermSchudTijd, (Math.random() - 0.5) * schermSchudTijd);
  }

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

  tekenTunnels();
  tekenPlunger();

  SLINGSHOTS.forEach(tekenSlingshot);
  BUMPERS.forEach((bumper, i) => tekenBumper(bumper, flitsBumper[i]));
  TARGETS.forEach((target, i) => tekenTarget(target, flitsTarget[i]));

  tekenFlipper(LINKER_PIVOT, linkerHoek);
  tekenFlipper(RECHTER_PIVOT, rechterHoek);

  tekenBalTrail();
  tekenBal();
  tekenDeeltjes();
  tekenPopups();

  if (plungerGeladen) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LADEN', PLUNGER_X, PLUNGER_RUST_Y - 40);
    ctx.textAlign = 'left';
  }

  if (schermFlitsTijd > 0 && schermFlitsKleur) {
    ctx.fillStyle = schermFlitsKleur;
    ctx.globalAlpha = (schermFlitsTijd / 10) * 0.35;
    ctx.fillRect(0, 0, BREEDTE, HOOGTE);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
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
