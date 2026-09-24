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
const bottomNav = document.getElementById('bottomNav');
const draftResumeBar = document.getElementById('draftResumeBar');
let pausedResult = null;
let isCreatingMatch = false;
let currentMatch = null;


function showScreen(screen) {
  if (selectionNeedsChange && screen !== playerScreen && !(isCurrentUserAdmin() && screen.id === 'playersScreen')) screen = playerScreen;
  document.querySelectorAll('.screen').forEach(item => item.classList.remove('active'));
  screen.classList.add("active");
  updateNavigationState(screen);
  window.scrollTo({top: 0, behavior: 'auto'});
  screen.tabIndex = -1;
  screen.focus({preventScroll: true});
}

function updateNavigationState(screen = document.querySelector('.screen.active')) {
  const section = {
    homeScreen: 'home', rankingScreen: 'ranking', historyScreen: 'history', hallOfFameScreen: 'history',
    newMatchScreen: 'play', drawResultScreen: 'play',
    playersScreen: 'players', playerProfileScreen: 'players',
    matchInProgressScreen: currentMatch?.status === 'completed' ? 'history' : 'play',
    resultScreen: resultMode === 'correction' ? 'history' : 'play'
  }[screen?.id];
  bottomNav.hidden = !section;
  document.body.classList.toggle('has-navigation', Boolean(section));
  bottomNav.querySelectorAll('[data-nav]').forEach(button => {
    if (button.dataset.nav === section) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  draftResumeBar.hidden = !section || !pausedResult || screen?.id === 'resultScreen';
  document.body.classList.toggle('has-result-draft', !draftResumeBar.hidden);
  updateNavigationLock();
}

function updateNavigationLock() {
  const busy = isCreatingMatch || isClosingMatch || isDrawing;
  bottomNav.setAttribute('aria-busy', String(busy));
  document.querySelectorAll('#bottomNav button, #draftResumeBar button').forEach(button => button.disabled = busy);
}

function pauseResultForm() {
  if (!resultScreen.classList.contains('active')) return;
  const changed = resultMode === 'correction'
    ? scoreAInput.value !== String(correctionBasis.scoreA) || scoreBInput.value !== String(correctionBasis.scoreB) || !sameNapoleon(resultNapoleon, correctionBasis.napoleon)
    : scoreAInput.value !== '' || scoreBInput.value !== '' || resultNapoleon.length > 0;
  pausedResult = changed ? {
    match: currentMatch, mode: resultMode, basis: correctionBasis,
    scoreA: scoreAInput.value, scoreB: scoreBInput.value, napoleon:[...resultNapoleon]
  } : null;
}

async function resumeResultForm() {
  if (!pausedResult || isCreatingMatch || isClosingMatch) return;
  const draft = pausedResult;
  if (!auth.currentUser) return;
  try {
    const season = await db.collection('seasons').doc(draft.match.seasonId).get({source:'server'});
    if (pausedResult !== draft || isClosingMatch || isCreatingMatch) return;
    if (draft.match.seasonId !== getSeasonId() || (season.exists && season.data().closed === true)) {
      document.getElementById('seasonLifecycleMessage').textContent = 'Il risultato sospeso appartiene a un mese chiuso o precedente: non può essere salvato.';
      return;
    }
    matchAccess = {id:draft.match.id, editable:true};
  } catch (error) {
    document.getElementById('seasonLifecycleMessage').textContent = 'Impossibile riprendere il risultato. Verifica la connessione e riprova.';
    return;
  }
  pausedResult = null;
  currentMatch = draft.match;
  openResultForm(draft.mode);
  correctionBasis = draft.basis;
  scoreAInput.value = draft.scoreA;
  scoreBInput.value = draft.scoreB;
  resultNapoleon = [...draft.napoleon]; renderResultNapoleon();
  updateResultPreview();
}

function navigateTo(destination) {
  if (isDrawing || isCreatingMatch || isClosingMatch || !auth.currentUser || !localStorage.getItem('rankingScopaPlayer')) return;
  if (!ensureSelectedPlayerActive()) return;
  syncCurrentSeason();
  pauseResultForm();
  if (destination === 'home') {
    showScreen(homeScreen);
    refreshHome();
  } else if (destination === 'play') {
    if (pausedResult && pausedResult.match.seasonId === getSeasonId()) { resumeResultForm(); return; }
    if (currentDraw) { showDraw(currentDraw); return; }
    if (!matchPlayerList.childElementCount) createMatchPlayerList();
    showScreen(newMatchScreen);
  } else if (destination === 'ranking') {
    rankingMonth.value = getSeasonId();
    showScreen(document.getElementById('rankingScreen'));
    refreshRanking();
  } else if (destination === 'history') {
    historyMonth.value = getSeasonId();
    showScreen(document.getElementById('historyScreen'));
    refreshHistory();
  } else if (destination === 'hallOfFame') {
    showScreen(document.getElementById('hallOfFameScreen'));
    refreshHallOfFame();
  } else if (destination === 'players') {
    playersMonth.value = getSeasonId();
    showScreen(document.getElementById('playersScreen'));
    refreshPlayers();
  }
}

let availablePlayers = [];

let currentDraw = null;

async function createPlayerButtons() {
  await startPlayersSubscription();
}
async function selectPlayer(playerName) {
  if (!auth.currentUser || !availablePlayers.some(player => player.name === playerName)) {
    document.getElementById('playerSelectionMessage').textContent = 'Scegli un giocatore attivo.';
    return;
  }
  localStorage.setItem('rankingScopaPlayer',playerName);
  selectionNeedsChange = false;
  document.getElementById('playerSelectionMessage').textContent = '';
  welcomePlayerName.textContent = playerName.toUpperCase();
  showScreen(homeScreen);
  await refreshHome();
}

enterButton.addEventListener("click", () => {
  showScreen(playerScreen);
});


auth.onAuthStateChanged(async user => {
  if (stopPlayersListener) { stopPlayersListener(); stopPlayersListener = null; }
  rosterSubscriptionUid = null;
  adminStatus = {uid:user?.uid || null,enabled:false,loaded:false};
  renderPlayerManagement();
  rosterLoaded = false;
  if (!user) {
    allPlayers = []; availablePlayers = []; rawPlayerDocuments = [];
    try { await auth.signInAnonymously(); } catch (error) { console.error('Errore autenticazione:',error); }
    return;
  }
  try { await loadAdminStatus(); } catch (error) { console.error('Stato admin non disponibile:',error); }
  try {
    await createPlayerButtons();
    if (auth.currentUser?.uid !== user.uid) return;
    await refreshHome();
    const savedPlayer = localStorage.getItem('rankingScopaPlayer');
    if (savedPlayer && availablePlayers.some(player => player.name === savedPlayer)) {
      welcomePlayerName.textContent = savedPlayer.toUpperCase();
      showScreen(homeScreen);
    } else showScreen(playerScreen);
  } catch (error) {
    document.getElementById('playerSelectionMessage').textContent = 'Impossibile caricare il gruppo. Verifica connessione e regole, poi premi AGGIORNA.';
    showScreen(playerScreen);
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
newMatchButton.addEventListener('click', () => navigateTo('play'));
backHomeButton.addEventListener('click', () => navigateTo('home'));
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
function generateDraw(selectedPlayers, history = []) {
  const shuffled = shufflePlayers(selectedPlayers);
  const chosen = shuffled.slice(0,4);
  let split;
  try { split = chooseBalancedRandomSplit(chosen, history); }
  catch (error) { split = chooseBalancedRandomSplit(chosen); }
  // Randomize team labels too; exclusions remain a uniform random sample.
  if (secureRandomInt(2)) split = {teamA:split.teamB, teamB:split.teamA};
  return {...split, excluded:shuffled.slice(4)};
}
drawButton.addEventListener('click', () => {
  const selected = Array.from(matchPlayerList.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
  if (selected.length < 4) { alert('Devi selezionare almeno 4 giocatori.'); return; }
  return drawSelectedPlayers(selected);
});

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
redrawButton.addEventListener('click', () => {
  if (!currentDraw || isCreatingMatch || isDrawing) return;
  return drawSelectedPlayers([...currentDraw.teamA,...currentDraw.teamB,...currentDraw.excluded]);
});

cancelDrawButton.addEventListener(
  "click",
  () => {
    if (isCreatingMatch) return;

    currentDraw = null;

    showScreen(newMatchScreen);

  }
);
function getSeasonId(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Rome', year:'numeric', month:'2-digit'}).formatToParts(date);
  return parts.find(part => part.type === 'year').value + '-' + parts.find(part => part.type === 'month').value;
}

async function startMatch() {
  if (isCreatingMatch || isDrawing || !currentDraw) return;
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
  updateNavigationLock();
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
    await refreshRosterFromServer();
    const reference = db.collection('matches').doc();
    await db.runTransaction(async transaction => {
      await assertMatchEditable(transaction, match);
      await assertActiveMatchPlayers(transaction, [...participants, playerName]);
      transaction.set(reference, match);
    });
    currentMatch = { ...match, id: reference.id };
    previousDraw = currentDraw;
    currentDraw = null;
    matchPlayerList.replaceChildren();
    openMatch(currentMatch);
  } catch (error) {
    console.error("Errore creazione partita:", error);
    matchSaveMessage.textContent = error.code === "permission-denied"
      ? "Firestore non autorizza la creazione della partita. Controlla le regole della collection matches, poi riprova."
      : "Partita non salvata. Controlla la connessione e riprova: il sorteggio è rimasto invariato.";
  } finally {
    isCreatingMatch = false;
    updateNavigationLock();
    [startMatchButton, redrawButton, cancelDrawButton].forEach(button => button.disabled = false);
    startMatchButton.textContent = "♠ INIZIA PARTITA";
  }
}

startMatchButton.addEventListener("click", startMatch);
function openResultForm(mode) {
  if (isClosingMatch || !canManageMatch(currentMatch)) return;
  if (pausedResult) {
    if (pausedResult.match.id === currentMatch.id && pausedResult.mode === mode) resumeResultForm();
    else document.getElementById('activeMatchNotice').textContent = 'Hai un risultato non salvato per un’altra partita. Premi RIPRENDI nella barra in basso e confermalo oppure torna alla partita per annullare il modulo.';
    return;
  }
  const correcting = mode === 'correction';
  if (currentMatch.status !== (correcting ? 'completed' : 'in_progress')) return;
  resultMode = mode;
  correctionBasis = correcting ? {
    id: currentMatch.id,
    scoreA: currentMatch.scoreA,
    scoreB: currentMatch.scoreB,
    napoleon: getMatchNapoleon(currentMatch),
    correctionCount: currentMatch.correctionCount || 0,
    matchRevision: currentMatch.matchRevision || 0
  } : {id:currentMatch.id, matchRevision:currentMatch.matchRevision || 0};
  resultForm.reset();
  resultNapoleon = correcting ? getMatchNapoleon(currentMatch) : [];
  renderResultNapoleon();
  if (correcting) {
    scoreAInput.value = currentMatch.scoreA;
    scoreBInput.value = currentMatch.scoreB;
  }
  document.getElementById('resultFormTitle').textContent = correcting ? 'CORREGGI RISULTATO' : 'INSERISCI RISULTATO';
  document.getElementById('resultFormHelp').textContent = correcting
    ? `Risultato registrato: ${currentMatch.scoreA} – ${currentMatch.scoreB}. La correzione ricalcola l’Elo di questa partita e di tutte le successive del mese.`
    : 'Inserisci due punteggi interi non negativi, senza pareggio. Controlla squadre e punteggi prima di confermare.';
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
  return { scoreA, scoreB, winnerTeam: scoreA > scoreB ? 'A' : 'B' };
}

function readResult() {
  if (!scoreAInput.value.trim() || !scoreBInput.value.trim()) throw new Error('Inserisci il punteggio di entrambe le squadre.');
  return {...calculateResult(Number(scoreAInput.value), Number(scoreBInput.value)),
    napoleon:validateMatchNapoleon(currentMatch, resultNapoleon)};
}

function resultDescription(match) {
  if (!match.elo) return 'Elo non disponibile: aggiorna la partita per ricalcolarlo dal mese completo.';
  const signed = value => value > 0 ? '+' + value : String(value);
  return [...match.teamA.map(name => name + ' ' + signed(match.elo.deltaA)),
    ...match.teamB.map(name => name + ' ' + signed(match.elo.deltaB))].join(' · ') + ' Elo. Esclusi invariati.';
}

function updateResultPreview() {
  try {
    const result = readResult();
    const winners = result.winnerTeam === 'A' ? currentMatch.teamA : currentMatch.teamB;
    resultPreview.textContent = `Vince ${winners.join(' + ')}. Elo mensile · K 32: la variazione sarà ricalcolata dal registro completo dopo il salvataggio.`;
    if (resultMode === 'correction' && correctionBasis) {
      if (result.scoreA === correctionBasis.scoreA && result.scoreB === correctionBasis.scoreB && sameNapoleon(result.napoleon, correctionBasis.napoleon)) {
        resultPreview.textContent = 'Il risultato è invariato. Modifica il punteggio o il Napoleone per correggerlo.';
        confirmResultButton.disabled = true;
        return;
      }
      resultPreview.textContent += ' La correzione ricalcola anche tutte le partite successive del mese.';
    }
    confirmResultButton.disabled = isClosingMatch || !canManageMatch(currentMatch);
  } catch (error) {
    resultPreview.textContent = error.message;
    confirmResultButton.disabled = true;
  }
}

let matchDetailRequest = 0;
function paintMatchDetail(match) {
  activeTeamAPlayers.textContent = teamDescription(match, match.teamA);
  activeTeamBPlayers.textContent = teamDescription(match, match.teamB);
  activeExcludedPlayers.textContent = (match.excluded || []).join(', ') || 'Nessuno';
  activeMatchSeason.textContent = 'STAGIONE ' + match.seasonId;
  const completed = match.status === 'completed';
  const editable = canManageMatch(match);
  document.getElementById('activeMatchTitle').textContent = completed ? 'PARTITA CONCLUSA' : 'PARTITA IN CORSO';
  document.getElementById('activeMatchScore').textContent = completed ? match.scoreA + ' – ' + match.scoreB : '';
  enterResultButton.hidden = completed || !editable;
  correctResultButton.hidden = !completed || !editable;
  document.getElementById('cancelMatchResultButton').hidden = !completed || !editable;
  document.getElementById('correctionInfo').textContent = completed && match.correctionCount && match.previousResult
    ? 'Risultato corretto ' + match.correctionCount + ' volte. Prima: ' + match.previousResult.scoreA + ' – ' + match.previousResult.scoreB + '.' : '';
  resultMessage.textContent = completed ? resultDescription(match) : '';
  renderMatchMetadata(match);
  updateNavigationState();
}

async function openMatch(match) {
  const request = ++matchDetailRequest;
  currentMatch = match;
  matchAccess = {id:match.id, editable:false};
  paintMatchDetail(match);
  document.getElementById('activeMatchNotice').textContent = 'Verifica della partita e della stagione…';
  showScreen(matchInProgressScreen);
  try {
    const [matches, season] = await Promise.all([
      loadSeasonMatches(match.seasonId),
      db.collection('seasons').doc(match.seasonId).get({source:'server'})
    ]);
    if (request !== matchDetailRequest || currentMatch?.id !== match.id || !matchInProgressScreen.classList.contains('active')) return;
    const latest = matches.find(item => item.id === match.id);
    if (!latest) throw new Error('Partita non trovata.');
    currentMatch = latest;
    matchAccess = {id:latest.id, editable:!(season.exists && season.data().closed === true)};
    paintMatchDetail(latest);
    document.getElementById('activeMatchNotice').textContent = canManageMatch(latest) ? '' :
      'Stagione chiusa o mese precedente: partita in sola lettura.';
  } catch (error) {
    if (request === matchDetailRequest) document.getElementById('activeMatchNotice').textContent =
      'Impossibile verificare la partita. Riaprila quando la connessione è disponibile; nessuna modifica è abilitata.';
  }
}

async function closeMatch(event) {
  event.preventDefault();
  if (isClosingMatch || !currentMatch) return;
  let result;
  try { result = readResult(); } catch (error) { resultSaveMessage.textContent = error.message; return; }
  const user = auth.currentUser;
  if (!user || currentMatch.seasonId !== getSeasonId()) {
    resultSaveMessage.textContent = 'Puoi salvare soltanto risultati del mese corrente e di una stagione aperta.';
    return;
  }
  const matchId = currentMatch.id;
  const correcting = resultMode === 'correction';
  const expected = correctionBasis;
  if (correcting && (!expected || expected.id !== matchId)) return;
  if (correcting && expected.scoreA === result.scoreA && expected.scoreB === result.scoreB && sameNapoleon(expected.napoleon, result.napoleon)) {
    resultSaveMessage.textContent = 'Il risultato è invariato: nessuna modifica da salvare.';
    return;
  }
  isClosingMatch = true;
  updateNavigationLock();
  [confirmResultButton, cancelResultButton, scoreAInput, scoreBInput].forEach(element => element.disabled = true);
  resultSaveMessage.textContent = correcting ? 'Salvataggio della correzione…' : 'Salvataggio del risultato…';
  try {
    const reference = db.collection('matches').doc(matchId);
    const saved = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error('La partita non esiste più.');
      const match = snapshot.data();
      await assertMatchEditable(transaction, match);
      validateMatchNapoleon(match, result.napoleon);
      if (correcting) {
        if (match.status !== 'completed') throw new Error('La partita non risulta conclusa. Riaprila dalla Home.');
        const latest = { ...match, id: matchId };
        // Se una richiesta precedente è già riuscita, non crea una nuova correzione.
        if (match.scoreA === result.scoreA && match.scoreB === result.scoreB && sameNapoleon(match.napoleon, result.napoleon)) {
          return { match: latest, outcome: 'unchanged' };
        }
        if (match.scoreA !== expected.scoreA || match.scoreB !== expected.scoreB || !sameNapoleon(match.napoleon, expected.napoleon) ||
            (match.correctionCount || 0) !== expected.correctionCount ||
            (match.matchRevision || 0) !== expected.matchRevision) {
          return { match: latest, outcome: 'conflict' };
        }
        const update = {
          ...result,
          matchRevision: (match.matchRevision || 0) + 1,
          correctionCount: (match.correctionCount || 0) + 1,
          previousResult: {
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            winnerTeam: match.winnerTeam,
            napoleon: [...(match.napoleon || [])]
          },
          correctedAt: firebase.firestore.FieldValue.serverTimestamp(),
          correctedByUid: user.uid
        };
        transaction.update(reference, update);
        return { match: { ...latest, ...update }, outcome: 'corrected' };
      }
      // La lettura nella transazione impedisce due chiusure anche da schede diverse.
      if (match.status === 'completed') return { match: { ...match, id: matchId }, outcome: 'unchanged' };
      if (match.status !== 'in_progress' || (match.matchRevision || 0) !== (expected?.matchRevision || 0)) throw new Error('La partita è cambiata. Riaprila prima di salvare il risultato.');
      const update = {
        ...result,
        status: 'completed',
        matchRevision: (match.matchRevision || 0) + 1,
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        completedByUid: user.uid,
        completedByPlayer: localStorage.getItem('rankingScopaPlayer') || 'Non disponibile'
      };
      transaction.update(reference, update);
      return { match: { ...match, ...update, id: matchId }, outcome: 'completed' };
    });
    playersSeasonData = null;
    await openMatch(saved.match);
    document.getElementById('activeMatchNotice').textContent = saved.outcome === 'conflict'
      ? 'Il risultato è stato modificato da un’altra scheda mentre lo correggevi. La tua correzione non è stata salvata. Qui vedi il risultato aggiornato: controllalo e premi CORREGGI RISULTATO se serve.'
      : saved.outcome === 'corrected' ? 'Correzione salvata. Elo e storico sono ricalcolati anche per tutte le partite successive del mese.'
      : saved.outcome === 'unchanged' ? 'Questo risultato è già stato salvato. Nessuna partita è stata conteggiata due volte.' : '';
    await Promise.all([refreshHome(), refreshRanking(), refreshHistory(), refreshPlayers()]);
  } catch (error) {
    console.error('Errore salvataggio risultato:', error);
    resultSaveMessage.textContent = error.code === 'permission-denied'
      ? `Pubblica le nuove regole Firestore per autorizzare ${correcting ? 'la correzione' : 'la chiusura'}, poi riprova. I punteggi inseriti sono ancora qui.`
      : `Risultato non salvato. ${error.code ? 'Controlla la connessione e riprova.' : error.message}`;
  } finally {
    isClosingMatch = false;
    updateNavigationLock();
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
  const matches = snapshotMatches(await db.collection('matches').where('seasonId', '==', seasonId).get({source:'server'}));
  const state = calculateSeasonState(matches, availablePlayers, seasonId);
  return matches.map(match => ({ ...match, elo: state.matchDeltas.get(match.id) }));
}

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderMatches(container, matches, emptyText, compact = false) {
  container.replaceChildren();
  if (!matches.length) container.appendChild(textElement('p', emptyText, 'empty-state'));
  matches.forEach(match => {
    const card = textElement('button', '', compact ? 'match-summary match-compact' : 'match-summary match-card');
    card.type = 'button';
    card.addEventListener('click', () => openMatch(match));
    const completed = match.status === 'completed';
    if (compact) {
      card.appendChild(textElement('span', teamDescription(match,match.teamA)));
      card.appendChild(textElement('strong', match.scoreA + '–' + match.scoreB));
      card.appendChild(textElement('span', teamDescription(match,match.teamB)));
    } else {
      for (const [team,score] of [[match.teamA,match.scoreA],[match.teamB,match.scoreB]]) {
        const row = textElement('span','','match-team-row');
        row.appendChild(textElement('span',teamDescription(match,team)));
        row.appendChild(textElement('strong',completed ? String(score) : '—'));
        card.appendChild(row);
      }
      card.appendChild(textElement('small',matchDate(match) + (completed && match.completedByPlayer ? ' · Inserito da ' + match.completedByPlayer : ''),'match-meta'));
      if (!completed) card.appendChild(textElement('small','IN CORSO','match-meta'));
      if ((match.correctionCount || 0) > 0) card.appendChild(textElement('small','CORRETTO','correction-badge'));
    }
    container.appendChild(card);
  });
}


// Fonte di verità: solo risultati completed, in ordine di creazione immutabile.
// correctedAt e completedAt non spostano una partita nella sequenza Elo.
function compareMatchChronology(a, b) {
  const timestamp = match => {
    const value = match.createdAt;
    if (Number.isFinite(value?.seconds)) return [value.seconds, value.nanoseconds || 0];
    const millis = value?.toMillis?.();
    if (Number.isFinite(millis)) return [Math.floor(millis / 1000), (millis % 1000) * 1000000];
    throw new Error('Data di creazione mancante per la partita ' + match.id);
  };
  const left = timestamp(a), right = timestamp(b);
  return left[0] - right[0] || left[1] - right[1] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function calculateSeasonState(matches, roster = availablePlayers, seasonId) {
  const seasons = new Set(matches.map(match => match.seasonId));
  if (seasonId === undefined) {
    if (seasons.size > 1) throw new Error('Seleziona una sola stagione per il calcolo Elo.');
    seasonId = seasons.values().next().value;
  }
  const rows = new Map();
  const ensurePlayer = name => {
    if (!rows.has(name)) rows.set(name, {name, rating: 1000, games: 0, wins: 0, losses: 0});
    return rows.get(name);
  };
  roster.forEach(player => ensurePlayer(player.name));
  const matchDeltas = new Map();
  const completed = matches.filter(match => match.seasonId === seasonId && match.status === 'completed');
  // Validate even a single match (Array.sort need not call the comparator).
  completed.forEach(match => compareMatchChronology(match, match));
  completed.sort(compareMatchChronology).forEach(match => {
    if (typeof match.id !== 'string' || !match.id) throw new Error('ID partita mancante.');
    if (matchDeltas.has(match.id)) return;
    if (!Array.isArray(match.teamA) || !Array.isArray(match.teamB) ||
        match.teamA.length !== 2 || match.teamB.length !== 2 ||
        new Set([...match.teamA, ...match.teamB]).size !== 4 ||
        ![...match.teamA, ...match.teamB].every(name => typeof name === 'string' && name.trim())) {
      throw new Error('Squadre non valide nella partita ' + match.id);
    }
    const result = calculateResult(match.scoreA, match.scoreB);
    const ratingA = match.teamA.reduce((sum, name) => sum + ensurePlayer(name).rating, 0) / 2;
    const ratingB = match.teamB.reduce((sum, name) => sum + ensurePlayer(name).rating, 0) / 2;
    const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
    const K = 32;
    const actualA = result.winnerTeam === 'A' ? 1 : 0;
    const gap = Math.abs(match.scoreA - match.scoreB);
    const marginMultiplier = 1 + gap / 10;
    const baseDelta = K * (actualA - expectedA);
    const deltaA = Math.round(baseDelta * marginMultiplier);
    const deltaB = -deltaA;
    matchDeltas.set(match.id, {ratingA, ratingB, expectedA, gap, marginMultiplier, baseDelta, deltaA, deltaB});
    [['A', match.teamA, deltaA], ['B', match.teamB, deltaB]].forEach(([team, names, delta]) => {
      names.forEach(name => {
        const row = ensurePlayer(name);
        const won = team === result.winnerTeam;
        row.rating += delta;
        row.games++;
        row.wins += Number(won);
        row.losses += Number(!won);
      });
    });
  });
  return {seasonId, ranking: [...rows.values()].sort((a,b) => b.rating - a.rating || a.name.localeCompare(b.name, 'it')), matchDeltas};
}

function calculateRanking(matches, roster = availablePlayers) {
  return calculateSeasonState(matches, roster).ranking;
}

function renderRanking(container, rows, matches = []) {
  const napoleon = countMatchNapoleons(matches);
  container.replaceChildren();
  let previousRating;
  let position = 0;
  rows.forEach((row, index) => {
    if (row.rating !== previousRating) position = index + 1;
    previousRating = row.rating;
    const entry = textElement('article', '', 'ranking-row');
    entry.appendChild(textElement('strong', `${position}. ${row.name}${napoleonBadge(napoleon.get(row.name))}`));
    entry.appendChild(textElement('strong', `${row.rating} Elo`, 'rating-value'));
    entry.appendChild(textElement('small', `${row.games} ${row.games === 1 ? 'partita' : 'partite'} · ${row.wins}-${row.losses} W-L`));
    const form = textElement('span','','recent-form');
    renderRecentForm(form,getRecentForm(matches,row.name));
    entry.appendChild(form);
    container.appendChild(entry);
  });
}

async function refreshHome() {
  await ensurePreviousSeasonsClosed();
  const request = ++homeRequest;
  const message = document.getElementById('homeDataMessage');
  const month = getSeasonId();
  document.getElementById('homeSeason').textContent = new Date().toLocaleDateString('it-IT', {month:'long',year:'numeric',timeZone:'Europe/Rome'}).toUpperCase();
  message.textContent = 'Aggiornamento partite e classifica…';
  try {
    const matches = await loadSeasonMatches(month);
    if (request !== homeRequest) return;
    renderMatches(document.getElementById('openMatches'), matches.filter(match => match.status === 'in_progress'), 'Nessuna partita in corso.');
    renderMatches(recentMatchesPreview, matches.filter(match => match.status === 'completed').slice(0,3), 'Nessuna partita conclusa questo mese.', true);
    const podium = document.getElementById('homePodium');
    podium.replaceChildren();
    const ranked = calculateRanking(matches).filter(row => row.games > 0);
    let rank = 0;
    ranked.slice(0,3).forEach((row,index) => {
      if (index === 0 || row.rating !== ranked[index - 1].rating) rank = index + 1;
      const item = textElement('div', `${rank}°`);
      item.appendChild(textElement('strong', row.name));
      item.appendChild(textElement('small', `${row.rating} Elo`));
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
  await ensurePreviousSeasonsClosed();
  const request = ++historyRequest;
  const month = historyMonth.value;
  const message = document.getElementById('historyMessage');
  historyMatches = []; renderHistory();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { message.textContent = 'Scegli un mese.'; return; }
  message.textContent = 'Caricamento…';
  try {
    const matches = await loadSeasonMatches(month);
    if (request !== historyRequest) return;
    historyMatches = matches; renderHistory();
    message.textContent = '';
  } catch (error) {
    if (request === historyRequest) message.textContent = 'Impossibile caricare lo storico. Controlla la connessione e riprova.';
  }
}

async function refreshRanking() {
  await ensurePreviousSeasonsClosed();
  const request = ++rankingRequest;
  const month = rankingMonth.value;
  const message = document.getElementById('rankingMessage');
  document.getElementById('rankingList').replaceChildren();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { message.textContent = 'Scegli un mese.'; return; }
  message.textContent = 'Caricamento…';
  try {
    const matches = await loadSeasonMatches(month);
    if (request !== rankingRequest) return;
    renderRanking(document.getElementById('rankingList'), calculateRanking(matches), matches);
    message.textContent = '';
  } catch (error) {
    if (request === rankingRequest) message.textContent = 'Impossibile caricare la classifica. Controlla la connessione e riprova.';
  }
}

resultForm.addEventListener('submit', closeMatch);
[scoreAInput,scoreBInput].forEach(input => input.addEventListener('input',updateResultPreview));
cancelResultButton.addEventListener('click', () => { if (!isClosingMatch) openMatch(currentMatch); });
document.querySelectorAll('[data-go-home]').forEach(button => button.addEventListener('click', () => {
  navigateTo('home');
}));
document.getElementById('refreshHomeButton').addEventListener('click',refreshHome);
rankingButton.addEventListener('click', () => navigateTo('ranking'));
historyButton.addEventListener('click', () => navigateTo('history'));
historyMonth.addEventListener('change', refreshHistory);
rankingMonth.addEventListener('change', refreshRanking);
document.getElementById('refreshHistoryButton').addEventListener('click',refreshHistory);
document.getElementById('refreshRankingButton').addEventListener('click',refreshRanking);

bottomNav.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => navigateTo(button.dataset.nav)));
document.getElementById('resumeResultButton').addEventListener('click',resumeResultForm);

const playersMonth = document.getElementById('playersMonth');
const profileMonth = document.getElementById('profileMonth');
let playersRequest = 0;
let playersSeasonData = null;
let profilePlayerName = null;

async function refreshPlayers() {
  await ensurePreviousSeasonsClosed();
  const request = ++playersRequest;
  const seasonId = playersMonth.value;
  profileMonth.value = seasonId;
  const messages = [document.getElementById('playersMessage'), document.getElementById('profileMessage')];
  playersSeasonData = null;
  document.getElementById('playersDirectory').replaceChildren();
  document.getElementById('profileContent').hidden = true;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(seasonId)) {
    messages.forEach(message => message.textContent = 'Scegli un mese.');
    return;
  }
  messages.forEach(message => message.textContent = 'Caricamento statistiche…');
  playerCareerSeasons = null;
  playerCareerError = 'Caricamento palmarès…';
  renderPlayerCareer();
  try {
    const [monthly, career] = await Promise.allSettled([loadAllMatches(), loadClosedSeasons()]);
    if (request !== playersRequest) return;
    playerCareerSeasons = career.status === 'fulfilled' ? career.value : null;
    playerCareerError = career.status === 'fulfilled' ? '' : 'Palmarès non disponibile. Premi AGGIORNA per riprovare.';
    playerCareerMatches = monthly.status === 'fulfilled' ? monthly.value : [];
    if (monthly.status === 'rejected') playerCareerError = 'Conteggi Napoleone non disponibili. Premi AGGIORNA.';
    renderPlayerCareer();
    if (monthly.status === 'rejected') throw monthly.reason;
    const raw = monthly.value.filter(match => match.seasonId === seasonId);
    const replay = calculateSeasonState(raw, availablePlayers, seasonId);
    const matches = raw.map(match => ({...match, elo:replay.matchDeltas.get(match.id)}));
    const state = calculateSeasonState(matches, availablePlayers, seasonId);
    const rows = state.ranking;
    playersSeasonData = {seasonId, matches, rows, state};
    renderPlayerDirectory();
    messages.forEach(message => message.textContent = '');
    if (profilePlayerName) renderPlayerProfile();
  } catch (error) {
    if (request !== playersRequest) return;
    messages.forEach(message => message.textContent = 'Impossibile caricare le statistiche. Controlla la connessione e premi Aggiorna.');
  }
}

function openPlayerProfile(name) {
  if (!playersSeasonData) return;
  profilePlayerName = name;
  profileMonth.value = playersSeasonData.seasonId;
  renderPlayerProfile();
  showScreen(document.getElementById('playerProfileScreen'));
}

function renderPlayerProfile() {
  const {matches, rows} = playersSeasonData;
  const row = rows.find(player => player.name === profilePlayerName)
    || {name:profilePlayerName, rating:1000, games:0, wins:0, losses:0};
  document.getElementById('profileName').textContent = row.name;
  document.getElementById('profileInactiveBadge').hidden = !allPlayers.some(player => player.name === row.name && !player.active);
  document.getElementById('profileRating').textContent = row.rating;
  document.getElementById('profilePosition').textContent = rows.some(player => player.name === row.name)
    ? (rows.findIndex(player => player.rating === row.rating) + 1) + '° posto' : '—';
  document.getElementById('profileNapoleons').textContent = countMatchNapoleons(matches).get(row.name) || 0;
  renderRecentForm(document.getElementById('profileForm'),getRecentForm(matches,row.name));
  const change = row.rating - 1000;
  document.getElementById('profileChange').textContent = `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)} rispetto a inizio mese`;
  document.getElementById('profileGames').textContent = row.games;
  document.getElementById('profileWins').textContent = row.wins;
  document.getElementById('profileLosses').textContent = row.losses;
  document.getElementById('profileWinRate').textContent = row.games
    ? `${(row.wins / row.games * 100).toLocaleString('it-IT', {maximumFractionDigits:1})}%` : '—';
  const played = matches.filter(match => match.status === 'completed'
    && (match.teamA.includes(row.name) || match.teamB.includes(row.name)));
  renderMatches(document.getElementById('profileMatches'), played, 'Nessuna partita conclusa per questo giocatore nel mese scelto.');
  renderPlayerAdvancedStats(calculatePlayerAdvancedStats(matches, row.name, playersSeasonData.seasonId, playersSeasonData.state));
  renderPlayerCareer();
  document.getElementById('profileContent').hidden = false;
}

playersMonth.addEventListener('change', refreshPlayers);
profileMonth.addEventListener('change', () => {
  playersMonth.value = profileMonth.value;
  refreshPlayers();
});
document.getElementById('refreshPlayersButton').addEventListener('click',refreshPlayers);
document.getElementById('refreshProfileButton').addEventListener('click',refreshPlayers);
document.getElementById('backToPlayersButton').addEventListener('click',() => navigateTo('players'));


// Archived seasons are read-only snapshots, independent of the live Elo ranking.
// Archive snapshots are immutable; automatic closure is restricted to authorized admins.
let hallOfFameRequest = 0;

async function loadClosedSeasons() {
  const snapshot = await getClosedSeasonsSnapshot();
  const seasons = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.closed !== true) return;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(doc.id) || data.seasonId !== doc.id ||
        data.year !== Number(doc.id.slice(0, 4)) || data.month !== Number(doc.id.slice(5)) ||
        !Array.isArray(data.podium) ||
        (data.podium.length > 0 && !data.podium.some(entry => entry?.position === 1)) ||
        !data.podium.every(entry => entry && Number.isInteger(entry.position) && entry.position >= 1 && entry.position <= 3 &&
          typeof entry.player === 'string' && entry.player.trim()) ||
        new Set(data.podium.map(entry => entry.player)).size !== data.podium.length ||
        !Array.isArray(data.napoleon) || !data.napoleon.every(name => typeof name === 'string' && name.trim()) ||
        !Array.isArray(data.weakRing ?? []) || !(data.weakRing ?? []).every(name => typeof name === 'string' && name.trim()) ||
        (data.name != null && typeof data.name !== 'string')) {
      throw new Error('Dati stagione non validi: ' + doc.id);
    }
    seasons.push({...data, weakRing:data.weakRing ?? [], podium: [...data.podium].sort((a,b) => a.position - b.position || a.player.localeCompare(b.player, 'it'))});
  });
  return seasons.sort((a,b) => b.seasonId.localeCompare(a.seasonId));
}

function calculateSeasonPalmares(seasons) {
  const victories = new Map();
  const seen = new Set();
  seasons.forEach(season => {
    if (season.closed !== true || seen.has(season.seasonId)) return;
    seen.add(season.seasonId);
    const winners = new Set(season.podium.filter(entry => entry.position === 1).map(entry => entry.player));
    winners.forEach(player => victories.set(player, (victories.get(player) || 0) + 1));
  });
  return [...victories].map(([player, wins]) => ({player, wins}))
    .sort((a,b) => b.wins - a.wins || a.player.localeCompare(b.player, 'it'));
}

function renderHallOfFame(seasons, matches = []) {
  const archived = seasons.filter(season => season.closed === true)
    .sort((a,b) => b.seasonId.localeCompare(a.seasonId));
  const palmares = document.getElementById('seasonPalmares');
  const list = document.getElementById('closedSeasonsList');
  palmares.replaceChildren();
  list.replaceChildren();
  document.getElementById('hallOfFameContent').hidden = !archived.length;
  document.getElementById('hallOfFameMessage').textContent = archived.length ? '' : 'Nessuna stagione archiviata.';
  calculateSeasonPalmares(archived).forEach(row => {
    const item = textElement('li', '', 'palmares-row');
    item.appendChild(textElement('strong', row.player));
    item.appendChild(textElement('span', `${row.wins} ${row.wins === 1 ? 'vittoria mensile' : 'vittorie mensili'}`));
    palmares.appendChild(item);
  });
  archived.forEach(season => {
    const napoleonCounts = getSeasonNapoleonCounts(season,matches);
    const card = textElement('article', '', 'season-archive-card');
    const month = new Date(season.year, season.month - 1, 1).toLocaleDateString('it-IT', {month:'long', year:'numeric'}).toUpperCase();
    const name = season.name?.trim();
    card.appendChild(textElement('h3', name ? name.toLocaleUpperCase('it-IT') : month));
    if (name) card.appendChild(textElement('p', month, 'season-archive-month'));
    const podium = textElement('ul', '', 'season-archive-podium');
    [...season.podium].sort((a,b) => a.position - b.position || a.player.localeCompare(b.player, 'it')).forEach(entry => {
      const item = textElement('li', '');
      const medal = textElement('span', ['🥇','🥈','🥉'][entry.position - 1]);
      medal.setAttribute('aria-label', `${entry.position}° posto`);
      item.appendChild(medal);
      item.appendChild(textElement('strong', entry.player + napoleonBadge(napoleonCounts.get(entry.player))));
      podium.appendChild(item);
    });
    card.appendChild(podium);
    if (!season.podium.length) card.appendChild(textElement('p', 'Nessuna partita conclusa: podio non assegnato.', 'scoring-rule'));

    if ((season.weakRing ?? []).length) {
      const award = textElement('div', '', 'season-archive-award weak-ring-award');
      award.appendChild(textElement('h4', '🔗 ANELLO DEBOLE'));
      award.appendChild(textElement('p', season.weakRing.join(' · ')));
      card.appendChild(award);
    }
    list.appendChild(card);
  });
}

async function refreshHallOfFame() {
  await ensurePreviousSeasonsClosed();
  const request = ++hallOfFameRequest;
  const screen = document.getElementById('hallOfFameScreen');
  const message = document.getElementById('hallOfFameMessage');
  document.getElementById('hallOfFameContent').hidden = true;
  document.getElementById('seasonPalmares').replaceChildren();
  document.getElementById('closedSeasonsList').replaceChildren();
  screen.setAttribute('aria-busy', 'true');
  message.textContent = 'Caricamento stagioni…';
  try {
    const [seasons, matches] = await Promise.all([loadClosedSeasons(), loadAllMatches()]);
    if (request !== hallOfFameRequest) return;
    renderHallOfFame(seasons, matches);
  } catch (error) {
    if (request !== hallOfFameRequest) return;
    console.error('Errore caricamento Hall of Fame:', error);
    message.textContent = error.code === 'permission-denied'
      ? 'Accesso alle stagioni non autorizzato. Verifica le regole di lettura della collection seasons e premi AGGIORNA.'
      : 'Impossibile caricare le stagioni. Verifica la connessione e i dati archiviati, poi premi AGGIORNA.';
  } finally {
    if (request === hallOfFameRequest) screen.setAttribute('aria-busy', 'false');
  }
}

function openHallOfFame() {
  navigateTo('hallOfFame');
}

document.getElementById('hallOfFameButton').addEventListener('click', openHallOfFame);
document.getElementById('refreshHallOfFameButton').addEventListener('click', refreshHallOfFame);
document.getElementById('backToHistoryButton').addEventListener('click', () => navigateTo('history'));


// Calendar shared with firestore.rules: month boundaries in Europe/Rome.
let seasonsCheckPromise = null;
let observedSeasonId = null;
let matchAccess = {id: null, editable: false};
const RESULT_FIELDS = [
  'scoreA', 'scoreB', 'winnerTeam', 'completedAt', 'completedByUid', 'completedByPlayer', 'napoleon',
  'correctionCount', 'previousResult', 'correctedAt', 'correctedByUid', 'ratingDelta'
];

function syncCurrentSeason() {
  const seasonId = getSeasonId();
  if (observedSeasonId !== seasonId) {
    observedSeasonId = seasonId;
    [historyMonth, rankingMonth, playersMonth, profileMonth].forEach(input => input.value = seasonId);
    homeRequest++; historyRequest++; rankingRequest++; playersRequest++;
    playersSeasonData = null;
    // Keep drafts available for inspection; save is denied for an expired month.
    matchAccess = {id: null, editable: false};
  }
  return seasonId;
}

function canManageMatch(match) {
  return Boolean(auth.currentUser && match && match.seasonId === getSeasonId() &&
    matchAccess.id === match.id && matchAccess.editable);
}

async function assertMatchEditable(transaction, match) {
  if (!auth.currentUser || match.seasonId !== getSeasonId()) {
    throw new Error('La partita appartiene a un mese precedente: è in sola lettura.');
  }
  const season = await transaction.get(db.collection('seasons').doc(match.seasonId));
  if (season.exists && season.data().closed === true) throw new Error('La stagione è chiusa: il risultato non è modificabile.');
}

function calculateSeasonAwards(matches, roster, seasonId) {
  const ranking = calculateSeasonState(matches, roster, seasonId).ranking;
  const completedCount = matches.filter(match => match.status === 'completed' && match.seasonId === seasonId).length;
  const podium = [];
  let previousRating, position = 0;
  // Same competition ranks as the monthly ranking: 1, 1, 3 (not a tie-break).
  if (completedCount) ranking.forEach((row, index) => {
    if (row.rating !== previousRating) position = index + 1;
    previousRating = row.rating;
    if (position <= 3) podium.push({position, player: row.name});
  });
  const eligible = ranking.filter(row => row.games >= 5);
  const lowest = eligible.reduce((value, row) => value === null || row.rating < value ? row.rating : value, null);
  const weakRing = eligible.filter(row => row.rating === lowest).map(row => row.name).sort((a,b) => a.localeCompare(b,'it'));
  return {podium, weakRing};
}

async function closeSeasonAutomatically(seasonId) {
  if (!auth.currentUser || !/^\d{4}-(0[1-9]|1[0-2])$/.test(seasonId) || seasonId >= getSeasonId()) {
    throw new Error('Si possono archiviare soltanto mesi precedenti.');
  }
  const reference = db.collection('seasons').doc(seasonId);
  const existing = await reference.get({source: 'server'});
  if (existing.exists && existing.data().closed === true) return false;
  // Never archive a cache-only query. Rules freeze all previous-month matches,
  // including new inserts, so the set cannot change while the season is saved.
  const [matchSnapshot, playerSnapshot] = await Promise.all([
    db.collection('matches').where('seasonId', '==', seasonId).get({source:'server'}),
    db.collection('players').get({source:'server'})
  ]);
  const matches = snapshotMatches(matchSnapshot);
  if (!matches.length) return false;
  const roster = normalizePlayersSnapshot(playerSnapshot).filter(player => player.active === true);
  const awards = calculateSeasonAwards(matches, roster, seasonId);
  const created = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists && snapshot.data().closed === true) return false;
    const previous = snapshot.exists ? snapshot.data() : {};
    const napoleon = [...countMatchNapoleons(matches).keys()].sort((a,b) => a.localeCompare(b,'it'));
    // Rules enforce the same bounded archive schema; never truncate tied winners.
    if ([awards.podium, awards.weakRing, napoleon].some(list => list.length > 32)) {
      throw new Error('Archivio oltre 32 nomi: occorre estendere la validazione delle regole.');
    }
    transaction.set(reference, {
      seasonId, year:Number(seasonId.slice(0,4)), month:Number(seasonId.slice(5)),
      name: previous.name ?? '', closed:true,
      closedAt:firebase.firestore.FieldValue.serverTimestamp(),
      podium:awards.podium, napoleon:[...napoleon], weakRing:awards.weakRing
    }, {merge:true});
    return true;
  });
  if (created) invalidateClosedSeasons();
  return created;
}

