/* Seasonal presentation only. No Firebase, storage, routing or gameplay state. */
function isHalloweenSeason(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {timeZone:'Europe/Rome',month:'2-digit'}).format(date) === '10';
}
(() => {
  let timer;
  const root = document.documentElement;
  function updateHalloweenTheme() {
    root.classList.toggle('theme-halloween',isHalloweenSeason());
    clearTimeout(timer);
    // Minute-aligned: November starts at the same boundary in Europe/Rome.
    // Resume events also cover suspended/background PWA timers and clock changes.
    timer = setTimeout(updateHalloweenTheme,60000 - Date.now() % 60000);
  }
  const svgNS='http://www.w3.org/2000/svg';
  function decoration(parent,kind,paths,viewBox='0 0 100 100') {
    if(!parent) return;
    const svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('class','halloween-decoration halloween-'+kind);
    svg.setAttribute('viewBox',viewBox);svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    paths.forEach(({d,fill='none',stroke='currentColor',width='1'})=>{
      const path=document.createElementNS(svgNS,'path');path.setAttribute('d',d);path.setAttribute('fill',fill);path.setAttribute('stroke',stroke);path.setAttribute('stroke-width',width);svg.appendChild(path);
    });parent.appendChild(svg);
  }
  const web=[{d:'M100 0H0M100 0V100M100 0L25 75M100 0L7 39M100 0L61 93M76 0Q77 10 83 17Q90 24 100 24M51 0Q54 20 66 34Q80 47 100 49M26 0Q31 31 48 52Q69 70 100 74M1 0Q7 42 30 70Q58 94 100 99',width:'.8'}];
  const bats=[{d:'M8 23Q14 8 26 7L25 17L32 14L38 20L44 16L43 7Q58 10 66 23Q53 19 50 30L39 25L35 34L30 25Q18 32 18 24Z',fill:'currentColor',stroke:'none'},{d:'M79 9L84 13L88 9L87 17L95 17L89 22L84 19L79 23L74 17L81 16Z',fill:'currentColor',stroke:'none'}];
  decoration(document.querySelector('#homeScreen .brand-bar'),'bats',bats,'0 0 100 40');
  document.querySelectorAll('.member-pass,.champions-header').forEach(parent=>decoration(parent,'web',web));
  document.querySelectorAll('.champions-header,.hall-of-fame-entry').forEach(parent=>decoration(parent,'moon',[{d:'M29 4A14 14 0 1 0 29 30A16 16 0 0 1 29 4Z',fill:'currentColor',stroke:'none'}],'0 0 36 36'));
  const pass=document.getElementById('homeMemberPass');
  if(pass){const edition=document.createElement('span');edition.className='halloween-decoration halloween-edition';edition.setAttribute('aria-hidden','true');edition.textContent='HALLOWEEN EDITION';pass.appendChild(edition);}
  window.addEventListener('pageshow',updateHalloweenTheme);
  window.addEventListener('focus',updateHalloweenTheme);
  document.addEventListener('visibilitychange',updateHalloweenTheme);
  updateHalloweenTheme();
})();
