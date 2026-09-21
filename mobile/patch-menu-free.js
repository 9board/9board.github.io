(()=>{
  'use strict';
  const s=document.createElement('style');
  s.textContent=`html body #editorMenu{width:68px!important;min-width:68px!important;max-width:68px!important;flex:0 0 68px!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:4px!important;padding:7px!important;margin:0!important;height:auto!important;min-height:0!important;max-height:calc(100dvh - 20px)!important;overflow-x:hidden!important;overflow-y:auto!important;background:#192026!important;border:1px solid #56636b!important;box-shadow:none!important;border-radius:10px!important;backdrop-filter:none!important;position:relative;z-index:5000!important;isolation:isolate;transition:none!important;touch-action:pan-y!important}
html body #editorMenu .orientation-control,html body #editorMenu .tools,html body #editorMenu .tools-row{display:flex!important;flex-direction:column!important;align-items:center!important;width:100%!important;min-width:0!important;max-width:100%!important;flex:0 0 auto!important;gap:4px!important;margin:0!important;padding:0!important;border:0!important;overflow:visible!important}
html body #editorMenu .editor-row{display:flex!important;justify-content:center!important;width:100%!important;min-width:0!important;height:38px!important;flex:0 0 auto!important}
html body #editorMenu .editor-row>button{width:38px!important;min-width:38px!important;max-width:38px!important;height:38px!important;min-height:38px!important;max-height:38px!important;flex:0 0 38px!important;margin:0!important;padding:5px!important}
html body #editorMenu>.menu-drag-handle{order:-1!important;flex:0 0 18px!important;width:38px!important;height:18px!important;margin:0 auto!important;color:#fff!important}
html body #editorMenu>.menu-toggle-btn{order:99!important;position:static!important;transform:none!important;width:38px!important;min-width:38px!important;max-width:38px!important;height:38px!important;min-height:38px!important;max-height:38px!important;flex:0 0 38px!important;margin:0!important;background:#20282e!important;border:1px solid #fff!important;color:#fff!important;opacity:1!important}
html body #editorMenu.menu-collapsed{height:68px!important;min-height:68px!important;max-height:68px!important;padding:3px!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:50%!important;overflow:visible!important;justify-content:center!important}
html body #editorMenu.menu-collapsed>.orientation-control,html body #editorMenu.menu-collapsed>.tools{display:none!important}
html body #editorMenu.menu-collapsed>.menu-toggle-btn{width:62px!important;min-width:62px!important;max-width:62px!important;height:62px!important;min-height:62px!important;max-height:62px!important;flex:0 0 62px!important;border-radius:50%!important;box-shadow:none!important;z-index:1!important}
html body #editorMenu .history-row button,html body #editorMenu button[data-mode="move"]{color:#fff!important;border-color:#56636b!important;background:#20282e!important;opacity:1!important}
html body #editorMenu .history-row button:not(:disabled):active,html body #editorMenu button[data-mode="move"]:active{background:#46535e!important}
html body #editorMenu .history-row button:focus-visible,html body #editorMenu button[data-mode="move"]:focus-visible{outline:2px solid #fff!important;outline-offset:2px!important}
/* Restore the existing horizontal menu and native horizontal scrolling. */
html body #editorMenu[data-orientation="landscape"]:not(.menu-collapsed){
 width:min(620px,calc(100vw - 24px))!important;
 min-width:0!important;max-width:min(620px,calc(100vw - 24px))!important;
 flex:0 0 auto!important;flex-direction:row!important;flex-wrap:nowrap!important;
 height:58px!important;min-height:58px!important;max-height:58px!important;
 padding:6px 8px!important;overflow-x:auto!important;overflow-y:hidden!important;
 touch-action:pan-x!important;scrollbar-width:thin;
}
html body #editorMenu[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control,
html body #editorMenu[data-orientation="landscape"]:not(.menu-collapsed) .tools,
html body #editorMenu[data-orientation="landscape"]:not(.menu-collapsed) .tools-row{
 flex-direction:row!important;flex-wrap:nowrap!important;width:max-content!important;
 min-width:max-content!important;max-width:none!important;flex:0 0 auto!important;
}
html body #editorMenu[data-orientation="landscape"]:not(.menu-collapsed) .editor-row{
 width:38px!important;flex:0 0 38px!important;
}
html body #editorMenu[data-orientation="landscape"]:not(.menu-collapsed)>.menu-drag-handle{
 flex:0 0 24px!important;width:24px!important;height:38px!important;margin:0!important;
}
html body #editorMenu[data-orientation="landscape"]:not(.menu-collapsed)>.menu-toggle-btn{
 order:0!important;
}
`;
  document.head.append(s);

  function viewportBox(){
    const vv=window.visualViewport;
    return {
      left:vv?vv.offsetLeft:0,
      top:vv?vv.offsetTop:0,
      width:vv?vv.width:document.documentElement.clientWidth,
      height:vv?vv.height:document.documentElement.clientHeight
    };
  }

  function syncMenuScroll(){
    const collapsed=editorSidebar.classList.contains('menu-collapsed');
    const horizontal=orientation==='landscape'&&!collapsed;
    editorSidebar.style.setProperty('overflow-x',collapsed?'visible':horizontal?'auto':'hidden','important');
    editorSidebar.style.setProperty('overflow-y',collapsed?'visible':horizontal?'hidden':'auto','important');
    const vp=viewportBox(),r=editorSidebar.getBoundingClientRect();
    const height=collapsed?68:horizontal?58:Math.max(80,vp.height-(editorSidebar.classList.contains('menu-detached')?20:Math.max(0,r.top-vp.top)+8));
    editorSidebar.style.setProperty('max-height',height+'px','important');
  }

  /* One clamp rule for portrait and landscape: only keep the menu on-screen,
     never snap it to a preset slot. */
  clampMenuPosition=function(){
    syncMenuScroll();
    if(!editorSidebar.classList.contains('menu-detached')&&editorSidebar.style.position!=='fixed')return;
    const vp=viewportBox();
    const r=editorSidebar.getBoundingClientRect();
    const margin=10;
    let left=parseFloat(editorSidebar.style.left);
    let top=parseFloat(editorSidebar.style.top);
    if(!Number.isFinite(left))left=r.left;
    if(!Number.isFinite(top))top=r.top;
    const minLeft=vp.left+margin;
    const minTop=vp.top+margin;
    const maxLeft=Math.max(minLeft,vp.left+vp.width-r.width-margin);
    const maxTop=Math.max(minTop,vp.top+vp.height-r.height-margin);
    left=Math.max(minLeft,Math.min(left,maxLeft));
    top=Math.max(minTop,Math.min(top,maxTop));
    editorSidebar.style.position='fixed';
    editorSidebar.style.left=left+'px';
    editorSidebar.style.top=top+'px';
    editorSidebar.style.right='auto';
    editorSidebar.style.bottom='auto';
    editorSidebar.style.margin='0';
    editorSidebar.style.transform='none';
  };

  lockCurrentMenuSize=function(){clearMenuSizeLock();};

  /* Open/close keeps the floating menu at the same center in BOTH orientations. */
  setMenuExpanded=function(expanded){
    const detached=editorSidebar.classList.contains('menu-detached');
    const before=editorSidebar.getBoundingClientRect();
    const cx=before.left+before.width/2;
    const cy=before.top+before.height/2;

    editorSidebar.classList.toggle('menu-collapsed',!expanded);
    menuToggleBtn.setAttribute('aria-expanded',String(expanded));
    menuToggleBtn.setAttribute('aria-label',expanded?'編集メニューを閉じる':'編集メニューを開く');
    menuToggleBtn.title=expanded?'編集メニューを閉じる':'編集メニューを開く';
    menuToggleBtn.querySelector('span').textContent=expanded?'×':'☰';
    menuToggleBtn.querySelector('small').textContent=expanded?'閉じる':'メニュー';

    if(detached){
      editorSidebar.classList.add('menu-detached');
      editorSidebar.style.position='fixed';
      editorSidebar.style.margin='0';
      editorSidebar.style.right='auto';
      editorSidebar.style.bottom='auto';
      editorSidebar.style.transform='none';
      if(expanded)lockCurrentMenuSize();
      else clearMenuSizeLock();
    }

    requestAnimationFrame(()=>{
      if(detached){
        const after=editorSidebar.getBoundingClientRect();
        editorSidebar.style.left=(cx-after.width/2)+'px';
        editorSidebar.style.top=(cy-after.height/2)+'px';
        clampMenuPosition();
      }
      layoutTable(true);
      requestAnimationFrame(()=>{if(detached)clampMenuPosition()});
    });
  };

  window.addEventListener('resize',()=>requestAnimationFrame(clampMenuPosition));
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(clampMenuPosition));
    window.visualViewport.addEventListener('scroll',()=>requestAnimationFrame(clampMenuPosition));
  }
})();