async function ensurePreviousSeasonsClosed() {
  if (!auth.currentUser) return;
  if (seasonsCheckPromise) return seasonsCheckPromise;
  const month = syncCurrentSeason();
  const message = document.getElementById('seasonLifecycleMessage');
  seasonsCheckPromise = (async () => {
    message.textContent = 'Controllo delle stagioni precedenti…';
    const [matches, seasons] = await Promise.all([
      db.collection('matches').where('seasonId', '<', month).get({source:'server'}),
      getClosedSeasonsSnapshot(true)
    ]);
    const closed = new Set();
    seasons.forEach(doc => closed.add(doc.id));
    const pending = new Set();
    matches.forEach(doc => {
      const id = doc.data().seasonId;
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(id) && id < month && !closed.has(id)) pending.add(id);
    });
    if (!pending.size) { message.textContent = ''; return; }
    await loadAdminStatus();
    if (!isCurrentUserAdmin()) {
      message.textContent = 'Stagioni da archiviare: ' + [...pending].sort().join(', ') + '. La chiusura avverrà all’apertura da un dispositivo autorizzato. Le vecchie partite sono già in sola lettura.';
      return;
    }
    for (const id of [...pending].sort()) {
      message.textContent = 'Chiusura della stagione ' + id + '…';
      await closeSeasonAutomatically(id);
    }
    message.textContent = 'Stagioni precedenti archiviate nella Hall of Fame.';
  })().catch(error => {
    console.error('Errore archiviazione stagioni:', error);
    message.textContent = 'Archiviazione non completata. Verifica connessione e regole Firestore, poi premi AGGIORNA. I risultati dei mesi precedenti restano in sola lettura.';
  }).finally(() => { seasonsCheckPromise = null; });
  return seasonsCheckPromise;
}

