const gridContainer = document.querySelector(".grid-container");
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("end-screen");
const finalScore = document.getElementById("final-score");
const levelTitle = document.getElementById("level-title");

let cards = [];
let firstCard, secondCard;
let lockBoard = false;
let score = 0;
let matchedCount = 0;
let currentLevel = 1;
let totalLevels = 3;

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", restartGame);


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showLoadingThenStart);
} else {
  showLoadingThenStart();
}

function showLoadingThenStart() {
  const loading = document.getElementById('loading-screen');
  const start = document.getElementById('start-screen');
  const levelCount = totalLevels || 3;
  let done = 0;
  let finished = false;
  const minMs = 3000; // Krovimo lango laikas ms
  const t0 = Date.now();
  
  document.body.style.overflow = 'hidden';
  
  let fallbackTimer;

  const finish = () => {
    if (finished) return;
    finished = true;
    
    if (fallbackTimer) clearTimeout(fallbackTimer);
    
    document.body.style.overflow = '';
    
    
    showScreen('start-screen');
    try {
      
      if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    } catch (err) {
      
      console.warn('Could not remove loading screen:', err);
    }
  };
  
  const tryFinish = () => {
    const elapsed = Date.now() - t0;
    const remaining = Math.max(0, minMs - elapsed);
    setTimeout(finish, remaining);
  };

  
  for (let i = 1; i <= levelCount; i++) {
    const img = new Image();
    img.onload = img.onerror = () => {
      done++;
      if (done === levelCount) tryFinish();
    };
    img.src = `assets/levels/level-${i}.png`;
  }

  
  fallbackTimer = setTimeout(() => {
    
    if (!finished) finish();
  }, 8000);

}

function startGame() {
  showScreen('game-screen');
  loadLevel(currentLevel);
}

function loadLevel(level) {
  levelTitle.textContent = `${level} lygis`;
  fetch("./data/cards.json")
    .then((res) => res.json())
    .then((data) => {
      // Group unique cards by habitat (based on name keywords)
      const groups = groupUniqueByHabitat(data);

      // Determine which group to use per level.
      // Per your request, level pair counts reflect how many animals live on land / in water.
      let levelCards = [];
      if (level === 1) {
        // Level 1 = all land animals
        levelCards = groups.land;
      } else if (level === 2) {
        // Level 2 = all water animals
        levelCards = groups.water;
      } else {
        // Level 3 = animals from air + other (fallback)
        levelCards = groups.air.concat(groups.other);
      }

      // If any group is empty (not enough unique cards), fall back to taking
      // unique cards from the full dataset to avoid an empty level.
      if (!levelCards || levelCards.length === 0) {
        levelCards = pickUniqueCards(data, level === 1 ? 4 : level === 2 ? 6 : 9);
      }

      // Apply background and generate pairs
      applyBackgroundForLevel(levelCards);
      cards = [...levelCards, ...levelCards];
      shuffleCards();
      generateCards(levelCards.length);
    });
}

// Group unique cards by habitat into { land, water, air, other }
function groupUniqueByHabitat(data) {
  const seen = new Set();
  const groups = { land: [], water: [], air: [], other: [] };
  for (const item of data) {
    const name = (item.name || '').toString();
    if (seen.has(name)) continue;
    seen.add(name);
    const h = detectHabitatForAnimal(name);
    if (h === 'land') groups.land.push(item);
    else if (h === 'water') groups.water.push(item);
    else if (h === 'air') groups.air.push(item);
    else groups.other.push(item);
  }
  return groups;
}

// Pick up to `count` unique cards from `data` based on `name` (preserve order)
function pickUniqueCards(data, count) {
  const result = [];
  const seen = new Set();
  for (const item of data) {
    const n = (item.name || '').toString();
    if (!seen.has(n)) {
      result.push(item);
      seen.add(n);
      if (result.length >= count) break;
    }
  }
  // If not enough unique names found, result may be smaller than `count`.
  return result;
}

