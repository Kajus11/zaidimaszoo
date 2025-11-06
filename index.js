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

function startGame() {
  startScreen.classList.remove("active");
  gameScreen.classList.add("active");
  loadLevel(currentLevel);
}

function loadLevel(level) {
  levelTitle.textContent = `${level} lygis`;
  fetch("./data/cards.json")
    .then((res) => res.json())
    .then((data) => {
      // mažiau kortelių ankstesniuose lygiuose
      let levelCards = [];
      if (level === 1) levelCards = data.slice(0, 4);
      else if (level === 2) levelCards = data.slice(0, 6);
      else levelCards = data.slice(0, 9);

      cards = [...levelCards, ...levelCards];
      shuffleCards();
      generateCards(levelCards.length);
    });
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
  gameScreen.classList.remove("active");
  endScreen.classList.add("active");
  finalScore.textContent = score;
}

function restartGame() {
  endScreen.classList.remove("active");
  startScreen.classList.add("active");
  currentLevel = 1;
}

function skipToEnd() {
  // iškart rodo pabaigos ekraną
  gameScreen.classList.remove("active");
  endScreen.classList.add("active");
  finalScore.textContent = score + " (praleista)";
}