async function cancelMatchResult() {
  if (isClosingMatch || !canManageMatch(currentMatch) || currentMatch.status !== 'completed') return;
  const expected = {...currentMatch};
  if (!window.confirm(`Annullare il risultato ${expected.scoreA} – ${expected.scoreB}? La partita tornerà in corso e l’Elo del mese sarà ricalcolato.`)) return;
  isClosingMatch = true;
  updateNavigationLock();
  [enterResultButton, correctResultButton, document.getElementById('cancelMatchResultButton')].forEach(button => button.disabled = true);
  const notice = document.getElementById('activeMatchNotice');
  notice.textContent = 'Annullamento del risultato…';
  try {
    const reference = db.collection('matches').doc(expected.id);
    const saved = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error('La partita non esiste più.');
      const match = snapshot.data();
      await assertMatchEditable(transaction, match);
      if (match.status !== 'completed' || (match.matchRevision || 0) !== (expected.matchRevision || 0) ||
          match.scoreA !== expected.scoreA || match.scoreB !== expected.scoreB ||
          (match.correctionCount || 0) !== (expected.correctionCount || 0)) {
        throw new Error('Il risultato è cambiato su un altro dispositivo. Riapri la partita prima di annullarlo.');
      }
      const update = {status:'in_progress', matchRevision:(match.matchRevision || 0) + 1};
      RESULT_FIELDS.forEach(field => { update[field] = firebase.firestore.FieldValue.delete(); });
      transaction.update(reference, update);
      const cleared = {...match, id:expected.id, status:'in_progress', matchRevision:update.matchRevision};
      RESULT_FIELDS.forEach(field => delete cleared[field]);
      return cleared;
    });
    if (pausedResult?.match.id === saved.id) pausedResult = null;
    playersSeasonData = null;
    await openMatch(saved);
    notice.textContent = 'Risultato annullato. La partita è in corso e non contribuisce più all’Elo.';
    // Refresh hidden views too: no old statistics remain after a local cancellation.
    await Promise.all([refreshHome(), refreshRanking(), refreshHistory(), refreshPlayers()]);
  } catch (error) {
    notice.textContent = error.code === 'permission-denied'
      ? 'Annullamento non autorizzato. Verifica che il mese sia aperto e che le nuove regole siano pubblicate.'
      : 'Risultato non annullato. ' + (error.code ? 'Controlla la connessione e riprova.' : error.message);
  } finally {
    isClosingMatch = false;
    updateNavigationLock();
    [enterResultButton, correctResultButton, document.getElementById('cancelMatchResultButton')].forEach(button => button.disabled = false);
  }
}

