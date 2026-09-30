(()=>{
  const HOME='https://9board.jp/';
  const logo=document.querySelector('.header .logo');
  const logoLink=logo&&logo.closest('a');
  if(logoLink)logoLink.href=HOME;

  const nav=document.querySelector('.header .nav');
  if(nav&&!Array.from(nav.querySelectorAll('a')).some(a=>a.textContent.trim()==='トップ')){
    const top=document.createElement('a');
    top.href=HOME;
    top.textContent='トップ';
    nav.insertBefore(top,nav.firstElementChild);
  }

  const main=document.querySelector('.guide-main');
  const content=document.querySelector('.guide-content');
  const bottom=document.querySelector('.layout-use-cta--bottom');
  if(!main||!content)return;

  let panel=null;
  let frame=null;
  document.querySelectorAll('.layout-use-button').forEach(link=>{
    link.addEventListener('click',e=>{
      e.preventDefault();
      if(!panel){
        panel=document.createElement('section');
        panel.setAttribute('aria-label','配置図');
        panel.style.cssText='grid-column:1/-1;grid-row:4;width:100%;margin:0 0 28px;border:1px solid #dbeae4;border-radius:16px;overflow:hidden;background:#fff;scroll-margin-top:96px';
        frame=document.createElement('iframe');
        frame.title='9BOARD 配置図';
        frame.style.cssText='display:block;width:100%;height:calc(100vh - 120px);min-height:720px;border:0;background:#f5faf7';
        panel.appendChild(frame);
        content.style.gridRow='5';
        if(bottom)bottom.style.gridRow='6';
        main.insertBefore(panel,content);
      }
      const src=link.getAttribute('href');
      if(frame.dataset.src!==src){frame.src=src;frame.dataset.src=src;}
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
})();
