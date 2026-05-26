'use strict';

// --- DOM ELEMENT REFERENCES ---
const logListEl = document.getElementById('log-list');

// --- GAME ROUTING & ABSTRACTION LAYOUT ---
let activeMode = 'pvp'; // 'pvp' or 'ai'
let playing = true;
let isRolling = false;
let isCPUThinking = false;

// Selecting navigation tabs
const navTabs = document.querySelectorAll('.nav-tab');

// Global selectors mapper
const getActiveEl = (baseSelector) => {
  if (activeMode === 'pvp') {
    if (baseSelector === 'd0') return document.querySelector('#pvp-mode .dice--0');
    if (baseSelector === 'd1') return document.querySelector('#pvp-mode .dice--1');
    if (baseSelector === 'player0') return document.querySelector('#pvp-mode .player--0');
    if (baseSelector === 'player1') return document.querySelector('#pvp-mode .player--1');
    if (baseSelector === 'score0') return document.getElementById('score--0');
    if (baseSelector === 'score1') return document.getElementById('score--1');
    if (baseSelector === 'current0') return document.getElementById('current--0');
    if (baseSelector === 'current1') return document.getElementById('current--1');
    if (baseSelector === 'name0') return document.getElementById('name--0');
    if (baseSelector === 'name1') return document.getElementById('name--1');
    if (baseSelector === 'btnRoll') return document.querySelector('#pvp-mode .btn--roll');
    if (baseSelector === 'btnHold') return document.querySelector('#pvp-mode .btn--hold');
    if (baseSelector === 'modeCheckbox') return document.querySelector('#pvp-mode .mode-checkbox-el');
    if (baseSelector === 'targetSelect') return document.querySelector('#pvp-mode .target-selector-el');
    if (baseSelector === 'powerups0') return document.getElementById('powerups--0');
    if (baseSelector === 'powerups1') return document.getElementById('powerups--1');
  } else {
    if (baseSelector === 'd0') return document.querySelector('#ai-mode .dice-ai--0');
    if (baseSelector === 'd1') return document.querySelector('#ai-mode .dice-ai--1');
    if (baseSelector === 'player0') return document.querySelector('#ai-mode .player-ai--0');
    if (baseSelector === 'player1') return document.querySelector('#ai-mode .player-ai--1');
    if (baseSelector === 'score0') return document.getElementById('ai-score--0');
    if (baseSelector === 'score1') return document.getElementById('ai-score--1');
    if (baseSelector === 'current0') return document.getElementById('ai-current--0');
    if (baseSelector === 'current1') return document.getElementById('ai-current--1');
    if (baseSelector === 'name0') return document.getElementById('ai-name--0');
    if (baseSelector === 'name1') return document.getElementById('ai-name--1');
    if (baseSelector === 'btnRoll') return document.querySelector('#ai-mode .btn-ai--roll');
    if (baseSelector === 'btnHold') return document.querySelector('#ai-mode .btn-ai--hold');
    if (baseSelector === 'modeCheckbox') return document.querySelector('#ai-mode .mode-checkbox-el');
    if (baseSelector === 'targetSelect') return { value: 100 }; // AI Mode target is fixed at 100
    if (baseSelector === 'powerups0') return document.getElementById('ai-powerups--0');
    if (baseSelector === 'powerups1') return document.getElementById('ai-powerups--1');
  }
};

// --- DATA STRUCTURES ---
let scores, currentScore, activePlayer;
let rollStreak, isFeverMode;

// Power-ups state: index 0 = Player 1, index 1 = Player 2
// Index values mapping: 0=shield, 1=double, 2=siphon, 3=lucky
let powerupsUsed = [
  [false, false, false, false],
  [false, false, false, false]
];
let activeShield = [false, false];
let doubleDownRollsLeft = [0, 0];

const playerNames = ['Player 1', 'Player 2'];
const aiNames = ['Hero Player', 'Nano 🤖']; // Starts easy by default

let aiDifficulty = 'easy'; // 'easy' | 'medium' | 'hard'

// --- SYNTHESIZED SOUND ENGINE (Web Audio API) ---
let audioEnabled = true;
let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
};

const playSynthSound = (frequencySequence, durations, type = 'sine', sweep = false) => {
  if (!audioEnabled) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    let time = audioCtx.currentTime;
    
    frequencySequence.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      
      const duration = durations[index] || 0.1;
      
      if (sweep && index === frequencySequence.length - 1) {
        osc.frequency.exponentialRampToValueAtTime(80, time + duration);
      }
      
      gainNode.gain.setValueAtTime(0.06, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
      
      time += duration * 0.75;
    });
  } catch (e) {
    console.error("Synthesizer Error", e);
  }
};