document.getElementById('cancelMatchResultButton').addEventListener('click', cancelMatchResult);
document.getElementById('discardResultDraftButton').addEventListener('click', () => {
  if (isClosingMatch || isCreatingMatch || !pausedResult) return;
  if (window.confirm('Scartare i punteggi non salvati? Nessuna partita registrata sarà modificata.')) {
    pausedResult = null;
    updateNavigationState();
  }
});
// Recheck on returning to an app left open across a month boundary.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && auth.currentUser && !isClosingMatch && !isCreatingMatch && observedSeasonId !== getSeasonId()) {
    const screen = document.querySelector('.screen.active')?.id;
    syncCurrentSeason();
    refreshHome();
    if (screen === 'rankingScreen') refreshRanking();
    if (screen === 'historyScreen') refreshHistory();
    if (screen === 'playersScreen' || screen === 'playerProfileScreen') refreshPlayers();
    if (screen === 'hallOfFameScreen') refreshHallOfFame();
    if (screen === 'matchInProgressScreen' && currentMatch) openMatch(currentMatch);
    if (screen === 'resultScreen') updateResultPreview();
  }
});


// Monthly statistics consume the same complete season replay used by the ranking.
function getPlayerSeasonGames(matches, playerName, seasonId, state) {
  const seasonState = state || calculateSeasonState(matches, [], seasonId);
  if (seasonState.seasonId !== seasonId) throw new Error('Statistiche e stagione non corrispondono.');
  const seen = new Set();
  return matches.filter(match => match.seasonId === seasonId && match.status === 'completed')
    .sort(compareMatchChronology).filter(match => {
      if (seen.has(match.id)) return false;
      seen.add(match.id);
      return match.teamA.includes(playerName) || match.teamB.includes(playerName);
    }).map(match => {
      const inA = match.teamA.includes(playerName);
      const own = inA ? match.teamA : match.teamB;
      const opponents = inA ? match.teamB : match.teamA;
      const scoreFor = inA ? match.scoreA : match.scoreB;
      const scoreAgainst = inA ? match.scoreB : match.scoreA;
      const elo = seasonState.matchDeltas.get(match.id);
      if (!elo) throw new Error('Variazione Elo mancante per ' + match.id);
      return {id:match.id, won:scoreFor > scoreAgainst, scoreFor, scoreAgainst,
        gap:Math.abs(scoreFor - scoreAgainst), teammate:own.find(name => name !== playerName),
        opponents:[...opponents], delta:inA ? elo.deltaA : elo.deltaB};
    });
}

