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
  const rankingButton =
  document.getElementById("rankingButton");

const historyButton =
  document.getElementById("historyButton");

const recentMatchesPreview =
  document.getElementById("recentMatchesPreview");

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
const matchInProgressScreen = document.getElementById("matchInProgressScreen");
const matchSaveMessage = document.getElementById("matchSaveMessage");
const activeTeamAPlayers = document.getElementById("activeTeamAPlayers");
const activeTeamBPlayers = document.getElementById("activeTeamBPlayers");
const activeExcludedPlayers = document.getElementById("activeExcludedPlayers");
const activeMatchSeason = document.getElementById("activeMatchSeason");
const enterResultButton = document.getElementById("enterResultButton");
const correctResultButton = document.getElementById('correctResultButton');
const resultMessage = document.getElementById("resultMessage");
let isCreatingMatch = false;
let currentMatch = null;


function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(item => item.classList.remove('active'));
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
  await createPlayerButtons();
  await refreshHome();

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

  // Garantisce un sorteggio diverso anche dopo 50 tentativi uguali.
  if (isSameDraw(draw, previousDraw)) {
    [draw.teamA[1], draw.teamB[0]] =
      [draw.teamB[0], draw.teamA[1]];
  }

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
  matchSaveMessage.textContent = "";

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

    if (!currentDraw || isCreatingMatch) {
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
    if (isCreatingMatch) return;

    currentDraw = null;

    showScreen(newMatchScreen);

  }
);
function getSeasonId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function startMatch() {
  if (isCreatingMatch || !currentDraw) return;
  matchSaveMessage.textContent = "";
  const user = auth.currentUser;
  const playerName = localStorage.getItem("rankingScopaPlayer");
  if (!user || !availablePlayers.some(player => player.name === playerName)) {
    matchSaveMessage.textContent = "Accedi e scegli un giocatore prima di iniziare la partita.";
    return;
  }
  const { teamA, teamB, excluded } = currentDraw;
  const participants = [...teamA, ...teamB, ...excluded];
  if (teamA.length !== 2 || teamB.length !== 2 ||
      new Set(participants).size !== participants.length ||
      !participants.every(name => availablePlayers.some(player => player.name === name))) {
    matchSaveMessage.textContent = "Sorteggio non valido. Seleziona i giocatori e sorteggia di nuovo.";
    return;
  }

  isCreatingMatch = true;
  [startMatchButton, redrawButton, cancelDrawButton].forEach(button => button.disabled = true);
  startMatchButton.textContent = "SALVATAGGIO…";
  matchSaveMessage.textContent = "Salvataggio in corso. Attendi la conferma e mantieni la connessione attiva.";
  const match = {
    seasonId: getSeasonId(),
    teamA: [...teamA],
    teamB: [...teamB],
    excluded: [...excluded],
    createdByPlayer: playerName,
    createdByUid: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: "in_progress"
  };

  try {
    const reference = await db.collection("matches").add(match);
    currentMatch = { ...match, id: reference.id };
    previousDraw = currentDraw;
    currentDraw = null;
    openMatch(currentMatch);
  } catch (error) {
    console.error("Errore creazione partita:", error);
    matchSaveMessage.textContent = error.code === "permission-denied"
      ? "Firestore non autorizza la creazione della partita. Controlla le regole della collection matches, poi riprova."
      : "Partita non salvata. Controlla la connessione e riprova: il sorteggio è rimasto invariato.";
  } finally {
    isCreatingMatch = false;
    [startMatchButton, redrawButton, cancelDrawButton].forEach(button => button.disabled = false);
    startMatchButton.textContent = "♠ INIZIA PARTITA";
  }
}

