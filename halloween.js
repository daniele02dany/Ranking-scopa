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

  const pumpkin=[
    {d:'M48 22Q45 10 56 6L60 10Q51 15 54 23',stroke:'#c6aa70',width:'3'},
    {d:'M50 23C17 10 4 40 13 65C19 84 39 88 50 82C66 92 90 78 91 56C96 27 74 15 50 23Z',fill:'#ae5324',stroke:'#ebae63',width:'2'},
    {d:'M48 25C29 28 26 69 46 82M55 25C75 30 77 68 56 82',stroke:'#e79a4f',width:'2'},
    {d:'M25 44L39 49L27 54ZM73 44L60 49L72 54ZM44 59L50 51L56 59ZM27 64L40 68L43 64L51 70L60 64L64 68L76 61L68 76L56 79L51 75L44 79L33 74Z',fill:'#24131a',stroke:'none'}
  ];
  const skull=[{d:'M25 49C8 17 29 7 50 8C74 6 94 24 75 50L69 54V74H31V55Z',fill:'#c0b49c',stroke:'#eee0bd',width:'2'}, {d:'M29 32C41 24 45 44 35 46C25 45 22 38 29 32ZM61 30C74 26 79 41 65 46C56 45 54 36 61 30ZM44 55L50 44L57 55Z',fill:'#211924',stroke:'none'},{d:'M38 64V75M47 64V75M56 64V75M64 64V75M12 88L85 98M15 98L87 86',stroke:'#a79479',width:'3'}];
  const tomb=[{d:'M23 88V35C23 6 77 6 77 35V88M17 89H83',fill:'#33303b',stroke:'#9e8f82',width:'2'},{d:'M31 80V36C31 16 69 16 69 36V80M42 34H58M50 26V47M36 60H64M39 68H61',stroke:'#b49b75',width:'1.5'}];
  function scene(parent,title,kind){
    if(!parent)return;
    const band=document.createElement('div');band.className='halloween-decoration halloween-scene';band.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.textContent=title;band.appendChild(label);
    decoration(band,'scene-pumpkin',pumpkin);decoration(band,'scene-skull',skull);decoration(band,'scene-bats',bats,'0 0 100 40');
    if(kind==='crypt'){decoration(band,'scene-tomb',tomb);band.classList.add('halloween-crypt');}
    parent.appendChild(band);
  }
  document.querySelectorAll('.member-pass').forEach(parent=>scene(parent,'HALLOWEEN • VIP CLUB','pass'));
  scene(document.querySelector('.champions-header'),'LA NOTTE DEI CAMPIONI','crypt');
  for(const [id,title] of [['historyScreen','IL REGISTRO DELLA NOTTE'],['playScreen','IL TAVOLO DELLA NOTTE'],['welcomeScreen','BENVENUTO AL CIRCOLO']]){
    const screen=document.getElementById(id);if(!screen)continue;
    const holder=document.createElement('div');holder.className='halloween-decoration halloween-section-scene';holder.setAttribute('aria-hidden','true');
    screen.insertBefore(holder,screen.querySelector('.brand-bar')?.nextSibling || screen.firstChild);scene(holder,title,id==='historyScreen'?'crypt':'pass');
  }
  decoration(document.querySelector('#homeScreen .ranking-preview'),'ranking-pumpkin',pumpkin);
  window.addEventListener('pageshow',updateHalloweenTheme);
  window.addEventListener('focus',updateHalloweenTheme);
  document.addEventListener('visibilitychange',updateHalloweenTheme);
  updateHalloweenTheme();
})();