function calculatePartnershipStats(games) {
  const partners = new Map();
  games.forEach(game => {
    if (!partners.has(game.teammate)) partners.set(game.teammate, {name:game.teammate, games:0, wins:0, losses:0});
    const row = partners.get(game.teammate);
    row.games++; row.wins += Number(game.won); row.losses += Number(!game.won);
  });
  const rows = [...partners.values()].map(row => ({...row, winRate:row.wins / row.games}));
  const best = rows.filter(row => row.games >= 2).sort((a,b) =>
    b.winRate - a.winRate || b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name,'it'))[0] || null;
  const mostFrequent = [...rows].sort((a,b) => b.games - a.games || a.name.localeCompare(b.name,'it'))[0] || null;
  return {rows, best, mostFrequent};
}

function calculateOpponentStats(games) {
  const opponents = new Map();
  games.forEach(game => game.opponents.forEach(name => {
    if (!opponents.has(name)) opponents.set(name, {name, games:0, wins:0, losses:0});
    const row = opponents.get(name);
    row.games++; row.wins += Number(game.won); row.losses += Number(!game.won);
  }));
  const rows = [...opponents.values()];
  const nemesis = rows.filter(row => row.losses > 0).sort((a,b) =>
    b.losses - a.losses || b.games - a.games || a.name.localeCompare(b.name,'it'))[0] || null;
  const favoriteVictim = rows.filter(row => row.wins > 0).sort((a,b) =>
    b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name,'it'))[0] || null;
  return {rows, nemesis, favoriteVictim};
}

function calculatePlayerAdvancedStats(matches, playerName, seasonId, state) {
  const games = getPlayerSeasonGames(matches, playerName, seasonId, state);
  let rating = 1000, peakElo = 1000, streak = 0, bestWinStreak = 0;
  let largestWin = null, largestLoss = null;
  games.forEach(game => {
    rating += game.delta;
    peakElo = Math.max(peakElo, rating);
    streak = game.won ? (streak > 0 ? streak + 1 : 1) : (streak < 0 ? streak - 1 : -1);
    bestWinStreak = Math.max(bestWinStreak, streak);
    // Equal gaps keep the earliest match in the immutable chronological order.
    if (game.won && (!largestWin || game.gap > largestWin.gap)) largestWin = game;
    if (!game.won && (!largestLoss || game.gap > largestLoss.gap)) largestLoss = game;
  });
  return {rating, peakElo, streak, bestWinStreak, largestWin, largestLoss,
    partnerships:calculatePartnershipStats(games), opponents:calculateOpponentStats(games)};
}

function calculatePlayerPalmares(seasons, playerName, matches = []) {
  const result = {monthsWon:0, podiums:0, napoleons:0, weakRings:0, wonSeasons:[]};
  const seen = new Set();
  seasons.forEach(season => {
    if (season.closed !== true || seen.has(season.seasonId)) return;
    seen.add(season.seasonId);
    const podium = season.podium || [];
    if (podium.some(entry => entry.player === playerName && entry.position === 1)) {
      result.monthsWon++;
      result.wonSeasons.push(season.seasonId);
    }
    if (podium.some(entry => entry.player === playerName && [1,2,3].includes(entry.position))) result.podiums++;
    if (!matches.some(match => match.seasonId === season.seasonId) && (season.napoleon || []).includes(playerName)) result.napoleons++;
    if ((season.weakRing || []).includes(playerName)) result.weakRings++;
  });
  result.napoleons += countMatchNapoleons(matches).get(playerName) || 0;
  result.wonSeasons.sort((a,b) => b.localeCompare(a));
  return result;
}

function appendProfileStat(container, label, value, detail = '') {
  const item = textElement('div', '', 'profile-detail-row');
  item.appendChild(textElement('dt', label));
  const description = textElement('dd', value);
  if (detail) description.appendChild(textElement('small', detail));
  item.appendChild(description);
  container.appendChild(item);
}