const playRollSound = () => playSynthSound([330, 480, 600], [0.04, 0.04, 0.04], 'triangle');
const playHoldSound = () => playSynthSound([523.25, 659.25, 783.99, 1046.50], [0.08, 0.08, 0.08, 0.2], 'sine');
const playBuzzerSound = () => playSynthSound([196, 147, 110], [0.12, 0.12, 0.28], 'sawtooth', true);
const playWinSound = () => playSynthSound([523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00], [0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.35], 'sine');
const playResetSound = () => playSynthSound([440, 554, 659], [0.08, 0.08, 0.16], 'triangle');
const playFeverSound = () => playSynthSound([783.99, 1046.50, 783.99, 1046.50], [0.08, 0.08, 0.08, 0.25], 'sawtooth');

// --- AUDIO SWITCH CONTROLLER ---
document.querySelectorAll('.btn--sound').forEach(btn => {
  btn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    document.querySelectorAll('.btn--sound').forEach(b => {
      if (audioEnabled) {
        b.classList.remove('muted');
        b.textContent = '🔊 Audio';
      } else {
        b.classList.add('muted');
        b.textContent = '🔇 Mute';
      }
    });
    localStorage.setItem('pig-arcade-audio', audioEnabled ? 'enabled' : 'muted');
    if (audioEnabled) playResetSound();
  });
});

// --- CANVAS CONFETTI & DEPOSIT PARTICLE PHYSICS ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let confettiParticles = [];
let confettiFrameId = null;

const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    this.size = Math.random() * 8 + 5;
    this.color = `hsl(${Math.random() * 360}, 85%, 65%)`;
    if (Math.random() > 0.45) {
      const hue = Math.random() > 0.5 ? 275 : 325; 
      this.color = `hsl(${hue + (Math.random() * 20 - 10)}, 95%, 65%)`;
    }
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * 4 + 4;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
    this.type = 'confetti';
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    if (this.y > canvas.height) {
      this.y = -20;
      this.x = Math.random() * canvas.width;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class DepositParticle {
  constructor(startX, startY, targetX, targetY) {
    this.x = startX;
    this.y = startY;
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.progress = 0;
    this.speed = Math.random() * 0.035 + 0.025; 
    this.size = Math.random() * 6 + 4;
    this.color = `hsl(275, 95%, 68%)`; 
    if (Math.random() > 0.5) this.color = `hsl(190, 95%, 60%)`; 
    this.drift = Math.random() * 80 - 40;
    this.type = 'deposit';
  }
  update() {
    this.progress += this.speed;
    if (this.progress > 1) this.progress = 1;
    
    const p = this.progress;
    const arcX = Math.sin(p * Math.PI) * this.drift;
    const arcY = -Math.sin(p * Math.PI) * 75; 
    this.x = this.startX * (1 - p) + this.targetX * p + arcX;
    this.y = this.startY * (1 - p) + this.targetY * p + arcY;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(Math.cos((i * 90) * Math.PI / 180) * this.size, Math.sin((i * 90) * Math.PI / 180) * this.size);
      ctx.lineTo(Math.cos((45 + i * 90) * Math.PI / 180) * (this.size / 2.5), Math.sin((45 + i * 90) * Math.PI / 180) * (this.size / 2.5));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

const startConfetti = () => {
  confettiParticles = confettiParticles.filter(p => p.type === 'deposit'); 
  for (let i = 0; i < 120; i++) {
    confettiParticles.push(new ConfettiParticle());
  }
  if (!confettiFrameId) animateConfetti();
};

const stopConfetti = () => {
  confettiParticles = confettiParticles.filter(p => p.type === 'deposit');
};

const spawnDepositParticles = (playerNum) => {
  try {
    const diceEl = getActiveEl('d0');
    const scoreEl = getActiveEl(`score${playerNum}`);
    if (!diceEl || !scoreEl) return;
    
    const dRect = diceEl.getBoundingClientRect();
    const sRect = scoreEl.getBoundingClientRect();
    
    const startX = dRect.left + dRect.width / 2;
    const startY = dRect.top + dRect.height / 2;
    const targetX = sRect.left + sRect.width / 2;
    const targetY = sRect.top + sRect.height / 2;
    
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        if (!playing) return;
        const p = new DepositParticle(startX, startY, targetX, targetY);
        confettiParticles.push(p);
      }, i * 35);
    }
    
    if (!confettiFrameId) animateConfetti();
  } catch (e) {
    console.error("Bezier particles failed: ", e);
  }
};

const animateConfetti = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  confettiParticles.forEach((p, idx) => {
    p.update();
    p.draw();
    if (p.type === 'deposit' && p.progress >= 1) {
      confettiParticles.splice(idx, 1);
    }
  });
  
  if (confettiParticles.length > 0) {
    confettiFrameId = requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiFrameId = null;
  }
};