startMatchButton.addEventListener("click", startMatch);
function openResultForm(mode) {
  if (isClosingMatch || !currentMatch || currentMatch.createdByUid !== auth.currentUser?.uid) return;
  const correcting = mode === 'correction';
  if (currentMatch.status !== (correcting ? 'completed' : 'in_progress')) return;
  resultMode = mode;
  correctionBasis = correcting ? {
    id: currentMatch.id,
    scoreA: currentMatch.scoreA,
    scoreB: currentMatch.scoreB,
    correctionCount: currentMatch.correctionCount || 0
  } : null;
  resultForm.reset();
  if (correcting) {
    scoreAInput.value = currentMatch.scoreA;
    scoreBInput.value = currentMatch.scoreB;
  }
  document.getElementById('resultFormTitle').textContent = correcting ? 'CORREGGI RISULTATO' : 'INSERISCI RISULTATO';
  document.getElementById('resultFormHelp').textContent = correcting
    ? `Risultato registrato: ${currentMatch.scoreA} – ${currentMatch.scoreB}. La correzione sostituisce questo risultato e aggiorna i punti della stessa partita.`
    : 'Inserisci i punti finali, anche superiori a 21. Controlla squadre e punteggi prima di confermare.';
  confirmResultButton.textContent = correcting ? 'CONFERMA CORREZIONE' : 'CONFERMA RISULTATO';
  document.getElementById('scoreTeamA').textContent = currentMatch.teamA.join(' + ');
  document.getElementById('scoreTeamB').textContent = currentMatch.teamB.join(' + ');
  resultSaveMessage.textContent = '';
  updateResultPreview();
  showScreen(resultScreen);
  scoreAInput.focus();
}
enterResultButton.addEventListener('click', () => openResultForm('create'));
correctResultButton.addEventListener('click', () => openResultForm('correction'));
const resultScreen = document.getElementById('resultScreen');
const resultForm = document.getElementById('resultForm');
const scoreAInput = document.getElementById('scoreA');
const scoreBInput = document.getElementById('scoreB');
const resultPreview = document.getElementById('resultPreview');
const resultSaveMessage = document.getElementById('resultSaveMessage');
const confirmResultButton = document.getElementById('confirmResultButton');
const cancelResultButton = document.getElementById('cancelResultButton');
const historyMonth = document.getElementById('historyMonth');
const rankingMonth = document.getElementById('rankingMonth');
let isClosingMatch = false;
let resultMode = 'create';
let correctionBasis = null;
let homeRequest = 0;
let historyRequest = 0;
let rankingRequest = 0;

function calculateResult(scoreA, scoreB) {
  if (!Number.isSafeInteger(scoreA) || !Number.isSafeInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    throw new Error('Inserisci due punteggi interi, uguali o superiori a zero.');
  }
  if (scoreA === scoreB) throw new Error('Il risultato è in parità: continuate a giocare.');
  if (Math.max(scoreA, scoreB) < 21) throw new Error('Per concludere, una squadra deve raggiungere almeno 21 punti.');
  const ratingDelta = 20 + Math.abs(scoreA - scoreB);
  if (!Number.isSafeInteger(ratingDelta)) throw new Error('Il punteggio è troppo grande per essere rappresentato con precisione.');
  return { scoreA, scoreB, winnerTeam: scoreA > scoreB ? 'A' : 'B', ratingDelta };
}

function readResult() {
  if (!scoreAInput.value.trim() || !scoreBInput.value.trim()) throw new Error('Inserisci il punteggio di entrambe le squadre.');
  return calculateResult(Number(scoreAInput.value), Number(scoreBInput.value));
}

function resultDescription(match) {
  const winners = match.winnerTeam === 'A' ? match.teamA : match.teamB;
  const losers = match.winnerTeam === 'A' ? match.teamB : match.teamA;
  return `${winners.join(' + ')}: +${match.ratingDelta} punti ciascuno. ${losers.join(' + ')}: −${match.ratingDelta} punti ciascuno. Esclusi invariati.`;
}

function updateResultPreview() {
  try {
    const result = readResult();
    resultPreview.textContent = resultDescription({ ...currentMatch, ...result });
    if (resultMode === 'correction' && correctionBasis) {
      if (result.scoreA === correctionBasis.scoreA && result.scoreB === correctionBasis.scoreB) {
        resultPreview.textContent = 'Il risultato è invariato. Modifica almeno uno dei due punteggi per correggerlo.';
        confirmResultButton.disabled = true;
        return;
      }
      const before = calculateResult(correctionBasis.scoreA, correctionBasis.scoreB);
      const changeA = (result.winnerTeam === 'A' ? result.ratingDelta : -result.ratingDelta)
        - (before.winnerTeam === 'A' ? before.ratingDelta : -before.ratingDelta);
      const signed = points => points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : '0';
      resultPreview.textContent += ` Rispetto alla classifica attuale: ${currentMatch.teamA.join(' + ')} ${signed(changeA)} punti ciascuno; ${currentMatch.teamB.join(' + ')} ${signed(-changeA)} punti ciascuno.`;
    }
    confirmResultButton.disabled = isClosingMatch;
  } catch (error) {
    resultPreview.textContent = error.message;
    confirmResultButton.disabled = true;
  }
}

