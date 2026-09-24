/* Installation and shell lifecycle only: no player data, UID or Firebase writes here. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const standaloneQuery = matchMedia('(display-mode: standalone)');
  const isStandalone = () => standaloneQuery.matches || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt = null, registration = null, booting = false, appLoaded = false, reloadOnce = false;
  const installButton = byId('pwaInstall');
  const syncInstall = () => { installButton.hidden = isStandalone() || !(installPrompt || isIOS); };
  standaloneQuery.addEventListener?.('change',syncInstall);
  window.addEventListener('beforeinstallprompt',event => {event.preventDefault();installPrompt=event;syncInstall();});
  window.addEventListener('appinstalled',() => {installPrompt=null;installButton.hidden=true;});
  installButton.addEventListener('click',async () => {
    if (isStandalone()) return syncInstall();
    if (installPrompt) {
      const prompt=installPrompt;installPrompt=null;syncInstall();
      try {await prompt.prompt();await prompt.userChoice;} catch { /* Browser controls eligibility. */ }
    } else if (isIOS) byId('pwaInstallDialog').showModal();
  });
  syncInstall();
  const ready = () => {
    document.body.classList.remove('pwa-booting');byId('pwaSplash').hidden=true;
  };
  // Existing access flow chooses the screen; never reveal it while checking identity.
  const observer = new MutationObserver(() => {
    if (!appLoaded) return;
    const active=document.querySelector('.screen.active');
    const message=byId('accessMessage')?.textContent || '';
    if (active && (active.id==='homeScreen' || active.id==='playerScreen' || (active.id==='accessScreen' && message && !message.includes('Verifica dell’accesso')))) {ready();observer.disconnect();}
  });
  observer.observe(document.querySelector('.app'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  const loaded = new Set();
  const loadScript = src => new Promise((resolve,reject) => {
    if (loaded.has(src)) return resolve();
    const script=document.createElement('script');script.src=src;script.async=false;
    script.onload=()=>{loaded.add(src);resolve();};script.onerror=()=>{script.remove();reject(Error('Unavailable'));};document.head.append(script);
  });
  async function boot() {
    if (booting || appLoaded) return;
    if (!navigator.onLine) {byId('pwaBootMessage').textContent='Connessione assente. Torna online per accedere al circolo.';byId('pwaRetry').hidden=false;return;}
    booting=true;byId('pwaRetry').hidden=true;byId('pwaBootMessage').textContent='Apertura del circolo…';
    try {
      for (const name of ['app','auth','firestore']) await loadScript(`https://www.gstatic.com/firebasejs/10.14.1/firebase-${name}-compat.js`);
      await loadScript('./firebase-config.js');
      appLoaded=true;
      await loadScript('./app.js');
    } catch {
      appLoaded=false;byId('pwaBootMessage').textContent='Connessione non disponibile. Riprova tra poco.';byId('pwaRetry').hidden=false;
    } finally {booting=false;}
  }
  byId('pwaRetry').addEventListener('click',boot);
  function connectivity() {
    byId('pwaOffline').hidden=navigator.onLine;
    if (navigator.onLine) {
      if (!appLoaded) boot();
      else if (byId('accessScreen').classList.contains('active')) byId('refreshAccessButton').click();
      registration?.update().catch(()=>{});
    }
  }
  window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);
  byId('pwaOffline').hidden=navigator.onLine;
  byId('pwaUpdateButton').addEventListener('click',() => {
    // Explicit confirmation; controllerchange in other tabs never forces their reload.
    if (registration?.waiting) registration.waiting.postMessage({type:'SKIP_WAITING'});
    else location.reload();
    reloadOnce=true;
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    let hadController=Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange',() => {
      if (!hadController) {hadController=true;return;}
      if (reloadOnce) {reloadOnce=false;location.reload();}
      else if (appLoaded) byId('pwaUpdate').hidden=false;
    });
    navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'}).then(reg => {
      registration=reg;
      const check=()=>{if(reg.waiting && navigator.serviceWorker.controller) byId('pwaUpdate').hidden=false;};
      check();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',check));
      document.addEventListener('visibilitychange',()=>{if(!document.hidden) reg.update().catch(()=>{});});
      reg.update().catch(()=>{});
    }).catch(()=>{ /* Installation is optional: ordinary browser use stays available. */ });
  }
  boot();
})();