// --- DATA RANKINGS AND LOG ENGINE ---
let stats = {
  highScore: 0,
  bestTurn: 0,
  totalRolls: 0,
  totalBusts: 0,
  diceCounts: [0, 0, 0, 0, 0, 0]
};

const loadStats = () => {
  const loaded = localStorage.getItem('pig-arcade-stats');
  if (loaded) stats = JSON.parse(loaded);
};
loadStats();

const saveStats = () => {
  localStorage.setItem('pig-arcade-stats', JSON.stringify(stats));
};

const addLog = (text, type = 'system') => {
  if (!logListEl) return;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const item = document.createElement('div');
  item.className = `log-item ${type}`;
  item.innerHTML = `[${time}] ${text}`;
  logListEl.appendChild(item);
  logListEl.scrollTop = logListEl.scrollHeight;
};

document.getElementById('clear-logs').addEventListener('click', () => {
  logListEl.innerHTML = '';
  addLog("Log history cleared.", "system");
});

// --- IN-PLACE RENAMING ---
window.editPlayerName = function(playerNum) {
  if (!playing || isRolling || isCPUThinking) return;
  if (activeMode === 'ai' && playerNum === 1) return; // Locked bot renames
  
  const nameEl = getActiveEl(`name${playerNum}`);
  const currentName = activeMode === 'pvp' ? playerNames[playerNum] : aiNames[playerNum];
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'name-input';
  input.maxLength = 12;
  
  nameEl.parentNode.replaceChild(input, nameEl);
  input.focus();
  input.select();
  
  const saveName = () => {
    let newName = input.value.trim();
    if (newName === "") newName = playerNum === 0 ? "Player 1" : "Player 2";
    
    if (activeMode === 'pvp') {
      playerNames[playerNum] = newName;
    } else {
      aiNames[playerNum] = newName;
    }
    
    nameEl.textContent = newName;
    input.parentNode.replaceChild(nameEl, input);
    
    addLog(`Renamed Player ${playerNum + 1} to "<b>${newName}</b>".`, `player${playerNum}`);
  };
  
  input.addEventListener('blur', saveName);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveName();
  });
};

// --- ACTIVE POWER-UP ENGINE ---
const updatePowerupsUI = () => {
  for (let p = 0; p < 2; p++) {
    const parent = getActiveEl(`powerups${p}`);
    if (!parent) continue;
    
    const cards = parent.querySelectorAll('.powerup-card');
    cards.forEach(card => {
      const type = card.getAttribute('data-powerup');
      const idx = ['shield', 'double', 'siphon', 'lucky'].indexOf(type);
      
      card.classList.remove('used', 'disabled');
      
      if (powerupsUsed[p][idx]) {
        card.classList.add('used');
        card.querySelector('.powerup-count').textContent = '0';
      } else {
        card.querySelector('.powerup-count').textContent = '1';
        
        // Disabled visually if not active player's turn or game locked
        if (activePlayer !== p || !playing || isRolling || (p === 0 && isCPUThinking)) {
          card.classList.add('disabled');
        }
      }
    });
  }
};

const usePowerup = function(playerNum, type) {
  if (!playing || isRolling) return;
  // If human plays while CPU is processing, return
  if (playerNum === 0 && isCPUThinking) return;
  if (activePlayer !== playerNum) return; 
  
  const powerupIdx = ['shield', 'double', 'siphon', 'lucky'].indexOf(type);
  if (powerupsUsed[playerNum][powerupIdx]) return; 
  
  const nameStr = activeMode === 'pvp' ? playerNames[playerNum] : aiNames[playerNum];
  const oppName = activeMode === 'pvp' ? playerNames[playerNum === 0 ? 1 : 0] : aiNames[playerNum === 0 ? 1 : 0];
  
  if (type === 'siphon') {
    const opponent = playerNum === 0 ? 1 : 0;
    if (scores[opponent] < 10) {
      addLog(`Siphon failed! Opponent has less than 10 global points.`, 'system');
      return;
    }
    
    scores[opponent] -= 10;
    scores[playerNum] += 10;
    
    getActiveEl('score0').textContent = scores[0];
    getActiveEl('score1').textContent = scores[1];
    
    playSynthSound([587.33, 440, 698.46, 523.25], [0.08, 0.08, 0.08, 0.25], 'sawtooth');
    spawnDepositParticles(playerNum);
    addLog(`<b>${nameStr}</b> siphoned 10 points from <b>${oppName}</b>!`, `player${playerNum}`);
  }
  
  else if (type === 'lucky') {
    currentScore += 7;
    getActiveEl(`current${playerNum}`).textContent = currentScore;
    playSynthSound([523.25, 659.25, 783.99, 1046.50], [0.06, 0.06, 0.06, 0.18], 'triangle');
    addLog(`<b>${nameStr}</b> invoked Lucky 7! Current turn increases by +7 points.`, `player${playerNum}`);
  }
  
  else if (type === 'shield') {
    activeShield[playerNum] = true;
    playSynthSound([349.23, 523.25, 880], [0.1, 0.1, 0.2], 'sine');
    addLog(`<b>${nameStr}</b> deployed Aura Shield! Protected from next 1.`, `player${playerNum}`);
  }
  
  else if (type === 'double') {
    doubleDownRollsLeft[playerNum] = 3;
    playSynthSound([220, 330, 660], [0.1, 0.1, 0.2], 'triangle');
    addLog(`<b>${nameStr}</b> activated Double Down! Gains doubled for the next 3 rolls.`, `player${playerNum}`);
  }
  
  powerupsUsed[playerNum][powerupIdx] = true;
  updatePowerupsUI();
};

