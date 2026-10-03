(()=>{
  const HOME='https://9board.jp/';
  const APP='https://9board.jp/pc/';
  const logo=document.querySelector('.header .logo');
  const logoLink=logo&&logo.closest('a');
  if(logoLink)logoLink.href=HOME;
  const nav=document.querySelector('.header .nav');
  if(nav&&!Array.from(nav.querySelectorAll('a')).some(a=>a.textContent.trim()==='トップ')){
    const top=document.createElement('a');top.href=HOME;top.textContent='トップ';nav.insertBefore(top,nav.firstElementChild);
  }
  // Guide pages remain documentation only. App buttons open the unified PC app shell.
  document.querySelectorAll('.layout-use-button').forEach(link=>{
    const label=(link.textContent||'').trim();
    if(label.includes('配置図')) link.href=APP+'#layout';
    else if(label.includes('スコア')) link.href=APP+'#score';
    else if(label.includes('対戦記録')) link.href=APP+'#records';
  });
})();