function renderPlayerAdvancedStats(stats) {
  document.getElementById('profilePeakElo').textContent = stats.peakElo;
  document.getElementById('profileStreak').textContent = stats.streak > 0 ? 'W' + stats.streak
    : stats.streak < 0 ? 'L' + Math.abs(stats.streak) : '—';
  const companions = document.getElementById('profileCompanions');
  const records = document.getElementById('profileRecords');
  companions.replaceChildren(); records.replaceChildren();
  const {best, mostFrequent} = stats.partnerships;
  const {nemesis, favoriteVictim} = stats.opponents;
  appendProfileStat(companions, 'Miglior compagno', best?.name || 'Dati insufficienti', best
    ? `${best.games} partite · ${best.wins} vittorie · ${(best.winRate * 100).toLocaleString('it-IT',{maximumFractionDigits:1})}%` : 'Servono almeno 2 partite insieme');
  appendProfileStat(companions, 'Compagno più frequente', mostFrequent?.name || '—', mostFrequent
    ? `${mostFrequent.games} ${mostFrequent.games === 1 ? 'partita insieme' : 'partite insieme'}` : 'Nessuna partita');
  appendProfileStat(companions, 'Nemesi', nemesis?.name || '—', nemesis
    ? `${nemesis.losses} ${nemesis.losses === 1 ? 'sconfitta' : 'sconfitte'} · ${nemesis.games} scontri` : 'Nessuna sconfitta');
  appendProfileStat(companions, 'Vittima preferita', favoriteVictim?.name || '—', favoriteVictim
    ? `${favoriteVictim.wins} ${favoriteVictim.wins === 1 ? 'vittoria' : 'vittorie'} · ${favoriteVictim.games} scontri` : 'Nessuna vittoria');
  appendProfileStat(records, 'Miglior win streak', `${stats.bestWinStreak} ${stats.bestWinStreak === 1 ? 'vittoria consecutiva' : 'vittorie consecutive'}`);
  for (const [label, game] of [['Vittoria più larga', stats.largestWin], ['Sconfitta più larga', stats.largestLoss]]) {
    appendProfileStat(records, label, game ? `${game.scoreFor} – ${game.scoreAgainst}` : '—', game
      ? `Scarto ${game.gap} · contro ${game.opponents.join(' + ')}` : 'Nessuna partita');
  }
}

let playerCareerSeasons = null;
let playerCareerError = '';
function renderPlayerCareer() {
  const content = document.getElementById('profileCareerContent');
  const message = document.getElementById('profileCareerMessage');
  content.replaceChildren();
  message.textContent = playerCareerError;
  if (!profilePlayerName || !playerCareerSeasons || playerCareerError) return;
  const career = calculatePlayerPalmares(playerCareerSeasons, profilePlayerName, playerCareerMatches);
  for (const [label, value] of [['Mesi vinti',career.monthsWon], ['Podi',career.podiums],
    ['Napoleoni',career.napoleons], ['Anelli Deboli',career.weakRings]]) {
    appendProfileStat(content, label, String(value));
  }
}

// Share the closed-season query made by the lazy-closure check with the active
// screen; a new refresh forces a server read. Player clicks make no new queries.
let closedSeasonsSnapshot = null;
let closedSeasonsLoading = null;
let closedSeasonsGeneration = 0;
function invalidateClosedSeasons() {
  closedSeasonsSnapshot = null;
  closedSeasonsGeneration++;
}
async function getClosedSeasonsSnapshot(force = false) {
  if (closedSeasonsLoading) return closedSeasonsLoading;
  if (!force && closedSeasonsSnapshot) return closedSeasonsSnapshot;
  if (force) closedSeasonsSnapshot = null;
  const generation = closedSeasonsGeneration;
  closedSeasonsLoading = db.collection('seasons').where('closed','==',true).get({source:'server'})
    .then(snapshot => {
      if (generation === closedSeasonsGeneration) closedSeasonsSnapshot = snapshot;
      return snapshot;
    }).finally(() => { closedSeasonsLoading = null; });
  return closedSeasonsLoading;
}


// Match events are independent of Elo. Legacy results without this field have none.
function validateMatchNapoleon(match, names) {
  const participants = [...(match.teamA || []), ...(match.teamB || [])];
  if (!Array.isArray(names) || names.length > 4 || new Set(names).size !== names.length ||
      !names.every(name => participants.includes(name))) throw new Error('Napoleone non valido: scegli solo i partecipanti, senza duplicati.');
  return [...names].sort((a,b) => a.localeCompare(b,'it'));
}
function getMatchNapoleon(match) {
  if (match.status !== 'completed') return [];
  return validateMatchNapoleon(match, match.napoleon ?? []);
}
function sameNapoleon(left = [], right = []) {
  return left.length === right.length && left.every(name => right.includes(name));
}
function countMatchNapoleons(matches) {
  const counts = new Map(), seen = new Set();
  matches.forEach(match => {
    if (seen.has(match.id)) return;
    seen.add(match.id);
    getMatchNapoleon(match).forEach(name => counts.set(name, (counts.get(name) || 0) + 1));
  });
  return counts;
}
function getSeasonNapoleonCounts(season, matches) {
  const monthly = matches.filter(match => match.seasonId === season.seasonId);
  return monthly.length ? countMatchNapoleons(monthly)
    : new Map((season.napoleon || []).map(name => [name, 1]));
}
function napoleonBadge(count) { return count ? ' ♛' + (count > 1 ? '×' + count : '') : ''; }
function teamDescription(match, team) {
  const names = getMatchNapoleon(match);
  return team.map(name => name + napoleonBadge(Number(names.includes(name)))).join(' + ');
}
let resultNapoleon = [];
function renderResultNapoleon() {
  const container = document.getElementById('resultNapoleonPlayers');
  container.replaceChildren();
  [...currentMatch.teamA, ...currentMatch.teamB].forEach(name => {
    const button = textElement('button', name, 'napoleon-player-button');
    button.type = 'button'; button.disabled = isClosingMatch;
    button.setAttribute('aria-pressed', String(resultNapoleon.includes(name)));
    button.addEventListener('click', () => {
      if (isClosingMatch) return;
      resultNapoleon = validateMatchNapoleon(currentMatch, resultNapoleon.includes(name)
        ? resultNapoleon.filter(item => item !== name) : [...resultNapoleon, name]);
      renderResultNapoleon(); updateResultPreview();
    });
    container.appendChild(button);
  });
}
function getRecentForm(matches, playerName) {
  return matches.filter(match => match.status === 'completed' &&
    [...match.teamA, ...match.teamB].includes(playerName)).sort(compareMatchChronology)
    .slice(-5).map(match => (match.teamA.includes(playerName) ? match.scoreA > match.scoreB : match.scoreB > match.scoreA) ? 'W' : 'L');
}
function renderRecentForm(container, form) {
  container.replaceChildren();
  container.setAttribute('aria-label', 'Ultime 5 partite, dalla meno recente');
  if (!form.length) container.appendChild(textElement('span', '—'));
  form.forEach(outcome => container.appendChild(textElement('span', outcome, 'form-mark form-' + outcome.toLowerCase())));
}
async function loadAllMatches() {
  return snapshotMatches(await db.collection('matches').get({source:'server'}));
}
let playerCareerMatches = [];

function getPossibleTeamSplits(names) {
  if (names.length !== 4 || new Set(names).size !== 4) throw new Error('Servono quattro giocatori distinti.');
  const [a,b,c,d] = names;
  return [{teamA:[a,b],teamB:[c,d]}, {teamA:[a,c],teamB:[b,d]}, {teamA:[a,d],teamB:[b,c]}];
}
function scoreTeamSplit(split, history) {
  const players = [...split.teamA, ...split.teamB];
  const recent = history.filter(match => ['completed','in_progress'].includes(match.status))
    .slice().sort((a,b) => -compareMatchChronology(a,b));
  const latestTogether = recent.find(match => [...match.teamA,...match.teamB].length === 4 &&
    [...match.teamA,...match.teamB].every(name => players.includes(name)));
  let penalty = latestTogether && isSameDraw(split, latestTogether) ? 100 : 0;
  for (const team of [split.teamA, split.teamB]) {
    team.forEach((name,index) => {
      const previous = recent.find(match => [...match.teamA,...match.teamB].includes(name));
      if (previous) {
        const previousTeam = previous.teamA.includes(name) ? previous.teamA : previous.teamB;
        if (previousTeam.includes(team[1-index])) penalty += 10;
      }
    });
  }
  return penalty;
}
function chooseBalancedRandomSplit(names, history = [], randomInt = secureRandomInt) {
  const candidates = getPossibleTeamSplits(names).map(split => ({split, penalty:scoreTeamSplit(split,history)}));
  const minimum = Math.min(...candidates.map(item => item.penalty));
  const best = candidates.filter(item => item.penalty === minimum);
  return best[randomInt(best.length)].split;
}
let isDrawing = false;
async function drawSelectedPlayers(selected) {
  if (isDrawing || isCreatingMatch) return;
  isDrawing = true;
  [drawButton,redrawButton,startMatchButton,cancelDrawButton].forEach(button => button.disabled = true);
  updateNavigationLock();
  try {
    let history = [];
    try {
      history = snapshotMatches(await db.collection('matches').where('seasonId','==',getSeasonId()).get({source:'server'}));
    } catch (error) { console.error('Storico sorteggio non disponibile: sorteggio casuale.', error); }
    const active = selected.filter(name => availablePlayers.some(player => player.name === name));
    if (active.length < 4 || active.length !== selected.length) {
      currentDraw = null;
      document.getElementById('rosterMatchMessage').textContent = 'Il gruppo è cambiato. Scegli almeno quattro giocatori attivi.';
      createMatchPlayerList(); showScreen(newMatchScreen); return;
    }
    currentDraw = generateDraw(active, history);
    showDraw(currentDraw);
  } finally {
    isDrawing = false;
    [drawButton,redrawButton,startMatchButton,cancelDrawButton].forEach(button => button.disabled = false);
    updateNavigationLock();
  }
}
let historyMatches = [];
let historyFilter = 'all';
function filterHistoryMatches(matches, filter, player) {
  if (filter === 'all') return matches;
  if (!player) return [];
  return matches.filter(match => {
    const inA = match.teamA.includes(player), inB = match.teamB.includes(player);
    if (!inA && !inB) return false;
    if (filter === 'mine') return true;
    if (match.status !== 'completed') return false;
    const won = inA ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
    return filter === 'wins' ? won : filter === 'losses' ? !won : false;
  });
}
function renderHistory() {
  const player = localStorage.getItem('rankingScopaPlayer');
  if (!player) historyFilter = 'all';
  const filters = document.getElementById('historyFilters');
  filters.replaceChildren();
  for (const [filter,label] of [['all','TUTTE'],['mine','MIE PARTITE'],['wins','VITTORIE'],['losses','SCONFITTE']]) {
    const button = textElement('button',label,'history-filter');
    button.type = 'button'; button.disabled = filter !== 'all' && !player;
    button.setAttribute('aria-pressed',String(historyFilter === filter));
    button.addEventListener('click',() => { historyFilter = filter; renderHistory(); });
    filters.appendChild(button);
  }
  renderMatches(document.getElementById('historyList'), filterHistoryMatches(historyMatches,historyFilter,player), 'Nessuna partita per questo filtro.');
}
function matchDate(match) {
  return match.createdAt?.toDate?.().toLocaleString('it-IT', {timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) || match.seasonId;
}
function renderMatchMetadata(match) {
  const container = document.getElementById('matchDetails');
  container.replaceChildren();
  appendProfileStat(container,'Data',matchDate(match));
  appendProfileStat(container,'Creatore',match.createdByPlayer || 'Non disponibile');
  if (match.status !== 'completed') return;
  appendProfileStat(container,'Vincitori',(match.scoreA > match.scoreB ? match.teamA : match.teamB).join(' + '));
  appendProfileStat(container,'Napoleone',getMatchNapoleon(match).join(' · ') || '—');
  appendProfileStat(container,'Risultato inserito da',match.completedByPlayer || 'Non disponibile');
  appendProfileStat(container,'Correzioni',String(match.correctionCount || 0));
  if (match.previousResult) appendProfileStat(container,'Risultato precedente',
    `${match.previousResult.scoreA} – ${match.previousResult.scoreB}`,
    'Napoleone: ' + ((match.previousResult.napoleon || []).join(' · ') || '—'));
}

// Names remain the identity in matches. Stable IDs never rename that identity.
function slugifyPlayerName(name) {
  return String(name ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'')
    .slice(0,40).replace(/-$/,'');
}
function validatePlayerName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 50) throw new Error('Inserisci un nome da 1 a 50 caratteri.');
  const id = slugifyPlayerName(name);
  if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new Error('Il nome deve generare un ID valido di almeno 2 caratteri.');
  return {name,id};
}
function playerDocuments(snapshot) {
  if (Array.isArray(snapshot)) return snapshot.map(player => ({...player}));
  const documents = [];
  snapshot.forEach(doc => documents.push({...doc.data(),id:doc.id}));
  return documents;
}
function isStablePlayer(player) {
  return typeof player.name === 'string' && /^[a-z0-9-]{2,40}$/.test(player.id)
    && player.id === slugifyPlayerName(player.name);
}
function isManagedPlayer(player) {
  return isStablePlayer(player) && typeof player.createdByUid === 'string'
    && Boolean(player.createdAt) && typeof player.updatedByUid === 'string' && Boolean(player.updatedAt);
}
function normalizePlayersSnapshot(snapshot) {
  const groups = new Map();
  playerDocuments(snapshot).filter(player => typeof player.name === 'string' && player.name.trim()).forEach(player => {
    // Exact canonical names: changing case/accents would merge distinct historical identities.
    if (!groups.has(player.name)) groups.set(player.name,[]);
    groups.get(player.name).push(player);
  });
  return [...groups.values()].map(group => {
    group.sort((a,b) => Number(isStablePlayer(b)) - Number(isStablePlayer(a)) || a.id.localeCompare(b.id));
    return {...group[0], active:group[0].active === true};
  }).sort((a,b) => a.name.localeCompare(b.name,'it'));
}