const setupPowerupListeners = () => {
  for (let p = 0; p < 2; p++) {
    const parent = getActiveEl(`powerups${p}`);
    if (!parent) continue;
    
    parent.querySelectorAll('.powerup-card').forEach(card => {
      const type = card.getAttribute('data-powerup');
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      
      newCard.addEventListener('click', () => {
        usePowerup(p, type);
      });
    });
  }
};

// --- STREAK FEVER TRACKING ---
const checkFeverStreak = () => {
  if (rollStreak === 3 && !isFeverMode) {
    isFeverMode = true;
    getActiveEl(`player${activePlayer}`).classList.add('player--fever');
    playFeverSound();
    
    const nameStr = activeMode === 'pvp' ? playerNames[activePlayer] : aiNames[activePlayer];
    addLog(`FEVER MODE IS ACTIVE for <b>${nameStr}</b>! All safe rolls get 1.5x score!`, `player${activePlayer}`);
  }
};

// --- CPU BRAIN INTERACTION MODULE (AI BATTLE) ---
const cpuPlay = () => {
  if (!playing || activeMode !== 'ai' || activePlayer !== 1) return;
  
  isCPUThinking = true;
  const botEl = getActiveEl('player1');
  botEl.classList.add('player--thinking');
  
  addLog(`<b>${aiNames[1]}</b> is processing tactical variables...`, 'system');
  updatePowerupsUI();
  
  // CPU Processing Delay
  setTimeout(() => {
    if (!playing || activePlayer !== 1) return;
    
    botEl.classList.remove('player--thinking');
    
    // 1. CHOOSE POWERUPS
    // Siphon
    if (!powerupsUsed[1][2] && scores[0] >= 20) {
      usePowerup(1, 'siphon');
      setTimeout(cpuPlay, 1100);
      return;
    }
    // Shield up
    if (!powerupsUsed[1][0] && !activeShield[1]) {
      usePowerup(1, 'shield');
      setTimeout(cpuPlay, 1100);
      return;
    }
    // Lucky 7
    if (!powerupsUsed[1][3] && currentScore < 10 && currentScore > 0) {
      usePowerup(1, 'lucky');
      setTimeout(cpuPlay, 1100);
      return;
    }
    // Double Down
    if (!powerupsUsed[1][1] && currentScore >= 8) {
      usePowerup(1, 'double');
      setTimeout(cpuPlay, 1100);
      return;
    }
    
    // 2. DECIDE ROLL OR HOLD
    let threshold = 20; // Zenith (Medium) default
    if (aiDifficulty === 'easy') threshold = 12;
    if (aiDifficulty === 'hard') {
      threshold = 28;
      if (scores[0] - scores[1] >= 25) threshold = 35; // aggressive greedy mode
    }
    
    // Hold for immediate victory
    if (scores[1] + currentScore >= 100) {
      cpuHold();
      return;
    }
    
    // Keep rolling if human is very close to win
    if (scores[0] >= 82 && scores[1] + currentScore < scores[0]) {
      cpuRoll();
      return;
    }
    
    if (currentScore >= threshold) {
      cpuHold();
    } else {
      cpuRoll();
    }
  }, 1200 + Math.random() * 500);
};

const cpuRoll = () => {
  addLog(`<b>${aiNames[1]}</b> rolls the dice.`, 'system');
  handleRollDice(); // Directly invoke handler bypass disabled buttons
};

const cpuHold = () => {
  addLog(`<b>${aiNames[1]}</b> holds turn points.`, 'system');
  handleHoldPoints(); // Directly invoke handler bypass disabled buttons
};

