# Ranking Scopa — PWA e pubblicazione manuale

## Stato e file

File PWA applicati al progetto originale con autorizzazione esplicita. Test PWA, browser e regressione rieseguiti leggendo i file del repository originale: tutti superati. Nessun push, deploy, pubblicazione Rules o accesso a dati Firebase reali durante i test.

Modificati: `index.html` (meta/manifest, splash, controlli installazione/aggiornamento, bootstrap PWA) e `style.css` (safe area, viewport dinamico, componenti PWA). Creati: `pwa.js`, `service-worker.js`, `manifest.webmanifest`, `.nojekyll`, `assets/icons/logo-rs.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180), `favicon-32.png`, questa guida `PWA.md`.

`app.js`, `firebase-config.js` e `firestore.rules` sono identici byte per byte alla versione presente prima di questo sprint. Tutte le precedenti modifiche non committate del progetto sono state preservate. Non pubblicare l'intera cartella outputs: contiene report e copie storiche; usa il repository effettivo.

Repository locale: `C:\Users\danie\OneDrive\Desktop\Ranking scopa\Ranking scopa`
Remote rilevato: https://github.com/daniele02dany/Ranking-scopa.git
Branch locale: `main`. `index.html` si trova nella radice corretta.

## Manifest e icone

name Ranking Scopa; short_name Scopa; description Ranking Scopa; display standalone; orientation portrait; start_url, scope e id `./`; theme/background `#0b0b0d`. Percorsi relativi, adatti al sottopercorso del repository.

Icone PNG realmente generate da SVG vettoriale: RS oro su antracite, anello oro e due piccoli accenti bordeaux. La variante maskable ha fondo pieno e contenuto dentro la zona centrale sicura. Nessun asset mancante, font remoto o dipendenza runtime aggiunta. Le icone normali e maskable hanno lo stesso disegno sicuro; i sistemi applicano la propria maschera.

## Cache e aggiornamenti

Il service worker ha una allowlist esatta di 14 asset locali: HTML, CSS, app.js, pwa.js, configurazione client Firebase, manifest, due SVG Napoleon e sei asset icona. Il nome cache include scope e VERSION, inizialmente v1. Il Firebase config client è un file statico pubblico già richiesto dal browser, non contiene documenti Firestore o credenziali admin.

Nessuna intercettazione di origini esterne, richieste non GET, URL con query o percorsi non in allowlist. Niente cache delle API Firebase Auth/Firestore, né dati members/accessRequests/matches/players/seasons/playerProfiles. Nessuna nuova persistenza di identità o dati in localStorage.

Gli asset usano cache-first per mantenere una release coerente. L'installazione precarica tutti gli asset; se fallisce, il worker precedente resta attivo. Al nuovo worker: compare «Nuova versione disponibile». L'utente salva prima eventuali risultati e preme AGGIORNA: messaggio SKIP_WAITING, attivazione e un reload nella sola scheda che ha confermato. Le altre schede ricevono l'avviso senza reload forzato. La prima installazione non forza un reload. Activate elimina solo vecchie cache di questa app/scope e chiama clients.claim(). Aggiornamenti controllati anche al ritorno online e quando la pagina torna visibile.

Per OGNI futura release con modifiche statiche:
1. Incrementa `const VERSION = 'v1'` in service-worker.js a v2, v3, ecc.
2. Se aggiungi/rimuovi asset necessari, aggiorna FILES.
3. Verifica localmente; committa e pubblica manualmente TUTTI i file della release insieme.
4. Attendi il completamento GitHub Pages.
5. Riapri/metti in primo piano la PWA, salva eventuali risultati, premi AGGIORNA.
6. Non occorre disinstallare. Dimenticare il cambio VERSION può lasciare asset vecchi: è un passaggio obbligatorio.

## Avvio, rete e sicurezza