let adminStatus = {uid:null, enabled:false, loaded:false};
let adminStatusPromise = null;
async function loadAdminStatus() {
  const uid = auth.currentUser?.uid;
  if (!uid) { adminStatus = {uid:null,enabled:false,loaded:false}; return false; }
  if (adminStatus.loaded && adminStatus.uid === uid) return adminStatus.enabled;
  if (adminStatusPromise?.uid === uid) return adminStatusPromise.promise;
  const promise = db.collection('admins').doc(uid).get({source:'server'}).then(snapshot => {
    if (auth.currentUser?.uid !== uid) return false;
    adminStatus = {uid, enabled:snapshot.exists && snapshot.data().enabled === true, loaded:true};
    renderPlayerManagement();
    return adminStatus.enabled;
  }).catch(error => {
    if (auth.currentUser?.uid === uid) {
      adminStatus = {uid,enabled:false,loaded:false};
      renderPlayerManagement();
    }
    throw error;
  }).finally(() => { if (adminStatusPromise?.uid === uid) adminStatusPromise = null; });
  adminStatusPromise = {uid,promise};
  return promise;
}
function isCurrentUserAdmin() {
  return Boolean(auth.currentUser && adminStatus.uid === auth.currentUser.uid && adminStatus.enabled);
}
async function requirePlayerAdmin() {
  await loadAdminStatus();
  if (!isCurrentUserAdmin()) throw new Error('Gestione giocatori riservata agli amministratori.');
  return auth.currentUser.uid;
}

let allPlayers = [];
let rawPlayerDocuments = [];
let rosterLoaded = false;
let stopPlayersListener = null;
let rosterSubscriptionUid = null;
let rosterBusy = false;
let selectionNeedsChange = false;
function renderPlayerChoices() {
  playerList.replaceChildren();
  availablePlayers.forEach(player => {
    const button = textElement('button',player.name,'player-button');
    button.addEventListener('click',() => selectPlayer(player.name));
    playerList.appendChild(button);
  });
  document.getElementById('playerSetupMessage').textContent = !allPlayers.length
    ? 'Nessun giocatore disponibile. Un amministratore deve configurare il gruppo.'
    : !availablePlayers.length ? 'Non ci sono giocatori attivi. Contatta un amministratore.' : '';
}
function ensureSelectedPlayerActive() {
  const name = localStorage.getItem('rankingScopaPlayer');
  if (!rosterLoaded || !name || availablePlayers.some(player => player.name === name)) return true;
  pauseResultForm();
  localStorage.removeItem('rankingScopaPlayer');
  selectionNeedsChange = true;
  currentDraw = null;
  document.getElementById('playerSelectionMessage').textContent = 'Questo giocatore non è più attivo. Selezionane un altro.';
  showScreen(playerScreen);
  return false;
}
function applyPlayersSnapshot(snapshot) {
  rawPlayerDocuments = playerDocuments(snapshot);
  allPlayers = normalizePlayersSnapshot(rawPlayerDocuments);
  availablePlayers = allPlayers.filter(player => player.active === true);
  rosterLoaded = true;
  const checked = new Set(Array.from(matchPlayerList.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value));
  renderPlayerChoices();
  createMatchPlayerList();
  matchPlayerList.querySelectorAll('input').forEach(input => { input.checked = checked.has(input.value); });
  if (currentDraw && [...currentDraw.teamA,...currentDraw.teamB,...currentDraw.excluded]
      .some(name => !availablePlayers.some(player => player.name === name))) {
    currentDraw = null;
    document.getElementById('rosterMatchMessage').textContent = 'Il gruppo è cambiato. Scegli i giocatori attivi e sorteggia di nuovo.';
    if (drawResultScreen.classList.contains('active')) showScreen(newMatchScreen);
  }
  ensureSelectedPlayerActive();
  renderPlayerManagement();
  if (playersSeasonData) {
    playersSeasonData.state = calculateSeasonState(playersSeasonData.matches, availablePlayers, playersSeasonData.seasonId);
    playersSeasonData.rows = playersSeasonData.state.ranking;
    renderPlayerDirectory();
    if (profilePlayerName) renderPlayerProfile();
  }
}
async function refreshRosterFromServer() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Accedi prima di caricare i giocatori.');
  const snapshot = await db.collection('players').get({source:'server'});
  if (auth.currentUser?.uid !== uid) throw new Error('Accesso cambiato. Riprova.');
  applyPlayersSnapshot(snapshot);
  return snapshot;
}
function startPlayersSubscription() {
  if (stopPlayersListener) stopPlayersListener();
  const uid = auth.currentUser?.uid;
  rosterSubscriptionUid = uid;
  return new Promise((resolve,reject) => {
    let first = true;
    stopPlayersListener = db.collection('players').onSnapshot({includeMetadataChanges:true}, snapshot => {
      if (auth.currentUser?.uid !== uid || rosterSubscriptionUid !== uid) return;
      if (snapshot.metadata?.fromCache) return;
      applyPlayersSnapshot(snapshot);
      if (first) { first = false; resolve(); }
    }, error => {
      document.getElementById('playerSelectionMessage').textContent = 'Impossibile aggiornare i giocatori. Controlla la connessione e premi AGGIORNA.';
      if (first) { first = false; reject(error); }
    });
  });
}
async function assertActiveMatchPlayers(transaction, names) {
  const uniqueNames = [...new Set(names)];
  const selected = uniqueNames.map(name => availablePlayers.find(player => player.name === name));
  if (selected.some(player => !player)) throw new Error('Un giocatore non è più attivo. Ripeti il sorteggio.');
  for (const player of selected) {
    const primary = await transaction.get(db.collection('players').doc(player.id));
    const stableId = slugifyPlayerName(player.name);
    const stable = stableId !== player.id && /^[a-z0-9-]{2,40}$/.test(stableId)
      ? await transaction.get(db.collection('players').doc(stableId)) : primary;
    const effective = stable.exists && stable.data().name === player.name ? stable : primary;
    if (!effective.exists || effective.data().name !== player.name || effective.data().active !== true) {
      throw new Error('Un giocatore non è più attivo. Ripeti il sorteggio.');
    }
  }
}
function renderPlayerDirectory() {
  if (!playersSeasonData) return;
  const directory = document.getElementById('playersDirectory');
  directory.replaceChildren();
  // Inactive profiles remain available even in a month without appearances.
  const rows = new Map(playersSeasonData.rows.map(row => [row.name,row]));
  allPlayers.forEach(player => { if (!rows.has(player.name)) rows.set(player.name,{name:player.name,rating:1000,games:0,wins:0,losses:0}); });
  [...rows.values()].sort((a,b) => a.name.localeCompare(b.name,'it')).forEach(row => {
    const inactive = allPlayers.some(player => player.name === row.name && !player.active);
    const button = textElement('button','','player-profile-button');
    button.type = 'button';
    button.appendChild(textElement('span',row.name + (inactive ? ' · INATTIVO' : ''),'player-profile-name'));
    button.appendChild(textElement('strong',`${row.rating} Elo`,'rating-value'));
    button.appendChild(textElement('small',`${row.games} partite · ${row.wins}-${row.losses} W-L`));
    button.addEventListener('click',() => openPlayerProfile(row.name));
    directory.appendChild(button);
  });
  if (!rows.size) directory.appendChild(textElement('p','Nessun giocatore disponibile.','empty-state'));
}