// --- CORE GAME CONTROLLER ---
const init = function () {
  scores = [0, 0];
  currentScore = 0;
  activePlayer = 0;
  playing = true;
  isRolling = false;
  isCPUThinking = false;
  
  rollStreak = 0;
  isFeverMode = false;
  
  activeShield = [false, false];
  doubleDownRollsLeft = [0, 0];
  powerupsUsed = [
    [false, false, false, false],
    [false, false, false, false]
  ];
  
  const s0 = getActiveEl('score0');
  const s1 = getActiveEl('score1');
  const c0 = getActiveEl('current0');
  const c1 = getActiveEl('current1');
  const d0 = getActiveEl('d0');
  const d1 = getActiveEl('d1');
  
  if (s0) s0.textContent = 0;
  if (s1) s1.textContent = 0;
  if (c0) c0.textContent = 0;
  if (c1) c1.textContent = 0;
  
  if (activeMode === 'pvp') {
    document.getElementById('name--0').textContent = playerNames[0];
    document.getElementById('name--1').textContent = playerNames[1];
  } else {
    document.getElementById('ai-name--0').textContent = aiNames[0];
    document.getElementById('ai-name--1').textContent = aiNames[1];
  }
  
  if (d0) d0.classList.add('hidden');
  if (d1) d1.classList.add('hidden');
  
  const p0 = getActiveEl('player0');
  const p1 = getActiveEl('player1');
  
  if (p0) p0.classList.remove('player--winner', 'player--loser', 'player--shocked', 'player--fever', 'player--thinking');
  if (p1) p1.classList.remove('player--winner', 'player--loser', 'player--shocked', 'player--fever', 'player--thinking');
  
  if (p0) p0.classList.add('player--active');
  if (p1) p1.classList.remove('player--active');
  
  const bRoll = getActiveEl('btnRoll');
  const bHold = getActiveEl('btnHold');
  if (bRoll) bRoll.disabled = false;
  if (bHold) bHold.disabled = false;
  
  stopConfetti();
  playResetSound();
  updatePowerupsUI();
  setupPowerupListeners();
  
  if (logListEl) logListEl.innerHTML = '';
  const currentTarget = activeMode === 'pvp' ? getActiveEl('targetSelect').value : 100;
  addLog(`Game initialized. Match Mode: <b>${activeMode === 'pvp' ? 'Player VS Player' : 'AI Battle Arena'}</b>. Target: <b>${currentTarget}</b>.`, 'system');
};

const switchPlayer = function () {
  getActiveEl(`current${activePlayer}`).textContent = 0;
  currentScore = 0;
  
  rollStreak = 0;
  isFeverMode = false;
  getActiveEl(`player${activePlayer}`).classList.remove('player--fever');
  
  activePlayer = activePlayer === 0 ? 1 : 0;
  
  const p0 = getActiveEl('player0');
  const p1 = getActiveEl('player1');
  
  p0.classList.toggle('player--active');
  p1.classList.toggle('player--active');
  
  updatePowerupsUI();
  
  if (activeMode === 'ai') {
    const pRoll = document.querySelector('.btn-ai--roll');
    const pHold = document.querySelector('.btn-ai--hold');
    
    if (activePlayer === 1) {
      pRoll.disabled = true;
      pHold.disabled = true;
      cpuPlay();
    } else {
      pRoll.disabled = false;
      pHold.disabled = false;
      isCPUThinking = false;
    }
  }
};

const triggerShockState = function () {
  const currentActive = activePlayer;
  const activeEl = getActiveEl(`player${currentActive}`);
  
  playBuzzerSound();
  activeEl.classList.add('player--shocked');
  
  stats.totalBusts++;
  saveStats();
  
  getActiveEl('btnRoll').disabled = true;
  getActiveEl('btnHold').disabled = true;
  
  setTimeout(() => {
    activeEl.classList.remove('player--shocked');
    
    const bRoll = getActiveEl('btnRoll');
    const bHold = getActiveEl('btnHold');
    if (bRoll) bRoll.disabled = false;
    if (bHold) bHold.disabled = false;
    
    switchPlayer();
    isRolling = false;
  }, 1200);
};