pwa.js carica in sequenza gli stessi tre SDK Firebase compat 10.14.1, poi firebase-config.js e app.js. Splash nero/RS fino alla scelta della schermata da parte dell'accesso esistente. L'osservatore segue lo stato UI senza modificare autenticazione, whitelist o logica di gioco.

A freddo offline: shell e messaggio connessione assente; non si tenta di inizializzare Firebase senza SDK e non si mostrano schermate private. Al ritorno online si riprende l'avvio. Dopo l'avvio il banner segnala la rete assente; non esiste sincronizzazione offline custom e le operazioni Firebase richiedono la rete. Eventuali errori di caricamento SDK mostrano RIPROVA. La disponibilità della CDN Firebase resta necessaria per un avvio completo.

Ogni installazione usa l'autenticazione anonima esistente. Se la PWA riceve un UID differente, compare Accesso al circolo e l'utente richiede accesso: l'admin può associarlo allo stesso playerId. Nessuna copia/trasferimento artificiale di UID. Conserva una sessione admin già funzionante finché la nuova installazione non è verificata. Il cambio di origine da file/localhost al sito pubblico può anch'esso produrre un UID nuovo.

La sicurezza server dipende dalle Rules già configurate nel progetto Firebase: questo sprint NON le modifica né ne verifica la versione pubblicata. Prima di rendere pubblico l'URL, verifica manualmente che le Rules whitelist previste siano effettivamente attive; un URL pubblico non deve essere considerato una protezione. Non serve creare membri nuovi per aggiungere il manifest o il service worker.

## Layout

Safe area top/left/right sul contenitore e controlli PWA; bottom nav usa già safe-area-inset-bottom e ora anche left/right. Viewport-fit=cover mantenuto, min-height 100dvh, dialog scrollabili entro il viewport dinamico, input mobile almeno 16px per ridurre lo zoom iOS. Stile esistente preservato. Nessuna navigazione interna apre tab. Non si blocca la selezione del codice dispositivo. Overscroll verticale contenuto, touch nav >=44px.

## Test eseguiti

- Sintassi app.js, pwa.js, service-worker.js; manifest JSON e dimensioni PNG.
- 196 ID DOM unici e riferimenti letterali esistenti; percorsi locali relativi e file presenti.
- Confronto byte app.js/config/Rules invariati.
- Chromium headless reale su server loopback sotto /Ranking-scopa/: registrazione/controllo worker, 14 asset statici, shell offline e ritorno online.
- Aggiornamento worker v1 -> v2: un solo reload, cache precedente rimossa, cache estranea preservata.
- Esclusione statica di API Firebase, collezioni private, altre origini/scope, query e POST.
- Android beforeinstallprompt simulato; istruzioni iOS e navigator.standalone simulati.
- Home, classifica, storico, giocatori, nuova partita a 320/375/390/430/1280px: assenza overflow orizzontale e bottom nav accessibile. Risultato a 320x480, simulazione di viewport ridotto, input utilizzabile.
- 28 controlli punteggio/bonus/Napoleon/streak/correzione/cancellazione; 100 risorteggi e integrazione accessi.
- Browser con Firebase in memoria: non-member senza letture private, richiesta idempotente, admin, approvazione, player vincolato, avatar multi-dispositivo, disabilitazione/riattivazione/scollegamento. Nessun errore JS nei test browser.
- Nessuna chiamata reale a Firebase: SDK sostituiti da fixture, traffico esterno bloccato. I test Rules precedenti sono un modello di policy, non un'esecuzione Emulator.

Limiti: nessun iPhone/Android fisico, nessun test di installazione dal vero menu di sistema, notch/Dynamic Island/gesture/tastiera reale e splash generato dal sistema ancora da verificare. Chromium simulato non è Safari. Non verificati stato remoto Pages, Rules pubblicate o Firebase Authorized Domains. Non è promessa una modalità fullscreen di sistema: è standalone. GitHub Pages richiede HTTPS e tempo di propagazione.

## Ordine manuale esatto di pubblicazione