function buildPlayerMigrationAnalysis(snapshot) {
  const documents = playerDocuments(snapshot), byId = new Map(documents.map(player => [player.id,player]));
  const byName = new Map(), byTarget = new Map();
  documents.forEach(player => {
    const key = typeof player.name === 'string' ? player.name.trim().toLowerCase() : '';
    if (!byName.has(key)) byName.set(key,[]);
    byName.get(key).push(player);
    const target = slugifyPlayerName(player.name);
    if (!byTarget.has(target)) byTarget.set(target,[]);
    byTarget.get(target).push(player);
  });
  const entries = documents.map(player => {
    const targetId = slugifyPlayerName(player.name), stable = isStablePlayer(player);
    let collision = '';
    try { validatePlayerName(player.name); } catch (error) { collision = error.message; }
    // Migration preserves names verbatim. Do not silently trim historical identities.
    if (typeof player.name === 'string' && player.name !== player.name.trim()) collision = 'Nome storico con spazi esterni: verifica manuale necessaria.';
    const target = byId.get(targetId);
    const aliases = byTarget.get(targetId) || [];
    if (target && target.name !== player.name) collision = 'ID occupato da un nome diverso: ' + target.name;
    if (new Set(aliases.map(item => item.name)).size > 1) collision = 'Più nomi distinti generano lo stesso ID.';
    const duplicates = byName.get(typeof player.name === 'string' ? player.name.trim().toLowerCase() : '') || [];
    if (new Set(duplicates.map(item => item.name)).size > 1) collision = 'Nomi diversi soltanto per maiuscole/spazi: verifica identità storiche.';
    const equivalent = aliases.filter(item => item.name === player.name);
    if (!target && new Set(equivalent.map(item => typeof item.active === 'boolean' ? item.active : true)).size > 1) collision = 'Duplicati con stato attivo discordante: verifica manuale necessaria.';
    return {id:player.id,name:player.name,targetId,stable,collision,exists:!!target,
      active:typeof player.active === 'boolean' ? player.active : true,
      duplicateIds:duplicates.filter(item => item.id !== player.id).map(item => item.id)};
  });
  return {entries, legacy:entries.filter(entry => !entry.stable), collisions:entries.filter(entry => entry.collision)};
}
async function analyzePlayerMigration() {
  await requirePlayerAdmin();
  return buildPlayerMigrationAnalysis(await refreshRosterFromServer());
}
function newPlayerDocument(name, active, uid) {
  return {name,active,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdByUid:uid,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedByUid:uid};
}
async function addPlayer(value) {
  const uid = await requirePlayerAdmin(), {name,id} = validatePlayerName(value);
  const snapshot = await refreshRosterFromServer();
  const documents = playerDocuments(snapshot);
  const duplicates = documents.filter(player => typeof player.name === 'string' && player.name.trim().toLowerCase() === name.toLowerCase());
  const known = normalizePlayersSnapshot(duplicates)[0];
  const target = documents.find(player => player.id === id);
  if (target && target.name?.trim().toLowerCase() !== name.toLowerCase()) throw new Error('ID già utilizzato da un altro nome. Scegli un nome diverso.');
  if (known && !isManagedPlayer(known)) throw new Error('Giocatore già presente. Migra gli ID legacy prima di gestirlo.');
  if (known?.active) throw new Error('Giocatore già presente');
  const reference = db.collection('players').doc(id);
  const outcome = await db.runTransaction(async transaction => {
    const current = await transaction.get(reference);
    if (current.exists) {
      const player = {...current.data(),id};
      if (player.name?.trim().toLowerCase() !== name.toLowerCase()) throw new Error('ID già utilizzato da un altro nome.');
      if (!isManagedPlayer(player)) throw new Error('Documento esistente da verificare in Firebase Console.');
      if (player.active === true) throw new Error('Giocatore già presente');
      transaction.update(reference,{active:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedByUid:uid});
      return 'Giocatore riattivato';
    }
    if (known) throw new Error('Il roster è cambiato. Aggiorna e riprova.');
    transaction.set(reference,newPlayerDocument(name,true,uid));
    return 'Giocatore aggiunto';
  });
  await refreshRosterFromServer();
  return outcome;
}
async function setPlayerActive(id, active) {
  const uid = await requirePlayerAdmin();
  if (typeof active !== 'boolean') throw new Error('Stato non valido.');
  const reference = db.collection('players').doc(id);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || !isManagedPlayer({...snapshot.data(),id})) throw new Error('Migra prima gli ID legacy. I documenti stabili incompleti vanno verificati in Console.');
    if (snapshot.data().active === active) return;
    transaction.update(reference,{active,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedByUid:uid});
  });
  await refreshRosterFromServer();
}

let migrationPreview = null;
let migrationApproved = null;
async function migratePlayersToStableIds() {
  const uid = await requirePlayerAdmin();
  if (!migrationPreview || migrationApproved !== migrationPreview) throw new Error('Apri l’anteprima e conferma esplicitamente la migrazione.');
  const plan = migrationApproved;
  migrationApproved = null; // one UI confirmation authorizes one run only
  const result = {created:[],existing:[],skipped:[]};
  const groups = new Map();
  plan.legacy.forEach(entry => {
    if (entry.collision) { result.skipped.push({name:entry.name,reason:entry.collision}); return; }
    if (!groups.has(entry.targetId)) groups.set(entry.targetId,[]);
    groups.get(entry.targetId).push(entry);
  });
  for (const [id,entries] of groups) {
    const reference = db.collection('players').doc(id);
    const outcome = await db.runTransaction(async transaction => {
      const target = await transaction.get(reference);
      const sources = await Promise.all(entries.map(entry => transaction.get(db.collection('players').doc(entry.id))));
      if (sources.some((source,index) => !source.exists || source.data().name !== entries[index].name ||
          (typeof source.data().active === 'boolean' ? source.data().active : true) !== entries[index].active)) return 'changed';
      if (target.exists) return target.data().name === entries[0].name ? 'existing' : 'collision';
      transaction.set(reference,newPlayerDocument(entries[0].name,entries[0].active,uid));
      return 'created';
    });
    if (outcome === 'created' || outcome === 'existing') result[outcome].push(id);
    else result.skipped.push({name:entries[0].name,reason:outcome === 'changed' ? 'Dati modificati dopo l’anteprima.' : 'ID occupato da un altro nome.'});
  }
  await refreshRosterFromServer();
  return result;
}

function renderPlayerManagement() {
  const admin = isCurrentUserAdmin();
  document.getElementById('playerManagement').hidden = !admin;
  document.getElementById('setupManagementButton').hidden = !admin;
  if (!admin) {
    document.getElementById('playerAdminList').replaceChildren();
    for (const id of ['addPlayerDialog','playerStatusDialog','playerMigrationDialog']) {
      const dialog = document.getElementById(id);
      if (dialog.open) dialog.close();
    }
    migrationPreview = null; migrationApproved = null;
    return;
  }
  const list = document.getElementById('playerAdminList');
  list.replaceChildren();
  allPlayers.forEach(player => {
    const row = textElement('div','','player-admin-row');
    const label = textElement('div','');
    label.appendChild(textElement('strong',player.name));
    label.appendChild(textElement('small',player.active ? '● Attivo' : '○ Inattivo'));
    row.appendChild(label);
    if (isManagedPlayer(player)) {
      const button = textElement('button',player.active ? 'DISATTIVA' : 'RIATTIVA','roster-action');
      button.type = 'button'; button.disabled = rosterBusy;
      button.addEventListener('click',() => openPlayerStatusDialog(player));
      row.appendChild(button);
    } else row.appendChild(textElement('small',isStablePlayer(player) ? 'Schema da verificare in Console' : 'ID legacy · migrazione necessaria','scoring-rule'));
    list.appendChild(row);
  });
  document.getElementById('migratePlayersButton').hidden = !buildPlayerMigrationAnalysis(rawPlayerDocuments).legacy.length;
  for (const id of ['addPlayerButton','migratePlayersButton']) document.getElementById(id).disabled = rosterBusy;
}
let playerStatusTarget = null;
function openPlayerStatusDialog(player) {
  if (!isCurrentUserAdmin() || rosterBusy) return;
  playerStatusTarget = {id:player.id,active:!player.active};
  document.getElementById('playerStatusText').textContent = (player.active ? 'Disattivare ' : 'Riattivare ') + player.name + '? Storico e statistiche rimangono disponibili.';
  document.getElementById('playerStatusMessage').textContent = '';
  document.getElementById('playerStatusDialog').showModal();
}
async function runRosterAction(action,messageElement) {
  if (rosterBusy) return;
  rosterBusy = true; renderPlayerManagement();
  document.querySelectorAll('.roster-dialog button, .roster-dialog input').forEach(element => element.disabled = true);
  try { await action(); }
  catch (error) {
    messageElement.textContent = error.code === 'permission-denied' ? 'Operazione non autorizzata. Verifica le regole players e l’abilitazione admin.' : error.code ? 'Operazione non completata. Aggiorna e riprova; eventuali creazioni già riuscite saranno riconosciute.' : error.message;
  } finally {
    rosterBusy = false;
    document.querySelectorAll('.roster-dialog button, .roster-dialog input').forEach(element => element.disabled = false);
    renderPlayerManagement();
  }
}
document.getElementById('addPlayerButton').addEventListener('click',() => {
  if (!isCurrentUserAdmin() || rosterBusy) return;
  document.getElementById('addPlayerForm').reset();
  document.getElementById('addPlayerMessage').textContent = '';
  document.getElementById('addPlayerDialog').showModal();
  document.getElementById('newPlayerName').focus();
});
document.getElementById('addPlayerForm').addEventListener('submit',event => {
  event.preventDefault();
  return runRosterAction(async() => {
    const message = await addPlayer(document.getElementById('newPlayerName').value);
    document.getElementById('playerManagementMessage').textContent = message;
    document.getElementById('addPlayerDialog').close();
  },document.getElementById('addPlayerMessage'));
});
document.getElementById('confirmPlayerStatusButton').addEventListener('click',() => runRosterAction(async() => {
  if (!playerStatusTarget) return;
  await setPlayerActive(playerStatusTarget.id,playerStatusTarget.active);
  document.getElementById('playerManagementMessage').textContent = playerStatusTarget.active ? 'Giocatore riattivato.' : 'Giocatore disattivato.';
  document.getElementById('playerStatusDialog').close();
},document.getElementById('playerStatusMessage')));
document.getElementById('migratePlayersButton').addEventListener('click',() => runRosterAction(async() => {
  migrationPreview = await analyzePlayerMigration(); migrationApproved = null;
  const list = document.getElementById('playerMigrationPreview'); list.replaceChildren();
  migrationPreview.legacy.forEach(entry => {
    const row = textElement('div','','migration-row');
    row.appendChild(textElement('strong',String(entry.name ?? 'Nome mancante')));
    row.appendChild(textElement('small',`Vecchio ID: ${entry.id}\nNuovo ID: ${entry.targetId}`));
    if (entry.duplicateIds.length) row.appendChild(textElement('small','Duplicati per nome: ' + entry.duplicateIds.join(', ')));
    if (entry.collision) row.appendChild(textElement('p','SALTATO · ' + entry.collision,'migration-conflict'));
    else if (entry.exists) row.appendChild(textElement('small','Target già presente: nessuna sovrascrittura.'));
    list.appendChild(row);
  });
  document.getElementById('playerMigrationMessage').textContent = 'Saranno creati solo gli ID mancanti senza collisioni. Nessun documento sarà eliminato.';
  document.getElementById('playerMigrationDialog').showModal();
},document.getElementById('playerManagementMessage')));
document.getElementById('confirmPlayerMigrationButton').addEventListener('click',() => runRosterAction(async() => {
  if (!migrationPreview) return;
  migrationApproved = migrationPreview;
  const result = await migratePlayersToStableIds();
  const message = document.getElementById('playerMigrationMessage');
  message.textContent = (result.skipped.length ? 'Migrazione parziale.' : 'Migrazione completata.') + ' I vecchi documenti non sono stati eliminati.'
    + ` Creati: ${result.created.length}. Già presenti: ${result.existing.length}. Saltati: ${result.skipped.length}.`
    + result.skipped.map(item => ` ${item.name}: ${item.reason}`).join('');
  migrationPreview = null;
},document.getElementById('playerMigrationMessage')));
for (const id of ['addPlayerDialog','playerStatusDialog','playerMigrationDialog']) {
  const dialog = document.getElementById(id);
  dialog.addEventListener('cancel',event => { if (rosterBusy) event.preventDefault(); });
}
document.querySelectorAll('[data-close-player-dialog]').forEach(button => button.addEventListener('click',() => {
  if (!rosterBusy) document.getElementById(button.dataset.closePlayerDialog).close();
}));
document.getElementById('setupManagementButton').addEventListener('click',() => {
  if (!isCurrentUserAdmin()) return;
  syncCurrentSeason(); showScreen(document.getElementById('playersScreen')); refreshPlayers();
});
document.getElementById('refreshRosterButton').addEventListener('click',async() => {
  try { await loadAdminStatus(); await refreshRosterFromServer(); }
  catch (error) { document.getElementById('playerSelectionMessage').textContent = 'Impossibile caricare il gruppo. Verifica connessione e regole, poi riprova.'; }
});