// --- EVENT CLICK RESPONSIVENESS ---
const handleRollDice = function() {
  if (!playing || isRolling || (activeMode === 'ai' && activePlayer === 1 && !isCPUThinking)) return;
  
  const isDoubleDice = getActiveEl('modeCheckbox').checked;
  isRolling = true;
  
  playRollSound();
  
  const d0 = getActiveEl('d0');
  const d1 = getActiveEl('d1');
  
  d0.classList.remove('hidden');
  d0.classList.add('roll-animation');
  
  if (isDoubleDice) {
    d1.classList.remove('hidden');
    d1.classList.add('roll-animation');
  } else {
    d1.classList.add('hidden');
  }
  
  setTimeout(() => {
    d0.classList.remove('roll-animation');
    d1.classList.remove('roll-animation');
    
    const dice0 = Math.trunc(Math.random() * 6) + 1;
    const dice1 = Math.trunc(Math.random() * 6) + 1;
    
    d0.src = `dice-${dice0}.png`;
    if (isDoubleDice) d1.src = `dice-${dice1}.png`;
    
    stats.totalRolls++;
    stats.diceCounts[dice0 - 1]++;
    if (isDoubleDice) stats.diceCounts[dice1 - 1]++;
    saveStats();
    
    const nameStr = activeMode === 'pvp' ? playerNames[activePlayer] : aiNames[activePlayer];
    
    if (isDoubleDice) {
      if (dice0 === 1 && dice1 === 1) {
        scores[activePlayer] = 0;
        getActiveEl(`score${activePlayer}`).textContent = 0;
        
        addLog(`DOUBLE 1s rolled by <b>${nameStr}</b>! Global Score wiped to 0.`, 'roll-failure');
        triggerShockState();
      } else if (dice0 === 1 || dice1 === 1) {
        if (activeShield[activePlayer]) {
          activeShield[activePlayer] = false;
          playSynthSound([783.99, 523.25, 880], [0.1, 0.1, 0.25], 'sine');
          addLog(`Shield absorbed the 1! <b>${nameStr}</b> protected. Keep rolling!`, `player${activePlayer} roll-success`);
          isRolling = false;
          updatePowerupsUI();
          
          // Re-trigger CPU play turn if bot rolled
          if (activeMode === 'ai' && activePlayer === 1) {
            setTimeout(cpuPlay, 1000);
          }
        } else {
          addLog(`Rolled a 1! <b>${nameStr}</b> bust turn score.`, 'roll-failure');
          triggerShockState();
        }
      } else {
        let diceTotal = dice0 + dice1;
        let pointsEarned = diceTotal;
        
        if (doubleDownRollsLeft[activePlayer] > 0) {
          pointsEarned *= 2;
          doubleDownRollsLeft[activePlayer]--;
          addLog(`Double Down active! x2.`, `player${activePlayer}`);
        }
        
        if (isFeverMode) {
          pointsEarned = Math.round(pointsEarned * 1.5);
        }
        
        currentScore += pointsEarned;
        getActiveEl(`current${activePlayer}`).textContent = currentScore;
        addLog(`<b>${nameStr}</b> rolled ${dice0} & ${dice1} (Turn: +${pointsEarned}).`, `player${activePlayer} roll-success`);
        
        rollStreak++;
        checkFeverStreak();
        isRolling = false;
        updatePowerupsUI();
        
        // Re-trigger CPU play turn if bot rolled successfully
        if (activeMode === 'ai' && activePlayer === 1) {
          setTimeout(cpuPlay, 1000);
        }
      }
    } else {
      if (dice0 === 1) {
        if (activeShield[activePlayer]) {
          activeShield[activePlayer] = false;
          playSynthSound([783.99, 523.25, 880], [0.1, 0.1, 0.25], 'sine');
          addLog(`Shield absorbed the 1! <b>${nameStr}</b> protected.`, `player${activePlayer} roll-success`);
          isRolling = false;
          updatePowerupsUI();
          
          if (activeMode === 'ai' && activePlayer === 1) {
            setTimeout(cpuPlay, 1000);
          }
        } else {
          addLog(`Rolled a 1! <b>${nameStr}</b> bust turn score.`, 'roll-failure');
          triggerShockState();
        }
      } else {
        let pointsEarned = dice0;
        
        if (doubleDownRollsLeft[activePlayer] > 0) {
          pointsEarned *= 2;
          doubleDownRollsLeft[activePlayer]--;
          addLog(`Double Down active! x2.`, `player${activePlayer}`);
        }
        
        if (isFeverMode) {
          pointsEarned = Math.round(pointsEarned * 1.5);
        }
        
        currentScore += pointsEarned;
        getActiveEl(`current${activePlayer}`).textContent = currentScore;
        addLog(`<b>${nameStr}</b> rolled a ${dice0} (Turn: +${pointsEarned}).`, `player${activePlayer} roll-success`);
        
        rollStreak++;
        checkFeverStreak();
        isRolling = false;
        updatePowerupsUI();
        
        if (activeMode === 'ai' && activePlayer === 1) {
          setTimeout(cpuPlay, 1000);
        }
      }
    }
  }, 400);
};

