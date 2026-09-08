const players = [
  "Dani",
  "Teob",
  "Fede",
  "Ruben",
  "Ste",
  "Sam",
  "Davide",
  "Maspe",
  "Remì",
  "Guarne",
  "Sbe"
];
async function initializePlayers() {
  try {

    const snapshot = await db.collection("players").get();

    if (!snapshot.empty) {
      console.log("Giocatori già presenti nel database.");
      return;
    }

    console.log("Creo i giocatori nel database...");

    for (const playerName of players) {

      await db.collection("players").add({
        name: playerName,
        rating: 1000,
        wins: 0,
        losses: 0,
        games: 0,
        streak: 0,
        bestRating: 1000,
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    }

    console.log("Giocatori creati correttamente!");

  } catch (error) {

    console.error(
      "Errore durante la creazione dei giocatori:",
      error
    );

  }
}
const welcomeScreen = document.getElementById("welcomeScreen");
const playerScreen = document.getElementById("playerScreen");
const homeScreen = document.getElementById("homeScreen");
const newMatchScreen =
  document.getElementById("newMatchScreen");

const drawResultScreen =
  document.getElementById("drawResultScreen");
  const newMatchButton =
  document.getElementById("newMatchButton");

const matchPlayerList =
  document.getElementById("matchPlayerList");

const drawButton =
  document.getElementById("drawButton");

const backHomeButton =
  document.getElementById("backHomeButton");

const redrawButton =
  document.getElementById("redrawButton");

const startMatchButton =
  document.getElementById("startMatchButton");

const cancelDrawButton =
  document.getElementById("cancelDrawButton");

const teamAPlayers =
  document.getElementById("teamAPlayers");

const teamBPlayers =
  document.getElementById("teamBPlayers");

const excludedPlayers =
  document.getElementById("excludedPlayers");
const enterButton = document.getElementById("enterButton");
const playerList = document.getElementById("playerList");
const welcomePlayerName = document.getElementById("welcomePlayerName");


function showScreen(screen) {

  welcomeScreen.classList.remove("active");
  playerScreen.classList.remove("active");
  homeScreen.classList.remove("active");
  newMatchScreen.classList.remove("active");
  drawResultScreen.classList.remove("active");

  screen.classList.add("active");
}

let availablePlayers = [];

let currentDraw = null;

let previousDraw = null;
async function createPlayerButtons() {
  playerList.innerHTML = "";

  try {
    const snapshot = await db
      .collection("players")
      .where("active", "==", true)
      .get();

    const firestorePlayers = [];

    snapshot.forEach((doc) => {
      firestorePlayers.push({
        id: doc.id,
        ...doc.data()
      });
    });

    firestorePlayers.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    availablePlayers = firestorePlayers;

    firestorePlayers.forEach((player) => {
      const button = document.createElement("button");

      button.className = "player-button";
      button.textContent = player.name;

      button.addEventListener("click", () => {
        selectPlayer(player.name);
      });

      playerList.appendChild(button);
    });

  } catch (error) {
    console.error(
      "Errore durante il caricamento dei giocatori:",
      error
    );
  }
}


async function selectPlayer(playerName) {
  const user = auth.currentUser;

  if (!user) {
    alert("Errore: utente non autenticato.");
    return;
  }

  localStorage.setItem("rankingScopaPlayer", playerName);

  welcomePlayerName.textContent = playerName.toUpperCase();

  showScreen(homeScreen);
}


enterButton.addEventListener("click", () => {
  showScreen(playerScreen);
});


auth.onAuthStateChanged(async (user) => {

  if (!user) {
    try {
      await auth.signInAnonymously();
    } catch (error) {
      console.error("Errore autenticazione:", error);
    }

    return;
  }

  console.log("Utente Firebase:", user.uid);  
  
  await initializePlayers();

  const savedPlayer =
    localStorage.getItem("rankingScopaPlayer");

  if (savedPlayer) {
    welcomePlayerName.textContent =
      savedPlayer.toUpperCase();

    showScreen(homeScreen);
  } else {
    showScreen(welcomeScreen);
  }

});

function createMatchPlayerList() {

  matchPlayerList.innerHTML = "";

  availablePlayers.forEach((player) => {

    const label = document.createElement("label");

    label.className =
      "player-button match-player";

    const checkbox =
      document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = player.name;

    const name =
      document.createElement("span");

    name.textContent = player.name;

    label.appendChild(checkbox);
    label.appendChild(name);

    matchPlayerList.appendChild(label);

  });

}
newMatchButton.addEventListener(
  "click",
  () => {

    createMatchPlayerList();

    showScreen(newMatchScreen);

  }
);
backHomeButton.addEventListener(
  "click",
  () => {

    showScreen(homeScreen);

  }
);
function secureRandomInt(max) {

  if (max <= 0) {
    return 0;
  }

  const array = new Uint32Array(1);

  crypto.getRandomValues(array);

  return array[0] % max;
}
function shufflePlayers(playersArray) {

  const shuffled = [...playersArray];

  for (
    let i = shuffled.length - 1;
    i > 0;
    i--
  ) {

    const j = secureRandomInt(i + 1);

    [
      shuffled[i],
      shuffled[j]
    ] = [
      shuffled[j],
      shuffled[i]
    ];

  }

  return shuffled;
}
function normalizeTeam(team) {

  return [...team]
    .sort()
    .join("|");
}
function isSameDraw(drawA, drawB) {

  if (!drawA || !drawB) {
    return false;
  }

  const a1 = normalizeTeam(drawA.teamA);
  const a2 = normalizeTeam(drawA.teamB);

  const b1 = normalizeTeam(drawB.teamA);
  const b2 = normalizeTeam(drawB.teamB);

  return (
    (a1 === b1 && a2 === b2) ||
    (a1 === b2 && a2 === b1)
  );

}
function generateDraw(selectedPlayers) {

  let attempts = 0;

  let draw;

  do {

    const shuffled =
      shufflePlayers(selectedPlayers);

    draw = {
      teamA: [
        shuffled[0],
        shuffled[1]
      ],

      teamB: [
        shuffled[2],
        shuffled[3]
      ],

      excluded:
        shuffled.slice(4)
    };

    attempts++;

  } while (
    isSameDraw(draw, previousDraw) &&
    attempts < 50
  );

  return draw;
}
drawButton.addEventListener(
  "click",
  () => {

    const checked =
      matchPlayerList.querySelectorAll(
        'input[type="checkbox"]:checked'
      );

    const selected =
      Array.from(checked)
        .map(input => input.value);

    if (selected.length < 4) {

      alert(
        "Devi selezionare almeno 4 giocatori."
      );

      return;
    }

    currentDraw =
      generateDraw(selected);

    showDraw(currentDraw);

  }
);
function showDraw(draw) {

  teamAPlayers.textContent =
    draw.teamA.join(" + ");

  teamBPlayers.textContent =
    draw.teamB.join(" + ");

  if (draw.excluded.length > 0) {

    excludedPlayers.textContent =
      draw.excluded.join(", ");

  } else {

    excludedPlayers.textContent =
      "Nessuno";

  }

  showScreen(drawResultScreen);

}
redrawButton.addEventListener(
  "click",
  () => {

    if (!currentDraw) {
      return;
    }

    const allPlayers = [
      ...currentDraw.teamA,
      ...currentDraw.teamB,
      ...currentDraw.excluded
    ];

    previousDraw = currentDraw;

    currentDraw =
      generateDraw(allPlayers);

    showDraw(currentDraw);

  }
);
cancelDrawButton.addEventListener(
  "click",
  () => {

    currentDraw = null;

    showScreen(newMatchScreen);

  }
);
startMatchButton.addEventListener(
  "click",
  () => {

    if (!currentDraw) {
      return;
    }

    previousDraw = currentDraw;

    alert(
      "Sorteggio confermato! Nel prossimo passaggio creeremo la partita vera."
    );

  }
);

createPlayerButtons();