1. Controlla il diff del repository locale sopra indicato, compresi i cambiamenti degli sprint precedenti già presenti. Verifica che non ci siano file privati da pubblicare. Conserva aperta una sessione admin autorizzata; non cancellarne lo storage.
2. Controlla nella Console Firebase del progetto ranking-scopa che Anonymous Auth e la whitelist server già adottata siano configurati. Questo sprint non richiede cambiamenti alle Rules. Se non sono ancora attive le Rules whitelist, completa separatamente il relativo rollout prima di condividere il sito.
3. Firebase Console -> Authentication -> Settings -> Authorized domains -> Add domain: inserisci SOLO `daniele02dany.github.io`, poi Add/Save. Non inserire https:// né /Ranking-scopa/. Non rimuovere domini esistenti. Anonymous Auth non è un flusso OAuth redirect: la documentazione non presenta questa whitelist domini come requisito di signInAnonymously; aggiungere l'host prepara comunque la configurazione per i flussi Auth che la richiedono. Non sostituisce members o Firestore Rules.
4. Dopo la tua revisione, in GitHub Desktop apri il repository corretto, seleziona i file che vuoi pubblicare, crea il commit su main e premi Push origin MANUALMENTE. Questo lavoro non ha eseguito commit/push.
5. GitHub -> daniele02dany/Ranking-scopa -> Settings -> Pages -> Build and deployment -> Source: Deploy from a branch -> Branch: main -> Folder: /(root) -> Save. Se Pages è già configurato, controlla questi valori. `.nojekyll` evita elaborazioni Jekyll non necessarie.
6. Attendi il job Pages in Actions e il link di pubblicazione. URL atteso dal remote rilevato: https://daniele02dany.github.io/Ranking-scopa/ . La disponibilità non è stata verificata né attivata qui. Con piano GitHub gratuito Pages è disponibile per repository pubblici; se il repository è privato verifica le opzioni del tuo piano prima di cambiarne la visibilità.
7. Apri l'URL HTTPS e controlla layout, icona, accesso e Console del browser. Se l'UID è nuovo, invia la richiesta e approvala dalla sessione admin conservata. Non associare UID copiandoli tra storage.
8. Installa sui telefoni seguendo i passaggi sotto. Se l'UID cambia ancora, ripeti la normale richiesta di accesso. Verifica home, classifica e ripresa della sessione prima di abbandonare la vecchia sessione admin.
9. Per verificare gli aggiornamenti successivi usa il processo VERSION descritto sopra. Il primo test dopo pubblicazione va fatto senza risultati non salvati.

## iPhone / iPad

1. Apri l'URL HTTPS in Safari.
2. Tocca INSTALLA APP per le istruzioni, oppure direttamente Condividi.
3. Seleziona Aggiungi alla schermata Home (può trovarsi fra le azioni aggiuntive).
4. Se presente, mantieni attivo Apri come app web. Conferma Aggiungi.
5. Apri Scopa dall'icona: modalità standalone, senza barra indirizzi; eventuali elementi di sistema restano normali.
6. Se richiesto, invia Richiedi accesso; l'admin associa il nuovo dispositivo al tuo giocatore.

## Android

1. Apri l'URL HTTPS in Chrome.
2. Quando il browser rende disponibile l'installazione, premi INSTALLA APP e conferma il prompt nativo.
3. Se il comando non compare, usa il menu Chrome -> Installa app / Aggiungi alla schermata Home (voce dipendente dal browser).
4. Apri Scopa dall'icona e completa l'eventuale richiesta accesso.
5. In standalone l'invito installazione non compare. L'installabilità e i tempi del prompt dipendono dal browser.

## Fonti ufficiali verificate

- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Firebase Anonymous Auth: https://firebase.google.com/docs/auth/web/anonymous-auth
- Firebase Auth errori/domìni OAuth: https://firebase.google.com/docs/reference/js/v8/firebase.auth.Auth
- Apple installazione: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios
- WebKit standalone: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- Service worker lifecycle: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