const handleHoldPoints = function() {
  if (!playing || isRolling || (activeMode === 'ai' && activePlayer === 1 && !isCPUThinking)) return;
  
  scores[activePlayer] += currentScore;
  getActiveEl(`score${activePlayer}`).textContent = scores[activePlayer];
  
  if (currentScore > stats.bestTurn) {
    stats.bestTurn = currentScore;
    saveStats();
  }
  
  const nameStr = activeMode === 'pvp' ? playerNames[activePlayer] : aiNames[activePlayer];
  const oppName = activeMode === 'pvp' ? playerNames[activePlayer === 0 ? 1 : 0] : aiNames[activePlayer === 0 ? 1 : 0];
  
  addLog(`<b>${nameStr}</b> held turn points! Global: ${scores[activePlayer]}.`, `player${activePlayer}`);
  
  playHoldSound();
  spawnDepositParticles(activePlayer);
  
  const targetVal = activeMode === 'pvp' ? Number(getActiveEl('targetSelect').value) : 100;
  
  if (scores[activePlayer] >= targetVal) {
    playing = false;
    
    playWinSound();
    startConfetti();
    
    const opponent = activePlayer === 0 ? 1 : 0;
    
    getActiveEl(`player${activePlayer}`).classList.add('player--winner');
    getActiveEl(`player${opponent}`).classList.add('player--loser');
    
    getActiveEl(`player${activePlayer}`).classList.remove('player--active');
    getActiveEl(`player${opponent}`).classList.remove('player--active');
    
    getActiveEl(`name${activePlayer}`).textContent = `${nameStr} WINS! 🏆`;
    addLog(`🏆 <b>${nameStr}</b> WINS THE GAME WITH ${scores[activePlayer]} POINTS!`, 'victory');
    
    // Save record to Champions Wall
    let champs = [];
    const loaded = localStorage.getItem('pig-arcade-champions');
    if (loaded) champs = JSON.parse(loaded);
    
    const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    champs.unshift({
      winner: nameStr,
      score: scores[activePlayer],
      opponent: oppName,
      mode: activeMode === 'pvp' ? 'Player VS Player' : 'AI Battle Arena',
      date: dateStr
    });
    champs = champs.slice(0, 5);
    localStorage.setItem('pig-arcade-champions', JSON.stringify(champs));
    
    if (scores[activePlayer] > stats.highScore) {
      stats.highScore = scores[activePlayer];
      saveStats();
    }
    
    getActiveEl('d0').classList.add('hidden');
    getActiveEl('d1').classList.add('hidden');
  } else {
    switchPlayer();
  }
};

const bindControlButtons = () => {
  // PvP Panel
  document.querySelector('#pvp-mode .btn--roll').addEventListener('click', handleRollDice);
  document.querySelector('#pvp-mode .btn--hold').addEventListener('click', handleHoldPoints);
  document.querySelector('#pvp-mode .btn--new').addEventListener('click', init);
  document.querySelector('#pvp-mode .target-selector-el').addEventListener('change', () => {
    addLog(`Target score updated to <b>${getActiveEl('targetSelect').value}</b>.`, 'system');
  });
  document.querySelector('#pvp-mode .mode-checkbox-el').addEventListener('change', () => {
    addLog(`Mode switched: <b>${getActiveEl('modeCheckbox').checked ? 'Double Dice' : 'Single Dice'}</b>.`, 'system');
    init();
  });
  
  // AI Panel
  document.querySelector('#ai-mode .btn-ai--roll').addEventListener('click', handleRollDice);
  document.querySelector('#ai-mode .btn-ai--hold').addEventListener('click', handleHoldPoints);
  document.querySelector('#ai-mode .mode-checkbox-el').addEventListener('change', () => {
    addLog(`AI Mode switched: <b>${getActiveEl('modeCheckbox').checked ? 'Double Dice' : 'Single Dice'}</b>.`, 'system');
    init();
  });
};
bindControlButtons();

window.resetGameAction = () => {
  init();
};