function openMatch(match) {
  currentMatch = match;
  activeTeamAPlayers.textContent = match.teamA.join(' + ');
  activeTeamBPlayers.textContent = match.teamB.join(' + ');
  activeExcludedPlayers.textContent = match.excluded.join(', ') || 'Nessuno';
  activeMatchSeason.textContent = `STAGIONE ${match.seasonId}`;
  const completed = match.status === 'completed';
  document.getElementById('activeMatchTitle').textContent = completed ? 'PARTITA CONCLUSA' : 'PARTITA IN CORSO';
  document.getElementById('activeMatchScore').textContent = completed ? `${match.scoreA} – ${match.scoreB}` : '';
  enterResultButton.hidden = completed || match.createdByUid !== auth.currentUser?.uid;
  correctResultButton.hidden = !completed || match.createdByUid !== auth.currentUser?.uid;
  document.getElementById('activeMatchNotice').textContent = '';
  document.getElementById('correctionInfo').textContent = completed && match.correctionCount
    ? `Risultato corretto ${match.correctionCount} ${match.correctionCount === 1 ? 'volta' : 'volte'}. Prima dell’ultima correzione: ${match.previousResult.scoreA} – ${match.previousResult.scoreB}.`
    : '';
  resultMessage.textContent = completed ? resultDescription(match) :
    match.createdByUid !== auth.currentUser?.uid ? 'Il risultato va inserito dal dispositivo che ha creato la partita.' : '';
  showScreen(matchInProgressScreen);
}

async function closeMatch(event) {
  event.preventDefault();
  if (isClosingMatch || !currentMatch) return;
  let result;
  try { result = readResult(); } catch (error) { resultSaveMessage.textContent = error.message; return; }
  const user = auth.currentUser;
  if (!user || currentMatch.createdByUid !== user.uid) {
    resultSaveMessage.textContent = 'Usa il dispositivo che ha creato la partita per salvare il risultato.';
    return;
  }
  const matchId = currentMatch.id;
  const correcting = resultMode === 'correction';
  const expected = correctionBasis;
  if (correcting && (!expected || expected.id !== matchId)) return;
  if (correcting && expected.scoreA === result.scoreA && expected.scoreB === result.scoreB) {
    resultSaveMessage.textContent = 'Il risultato è invariato: nessuna modifica da salvare.';
    return;
  }
  isClosingMatch = true;
  [confirmResultButton, cancelResultButton, scoreAInput, scoreBInput].forEach(element => element.disabled = true);
  resultSaveMessage.textContent = correcting ? 'Salvataggio della correzione…' : 'Salvataggio del risultato…';
  try {
    const reference = db.collection('matches').doc(matchId);
    const saved = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error('La partita non esiste più.');
      const match = snapshot.data();
      if (match.createdByUid !== user.uid) throw new Error('Non puoi modificare questa partita.');
      if (correcting) {
        if (match.status !== 'completed') throw new Error('La partita non risulta conclusa. Riaprila dalla Home.');
        const latest = { ...match, id: matchId };
        // Se una richiesta precedente è già riuscita, non crea una nuova correzione.
        if (match.scoreA === result.scoreA && match.scoreB === result.scoreB) {
          return { match: latest, outcome: 'unchanged' };
        }
        if (match.scoreA !== expected.scoreA || match.scoreB !== expected.scoreB ||
            (match.correctionCount || 0) !== expected.correctionCount) {
          return { match: latest, outcome: 'conflict' };
        }
        const update = {
          ...result,
          correctionCount: (match.correctionCount || 0) + 1,
          previousResult: {
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            winnerTeam: match.winnerTeam,
            ratingDelta: match.ratingDelta
          },
          correctedAt: firebase.firestore.FieldValue.serverTimestamp(),
          correctedByUid: user.uid
        };
        transaction.update(reference, update);
        return { match: { ...latest, ...update }, outcome: 'corrected' };
      }
      // La lettura nella transazione impedisce due chiusure anche da schede diverse.
      if (match.status === 'completed') return { match: { ...match, id: matchId }, outcome: 'unchanged' };
      if (match.status !== 'in_progress' || match.createdByUid !== user.uid) throw new Error('Non puoi concludere questa partita.');
      const update = {
        ...result,
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        completedByUid: user.uid
      };
      transaction.update(reference, update);
      return { match: { ...match, ...update, id: matchId }, outcome: 'completed' };
    });
    openMatch(saved.match);
    document.getElementById('activeMatchNotice').textContent = saved.outcome === 'conflict'
      ? 'Il risultato è stato modificato da un’altra scheda mentre lo correggevi. La tua correzione non è stata salvata. Qui vedi il risultato aggiornato: controllalo e premi CORREGGI RISULTATO se serve.'
      : saved.outcome === 'corrected' ? 'Correzione salvata. Classifica e storico useranno il nuovo risultato.'
      : saved.outcome === 'unchanged' ? 'Questo risultato è già stato salvato. Non sono stati assegnati altri punti.' : '';
  } catch (error) {
    console.error('Errore salvataggio risultato:', error);
    resultSaveMessage.textContent = error.code === 'permission-denied'
      ? `Pubblica le nuove regole Firestore per autorizzare ${correcting ? 'la correzione' : 'la chiusura'}, poi riprova. I punteggi inseriti sono ancora qui.`
      : `Risultato non salvato. ${error.code ? 'Controlla la connessione e riprova.' : error.message}`;
  } finally {
    isClosingMatch = false;
    [cancelResultButton, scoreAInput, scoreBInput].forEach(element => element.disabled = false);
    updateResultPreview();
  }
}

