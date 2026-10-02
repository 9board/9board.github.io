/* 9BOARD Mobile - landscape/fullscreen add-on only. */
(function(){
  'use strict';

  function addStyle(){
    if(document.getElementById('nineboardLandscapeStyle')) return;
    const style=document.createElement('style');
    style.id='nineboardLandscapeStyle';
    style.textContent=`
      #nineboardLandscapeBtn{position:absolute;right:70px;top:calc(18px + env(safe-area-inset-top));min-width:48px;height:48px;padding:0 12px;border-radius:24px;background:#fff;border:1px solid var(--line);box-shadow:0 4px 14px rgba(0,0,0,.06);color:#40484e;font-size:12px;font-weight:900;z-index:5}
      @media (orientation:landscape){
        html,body{width:100%;height:100%;overflow:hidden;background:var(--bg)!important}
        .phone{width:100vw!important;max-width:none!important;height:100dvh!important;min-height:100dvh!important;margin:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important}
        .app-view{width:100vw!important;height:100dvh!important;max-width:none!important;padding-bottom:calc(64px + env(safe-area-inset-bottom))!important}
        .bottom-nav{position:absolute!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:calc(58px + env(safe-area-inset-bottom))!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;display:grid!important;gap:0!important;padding-top:4px!important}
        .nav-btn{min-width:0!important;flex-direction:row!important;gap:7px!important;font-size:16px!important}
        .nav-btn span{font-size:11px!important;white-space:nowrap!important}
        .nav-art{width:34px!important;height:34px!important;flex:0 0 34px!important}
        .wrap{max-width:none!important;width:100%!important}

        /* 配置図だけを横向き専用に調整。他画面のレイアウトには触れない。 */
        .screen[data-screen="layout"].active{height:calc(100dvh - 58px - env(safe-area-inset-bottom))!important;overflow:hidden!important}
        .screen[data-screen="layout"] .topbar{display:none!important}
        .screen[data-screen="layout"] .wrap{height:100%!important;padding:6px 10px 0!important;display:flex!important;flex-direction:column!important;align-items:center!important;overflow:hidden!important}
        .screen[data-screen="layout"] .page-head{display:none!important}
        .screen[data-screen="layout"] .layout-card{width:100%!important;max-width:calc((100dvh - 150px) * 650 / 365)!important;padding:6px!important;border-radius:16px!important;flex:0 0 auto!important}
        .screen[data-screen="layout"] .table-viewport{width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:650/365!important;border-radius:16px!important}
        .screen[data-screen="layout"] .table-stage{border-radius:16px!important}
        .screen[data-screen="layout"] .toolbar{width:100%!important;margin-top:4px!important;padding:3px 0 2px!important;gap:6px!important;flex-wrap:nowrap!important;overflow-x:auto!important}
        .screen[data-screen="layout"] .tool{min-width:58px!important;height:44px!important;border-radius:11px!important;font-size:16px!important;gap:1px!important}
        .screen[data-screen="layout"] .tool span{font-size:8px!important}
        .screen[data-screen="layout"] .ballbar-title{display:none!important}
        .screen[data-screen="layout"] .ballbar{width:100%!important;padding:2px 0 3px!important;gap:5px!important;flex-wrap:nowrap!important;overflow-x:auto!important}
        .screen[data-screen="layout"] .ballbar button{flex:0 0 36px!important;width:36px!important;height:36px!important;border-radius:10px!important;padding:4px!important}
        .screen[data-screen="layout"] .palette-ball{width:24px!important;height:24px!important;min-width:24px!important;min-height:24px!important}
        .screen[data-screen="layout"] .layout-settings{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  async function enterLandscape(){
    const root=document.documentElement;
    try{
      if(!document.fullscreenElement && root.requestFullscreen){
        await root.requestFullscreen({navigationUI:'hide'}).catch(()=>root.requestFullscreen());
      }
    }catch(e){/* browser may block fullscreen; still try orientation */}
    try{
      if(screen.orientation && screen.orientation.lock){
        await screen.orientation.lock('landscape');
      }
    }catch(e){/* unsupported on some browsers */}
  }

  function addButton(){
    if(document.getElementById('nineboardLandscapeBtn')) return true;
    const header=document.querySelector('.home-header');
    if(!header) return false;
    const btn=document.createElement('button');
    btn.id='nineboardLandscapeBtn';
    btn.type='button';
    btn.textContent='横向き';
    btn.setAttribute('aria-label','横向き全画面表示');
    btn.addEventListener('click',enterLandscape);
    header.appendChild(btn);
    return true;
  }

  function init(){
    addStyle();
    if(addButton()) return;
    const observer=new MutationObserver(()=>{if(addButton()) observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