// --- DATA RANKINGS RENDERING ENGINE ---
const renderStatsPage = () => {
  loadStats();
  
  document.getElementById('stats-high-score').textContent = stats.highScore;
  document.getElementById('stats-best-turn').textContent = stats.bestTurn;
  document.getElementById('stats-total-rolls').textContent = stats.totalRolls;
  document.getElementById('stats-total-busts').textContent = stats.totalBusts;
  
  // Render Leaderboard Champions
  const tbody = document.getElementById('champions-tbody');
  const loadedChamps = localStorage.getItem('pig-arcade-champions');
  if (loadedChamps) {
    const champs = JSON.parse(loadedChamps);
    if (champs.length > 0) {
      tbody.innerHTML = '';
      champs.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><b>${c.winner}</b></td>
          <td><span style="color: #eab308; font-weight: 700;">${c.score}</span></td>
          <td>${c.opponent}</td>
          <td><i>${c.mode}</i></td>
          <td>${c.date}</td>
        `;
        tbody.appendChild(row);
      });
    }
  }
};

// Bind difficulty pill listeners & CPU Core Chassis Swappers
document.querySelectorAll('.btn-diff').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    aiDifficulty = btn.getAttribute('data-difficulty');
    
    // Switch bot card core classes
    const botCard = getActiveEl('player1');
    botCard.classList.remove('ai-core--easy', 'ai-core--medium', 'ai-core--hard');
    
    let botName = "Nano 🤖";
    if (aiDifficulty === 'easy') {
      botCard.classList.add('ai-core--easy');
      botName = "Nano 🤖";
    } else if (aiDifficulty === 'medium') {
      botCard.classList.add('ai-core--medium');
      botName = "Zenith 🤖";
    } else if (aiDifficulty === 'hard') {
      botCard.classList.add('ai-core--hard');
      botName = "Kratos 🤖";
    }
    
    aiNames[1] = botName;
    document.getElementById('ai-name--1').textContent = botName;
    
    addLog(`Loaded CPU Core: <b>${botName}</b> (${aiDifficulty.toUpperCase()} AI active).`, 'system');
    init();
  });
});

// Bind routing tab navigation bar & body visual themes
navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const target = tab.getAttribute('data-target');
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(target).classList.add('active');
    
    // Transition body visualization themes
    let theme = 'pvp';
    if (target === 'pvp-mode') theme = 'pvp';
    else if (target === 'ai-mode') theme = 'ai';
    else if (target === 'stats-mode') theme = 'stats';
    else if (target === 'codex-mode') theme = 'codex';
    document.body.setAttribute('data-theme', theme);
    
    if (target === 'pvp-mode') {
      activeMode = 'pvp';
      init();
    } else if (target === 'ai-mode') {
      activeMode = 'ai';
      init();
    } else if (target === 'stats-mode') {
      renderStatsPage();
    }
  });
});

// --- PERK DETAILS POPUP MODAL CONTROL ---
window.openPerkModal = function(type) {
  const modal = document.getElementById('perk-modal');
  const body = document.getElementById('modal-body');
  
  let title = '';
  let emoji = '';
  let color = '';
  let desc = '';
  let statsStr = '';
  
  if (type === 'shield') {
    title = 'Aura Shield';
    emoji = '🛡️';
    color = 'var(--cyan-neon)';
    desc = 'Forges an active shielding field that safeguards your cumulative score in-place. If a disastrous 1 is rolled, the Shield instantly shatters to absorb the bust, keeping your turn points completely intact and allowing you to roll again safely!';
    statsStr = 'Cooldown: 1 Per Match | Target: Self | Trigger: Auto-Bust Block';
  } else if (type === 'double') {
    title = 'Double Down';
    emoji = '🔥';
    color = 'var(--orange-neon)';
    desc = 'Ignites the rolled dice with a volcanic plasma stream! For the next 3 rolls on this turn, all scoring points are instantly multiplied by 2x. Highly lethal when stacked with Fever Mode multipliers!';
    statsStr = 'Duration: 3 Rolls | Target: Score Multiplier | Yield: 200% Gain';
  } else if (type === 'siphon') {
    title = 'Energy Siphon';
    emoji = '⚡';
    color = 'var(--violet-light)';
    desc = 'Fires an energy beam that siphons exactly 10 global points directly from your opponent’s scorecard and deposits it straight into your total score! Ideal for late-game comebacks. (Locked if the opponent has less than 10 points).';
    statsStr = 'Impact: -10 Opponent, +10 Self | Target: Global Score | Cost: Locked if Opponent < 10';
  } else if (type === 'lucky') {
    title = 'Lucky 7';
    emoji = '🍀';
    color = 'var(--green-neon)';
    desc = 'Triggers an instant green spark arpeggio that injects a guaranteed +7 points directly into your current turn score. There are no risks, no rolls required—just pure luck!';
    statsStr = 'Yield: +7 Turn Points | Target: Current Score | Risk Factor: 0%';
  }
  
  body.innerHTML = `
    <div class="modal-icon-glow" style="text-shadow: 0 0 35px ${color}; color: ${color};">${emoji}</div>
    <h2 class="modal-perk-title" style="color: ${color}; text-shadow: 0 0 15px ${color}40;">${title}</h2>
    <p class="modal-perk-desc">${desc}</p>
    <div class="modal-perk-stats" style="color: ${color}; border-color: ${color}40; background: ${color}05;">
      <span>${statsStr}</span>
    </div>
  `;
  
  modal.classList.add('active');
  playSynthSound([523.25, 783.99, 1046.50], [0.08, 0.08, 0.2], 'triangle');
};

window.closePerkModal = function() {
  const modal = document.getElementById('perk-modal');
  modal.classList.remove('active');
  playSynthSound([1046.50, 783.99, 523.25], [0.06, 0.06, 0.12], 'sine');
};

// Initial startup call
init();