function snapshotMatches(snapshot) {
  const matches = [];
  snapshot.forEach(doc => matches.push({ ...doc.data(), id: doc.id }));
  return matches.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0) || a.id.localeCompare(b.id));
}

async function loadSeasonMatches(seasonId) {
  return snapshotMatches(await db.collection('matches').where('seasonId', '==', seasonId).get());
}

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderMatches(container, matches, emptyText) {
  container.replaceChildren();
  if (!matches.length) container.appendChild(textElement('p', emptyText, 'empty-state'));
  matches.forEach(match => {
    const card = textElement('article', '', 'match-summary');
    const date = match.createdAt?.toDate?.();
    card.appendChild(textElement('p', date ? date.toLocaleString('it-IT', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : match.seasonId, 'small-label'));
    card.appendChild(textElement('p', `${match.teamA.join(' + ')} / ${match.teamB.join(' + ')}`));
    card.appendChild(textElement('strong', match.status === 'completed' ? `${match.scoreA} – ${match.scoreB} · ±${match.ratingDelta} punti` : 'In corso'));
    if (match.correctionCount) {
      card.appendChild(textElement('p', `Corretto · prima ${match.previousResult.scoreA} – ${match.previousResult.scoreB}`, 'correction-note'));
    }
    const button = textElement('button', match.status === 'completed' ? 'VEDI RISULTATO' : 'APRI PARTITA', 'secondary-button');
    button.type = 'button';
    button.addEventListener('click', () => openMatch(match));
    card.appendChild(button);
    container.appendChild(card);
  });
}

// Il registro delle partite è la fonte dei punti mensili: niente incrementi duplicabili
// o contatori players da sincronizzare. Ogni matchId contribuisce una sola volta.
function calculateRanking(matches, roster = availablePlayers) {
  const rows = new Map(roster.map(player => [player.name, { name: player.name, rating: 1000, games: 0, wins: 0, losses: 0 }]));
  const seen = new Set();
  matches.forEach(match => {
    if (match.status !== 'completed' || seen.has(match.id)) return;
    seen.add(match.id);
    const result = calculateResult(match.scoreA, match.scoreB);
    [['A', match.teamA], ['B', match.teamB]].forEach(([team, names]) => names.forEach(name => {
      if (!rows.has(name)) rows.set(name, {name, rating:1000, games:0, wins:0, losses:0});
      const row = rows.get(name);
      const won = team === result.winnerTeam;
      row.rating += won ? result.ratingDelta : -result.ratingDelta;
      row.games++;
      row.wins += Number(won);
      row.losses += Number(!won);
    }));
  });
  return [...rows.values()].sort((a,b) => b.rating - a.rating || a.name.localeCompare(b.name, 'it'));
}

function renderRanking(container, rows) {
  container.replaceChildren();
  let previousRating;
  let position = 0;
  rows.forEach((row, index) => {
    if (row.rating !== previousRating) position = index + 1;
    previousRating = row.rating;
    const entry = textElement('article', '', 'ranking-row');
    entry.appendChild(textElement('strong', `${position}. ${row.name}`));
    entry.appendChild(textElement('strong', `${row.rating} pt`, 'rating-value'));
    entry.appendChild(textElement('small', `${row.games} ${row.games === 1 ? 'partita' : 'partite'} · Vittorie: ${row.wins} · Sconfitte: ${row.losses}`));
    container.appendChild(entry);
  });
}

async function refreshHome() {
  const request = ++homeRequest;
  const message = document.getElementById('homeDataMessage');
  const month = getSeasonId();
  document.getElementById('homeSeason').textContent = new Date().toLocaleDateString('it-IT', {month:'long',year:'numeric'}).toUpperCase();
  message.textContent = 'Aggiornamento partite e classifica…';
  try {
    const [matches, openSnapshot] = await Promise.all([
      loadSeasonMatches(month), db.collection('matches').where('status','==','in_progress').get()
    ]);
    if (request !== homeRequest) return;
    renderMatches(document.getElementById('openMatches'), snapshotMatches(openSnapshot), 'Nessuna partita in corso.');
    renderMatches(recentMatchesPreview, matches.filter(match => match.status === 'completed').slice(0,3), 'Nessuna partita conclusa questo mese.');
    const podium = document.getElementById('homePodium');
    podium.replaceChildren();
    const ranked = calculateRanking(matches).filter(row => row.games > 0);
    let rank = 0;
    ranked.slice(0,3).forEach((row,index) => {
      if (index === 0 || row.rating !== ranked[index - 1].rating) rank = index + 1;
      const item = textElement('div', `${rank}°`);
      item.appendChild(textElement('strong', row.name));
      item.appendChild(textElement('small', `${row.rating} pt`));
      podium.appendChild(item);
    });
    if (!ranked.length) podium.appendChild(textElement('p','La classifica inizierà con la prima partita conclusa.','empty-state'));
    message.textContent = '';
  } catch (error) {
    if (request !== homeRequest) return;
    console.error('Errore caricamento Home:',error);
    message.textContent = 'Non è stato possibile aggiornare i dati. Controlla la connessione e premi Aggiorna.';
  }
}

async function refreshHistory() {
  const request = ++historyRequest;
  const month = historyMonth.value;
  const message = document.getElementById('historyMessage');
  document.getElementById('historyList').replaceChildren();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { message.textContent = 'Scegli un mese.'; return; }
  message.textContent = 'Caricamento…';
  try {
    const matches = await loadSeasonMatches(month);
    if (request !== historyRequest) return;
    renderMatches(document.getElementById('historyList'), matches, 'Nessuna partita in questo mese.');
    message.textContent = '';
  } catch (error) {
    if (request === historyRequest) message.textContent = 'Impossibile caricare lo storico. Controlla la connessione e riprova.';
  }
}

async function refreshRanking() {
  const request = ++rankingRequest;
  const month = rankingMonth.value;
  const message = document.getElementById('rankingMessage');
  document.getElementById('rankingList').replaceChildren();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { message.textContent = 'Scegli un mese.'; return; }
  message.textContent = 'Caricamento…';
  try {
    const matches = await loadSeasonMatches(month);
    if (request !== rankingRequest) return;
    renderRanking(document.getElementById('rankingList'), calculateRanking(matches));
    message.textContent = '';
  } catch (error) {
    if (request === rankingRequest) message.textContent = 'Impossibile caricare la classifica. Controlla la connessione e riprova.';
  }
}

resultForm.addEventListener('submit', closeMatch);
[scoreAInput,scoreBInput].forEach(input => input.addEventListener('input',updateResultPreview));
cancelResultButton.addEventListener('click', () => { if (!isClosingMatch) openMatch(currentMatch); });
document.querySelectorAll('[data-go-home]').forEach(button => button.addEventListener('click', () => {
  showScreen(homeScreen);
  refreshHome();
}));
document.getElementById('refreshHomeButton').addEventListener('click',refreshHome);
rankingButton.addEventListener('click', () => {
  rankingMonth.value = getSeasonId();
  showScreen(document.getElementById('rankingScreen'));
  refreshRanking();
});
historyButton.addEventListener('click', () => {
  historyMonth.value = getSeasonId();
  showScreen(document.getElementById('historyScreen'));
  refreshHistory();
});
historyMonth.addEventListener('change', refreshHistory);
rankingMonth.addEventListener('change', refreshRanking);
document.getElementById('refreshHistoryButton').addEventListener('click',refreshHistory);
document.getElementById('refreshRankingButton').addEventListener('click',refreshRanking);