// --- Habitat detection & per-level background application ---
// Map simple keywords (Lithuanian names from `data/cards.json`) to habitat keys.
// Put images in `assets/levels/<habitat>.png`, e.g. `assets/levels/jungle.png`.
function detectHabitatForAnimal(name) {
  // Group into three categories: 'water', 'land', 'air'.
  // Normalize the name (remove diacritics) for more robust matching.
  const raw = (name || '').toString();
    const n = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Helper to normalize keywords the same way
    const norm = (s) => s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const waterKeywords = [
    'ūdra', 'vėžl', 'vėžlys', 'raja', 'eršket', 'stingray', 'sturgeon', 'otter', 'turtle'
  ].map(norm);

  const airKeywords = [
    'papūga', 'tukan', 'skraid', 'bitė', 'šikšnosparnis', 'tukanas', 'papuga', 'toucan', 'parrot'
  ].map(norm);

  const landKeywords = [
    'višta', 'kalkunas', 'ožka', 'avis', 'triušis', 'katė', 'perlinė', 'pitonas', 'driežas', 'smėlinė',
    'žiurk', 'tarakon', 'lemūras', 'liūtas', 'surikata', 'šarvuotis', 'salamandra', 'kurapka', 'sheep'
  ].map(norm);

  // normalized name
  const nameNorm = norm(raw);

  // prefer air detection first for birds/insects
  for (const kw of airKeywords) if (nameNorm.includes(kw)) return 'air';
  for (const kw of waterKeywords) if (nameNorm.includes(kw)) return 'water';
  for (const kw of landKeywords) if (nameNorm.includes(kw)) return 'land';

  // fallback to 'other' if no keywords matched
  return 'other';
}

function applyBackgroundForLevel(levelCards) {
  const counts = {};
  levelCards.forEach((c) => {
    // Prefer explicit `habitat` field in data if present, otherwise detect
    const h = (c.habitat || detectHabitatForAnimal(c.name)).toString();
    counts[h] = (counts[h] || 0) + 1;
  });

  let chosen = 'other';
  let max = 0;
  for (const h in counts) {
    if (counts[h] > max) {
      max = counts[h];
      chosen = h;
    }
  }
  // Apply background image (non-blocking). Expected asset names:
  // assets/levels/land.png, assets/levels/water.png, assets/levels/other.png
  const bgPath = `assets/levels/${chosen}.png`;
  gameScreen.style.backgroundImage = `url("${bgPath}")`;
  gameScreen.style.backgroundSize = 'cover';
  gameScreen.style.backgroundPosition = 'center';
}

function shuffleCards() {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

function generateCards(pairCount) {
  gridContainer.innerHTML = "";
  matchedCount = 0;
  score = 0;
  document.querySelector(".score").textContent = score;

  // automatinis grid'o dydis pagal kortelių skaičių
  const columns = pairCount <= 4 ? 4 : pairCount <= 6 ? 6 : 6;
  gridContainer.style.gridTemplateColumns = `repeat(${columns}, 140px)`;

  cards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.classList.add("card");
    cardElement.setAttribute("data-name", card.name);
    cardElement.innerHTML = `
      <div class="front">
        <img class="front-image" src="${card.image}" />
      </div>
      <div class="back"></div>
    `;
    gridContainer.appendChild(cardElement);
    cardElement.addEventListener("click", flipCard);
  });
}

function flipCard() {
  if (lockBoard) return;
  if (this === firstCard) return;

  this.classList.add("flipped");

  if (!firstCard) {
    firstCard = this;
    return;
  }

  secondCard = this;
  lockBoard = true;

  checkForMatch();
}

function checkForMatch() {
  const isMatch = firstCard.dataset.name === secondCard.dataset.name;
  isMatch ? disableCards() : unflipCards();
}

function disableCards() {
  setTimeout(() => {
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");
    firstCard.removeEventListener("click", flipCard);
    secondCard.removeEventListener("click", flipCard);

    score++;
    matchedCount += 2;
    document.querySelector(".score").textContent = score;
    resetBoard();

    if (matchedCount === cards.length) nextLevel();
  }, 400);
}

function unflipCards() {
  setTimeout(() => {
    firstCard.classList.remove("flipped");
    secondCard.classList.remove("flipped");
    resetBoard();
  }, 1000);
}

function resetBoard() {
  [firstCard, secondCard, lockBoard] = [null, null, false];
}

function restart() {
  resetBoard();
  loadLevel(currentLevel);
}

function nextLevel() {
  setTimeout(() => {
    if (currentLevel < totalLevels) {
      currentLevel++;
      loadLevel(currentLevel);
    } else {
      endGame();
    }
  }, 800);
}

function endGame() {
  showScreen('end-screen');
  finalScore.textContent = score;
}

function restartGame() {
  showScreen('start-screen');
  currentLevel = 1;
}

function skipToEnd() {
  // iškart rodo pabaigos ekraną
  showScreen('end-screen');
  finalScore.textContent = score + " (praleista)";
}

// Helper to switch visible screen: 'loading-screen', 'start-screen', 'game-screen', 'end-screen'
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}