(()=>{
  'use strict';

  const style=document.createElement('style');
  style.textContent=`
    .board-column{overflow-x:hidden!important}

    /* Portrait menu: vertical scrolling only. */
    .editor-sidebar[data-orientation="portrait"]:not(.menu-collapsed){
      overflow-y:auto!important;
      overflow-x:hidden!important;
      overscroll-behavior:contain!important;
      -webkit-overflow-scrolling:touch;
      touch-action:pan-y;
    }

    /* Landscape menu: ALWAYS one horizontal row, for default and detached states. */
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed),
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed){
      display:flex!important;
      flex-direction:row!important;
      flex-wrap:nowrap!important;
      align-items:center!important;
      gap:5px!important;
      width:calc(100vw - 12px)!important;
      min-width:0!important;
      max-width:calc(100vw - 12px)!important;
      height:auto!important;
      min-height:0!important;
      padding:6px 8px!important;
      border-radius:10px!important;
      overflow-x:auto!important;
      overflow-y:hidden!important;
      overscroll-behavior-x:contain!important;
      -webkit-overflow-scrolling:touch;
      touch-action:pan-x;
      scrollbar-width:thin;
    }
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .menu-toggle-btn,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .menu-toggle-btn{
      order:0!important;
      flex:0 0 38px!important;
      width:38px!important;
      height:38px!important;
      margin:0 3px 0 0!important;
    }
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .orientation-control,
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .tools,
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .tools-row,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .tools,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .tools-row{
      display:flex!important;
      flex-direction:row!important;
      flex-wrap:nowrap!important;
      align-items:center!important;
      width:max-content!important;
      min-width:max-content!important;
      max-width:none!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      gap:3px!important;
      overflow:visible!important;
    }
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .orientation-control>div,
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .editor-row,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control>div,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .editor-row{
      display:block!important;
      width:auto!important;
      min-width:0!important;
      flex:0 0 auto!important;
    }
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .tool-help,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .tool-help{display:none!important}
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .editor-row button,
    .board-column.landscape>.editor-sidebar:not(.menu-collapsed) .orientation-control button,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .editor-row button,
    .editor-sidebar[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control button{
      width:36px!important;
      height:36px!important;
      min-width:36px!important;
      flex:0 0 36px!important;
      padding:5px!important;
    }

    /* Floating menu must never disappear outside the viewport. */
    .editor-sidebar.menu-detached{z-index:5000!important}
    .editor-sidebar.menu-detached.menu-collapsed{
      width:68px!important;
      min-width:68px!important;
      max-width:68px!important;
      height:68px!important;
      min-height:68px!important;
      max-height:68px!important;
      overflow:hidden!important;
    }

    .history-row button,.menu-reset-row button{
      border:1px solid #56636b!important;
      background:#20282e!important;
      color:#fff!important;
      border-radius:9px!important;
      box-shadow:none!important;
    }
    .history-row button svg,.menu-reset-row button svg{
      width:26px!important;
      height:26px!important;
      fill:none!important;
      stroke:currentColor!important;
      stroke-width:1.8!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
    }
    .history-row button,.history-row button:disabled,
    .history-row button.active,.history-row button:disabled.active{
      color:var(--gold)!important;
      border-color:#56636b!important;
      background:#20282e!important;
      opacity:1!important;
      box-shadow:none!important;
    }
    .history-row button:disabled{cursor:default!important}
    .menu-reset-row button{color:#fff!important}
    .menu-reset-row button:active,.menu-reset-row button:focus-visible,
    .history-row button:not(:disabled):active,.history-row button:not(:disabled):focus-visible{
      border-color:var(--gold)!important;
      color:var(--gold)!important;
      background:#d5aa5822!important;
    }
  `;
  document.head.append(style);

  function viewportSize(){
    return {
      width:document.documentElement.clientWidth,
      height:window.visualViewport?window.visualViewport.height:document.documentElement.clientHeight
    };
  }

  function clampDetachedMenu(){
    if(!editorSidebar.classList.contains('menu-detached'))return;
    const vp=viewportSize();
    const r=editorSidebar.getBoundingClientRect();
    const margin=6;
    let left=parseFloat(editorSidebar.style.left);
    let top=parseFloat(editorSidebar.style.top);
    if(!Number.isFinite(left))left=r.left;
    if(!Number.isFinite(top))top=r.top;
    const maxLeft=Math.max(margin,vp.width-r.width-margin);
    const maxTop=Math.max(margin,vp.height-r.height-margin);
    left=Math.max(margin,Math.min(left,maxLeft));
    top=Math.max(margin,Math.min(top,maxTop));
    editorSidebar.style.left=left+'px';
    editorSidebar.style.top=top+'px';
    editorSidebar.style.right='auto';
    editorSidebar.style.bottom='auto';
  }

  /* Replace the original clamp so dragging/open-close cannot bury the menu off-screen. */
  clampMenuPosition=function(){clampDetachedMenu()};

  function fitMenuScroll(){
    if(editorSidebar.classList.contains('menu-collapsed'))return;
    const vp=viewportSize();
    const r=editorSidebar.getBoundingClientRect();
    if(orientation==='portrait'){
      const top=Math.max(4,r.top);
      editorSidebar.style.setProperty('max-height',Math.max(150,vp.height-top-8)+'px','important');
      editorSidebar.style.setProperty('overflow-y','auto','important');
      editorSidebar.style.setProperty('overflow-x','hidden','important');
    }else{
      editorSidebar.style.setProperty('width','min(620px,calc(100vw - 24px))','important');
      editorSidebar.style.setProperty('max-width','min(620px,calc(100vw - 24px))','important');
      editorSidebar.style.setProperty('overflow-x','auto','important');
      editorSidebar.style.setProperty('overflow-y','hidden','important');
      editorSidebar.style.removeProperty('max-height');
    }
  }

  const originalLockCurrentMenuSize=lockCurrentMenuSize;
  lockCurrentMenuSize=function(){
    if(orientation==='landscape'){
      editorSidebar.style.setProperty('width','min(620px,calc(100vw - 24px))','important');
      editorSidebar.style.setProperty('max-width','min(620px,calc(100vw - 24px))','important');
      editorSidebar.style.setProperty('height','auto','important');
      editorSidebar.style.removeProperty('min-height');
      editorSidebar.style.removeProperty('max-height');
      editorSidebar.style.removeProperty('flex-basis');
      return;
    }
    originalLockCurrentMenuSize();
    fitMenuScroll();
  };

  setMenuExpanded=function(expanded){
    const detached=editorSidebar.classList.contains('menu-detached');
    const before=editorSidebar.getBoundingClientRect();
    const center={x:before.left+before.width/2,y:before.top+before.height/2};

    editorSidebar.classList.toggle('menu-collapsed',!expanded);

    if(detached){
      clearMenuSizeLock();
      editorSidebar.classList.add('menu-detached');
      editorSidebar.style.position='fixed';
      editorSidebar.style.margin='0';
      editorSidebar.style.right='auto';
      editorSidebar.style.bottom='auto';
      editorSidebar.style.transform='none';
      if(expanded&&orientation==='landscape'){
        editorSidebar.style.setProperty('width','min(620px,calc(100vw - 24px))','important');
        editorSidebar.style.setProperty('max-width','min(620px,calc(100vw - 24px))','important');
      }
    }

    menuToggleBtn.setAttribute('aria-expanded',String(expanded));
    menuToggleBtn.setAttribute('aria-label',expanded?'編集メニューを閉じる':'編集メニューを開く');
    menuToggleBtn.title=expanded?'編集メニューを閉じる':'編集メニューを開く';
    menuToggleBtn.querySelector('span').textContent=expanded?'×':'☰';
    menuToggleBtn.querySelector('small').textContent=expanded?'閉じる':'メニュー';

    requestAnimationFrame(()=>{
      fitMenuScroll();
      if(detached){
        const after=editorSidebar.getBoundingClientRect();
        editorSidebar.style.left=(center.x-after.width/2)+'px';
        editorSidebar.style.top=(center.y-after.height/2)+'px';
        clampDetachedMenu();
      }
      layoutTable(true);
      requestAnimationFrame(()=>{
        fitMenuScroll();
        clampDetachedMenu();
      });
    });
  };

  table.addEventListener('pointerdown',e=>{
    if(mode!=='erase'||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;
    const ball=e.target.closest('.ball');
    if(!ball||ball.classList.contains('linked-ghost')||!ball.dataset.n)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    cancelBallHold();
    removeBall(ball.dataset.n);
  },true);

  /* Keep table anchored while zooming. */
  applyTableTransform=function(){
    tableFrame.style.transformOrigin='0 0';
    tableFrame.style.transform=`scale(${fitScale*tableZoom})`;
  };
  resetTableZoom=function(){
    tableZoom=1;
    tablePan={x:0,y:0};
    pinchGesture=null;
    tableTouches.clear();
    applyTableTransform();
    renderLines();
  };
  tablePan={x:0,y:0};
  applyTableTransform();

  /* Line geometry must be based on the UNTRANSFORMED cloth size.
     Using getBoundingClientRect() while pinch-zoomed made line trimming drift away from balls. */
  visibleEnds=function(l){
    const w=table.clientWidth||1,h=table.clientHeight||1;
    const dx=(l.x2-l.x1)*w/100,dy=(l.y2-l.y1)*h/100,len=Math.hypot(dx,dy)||1;
    const logicalBall=Math.min(w,h)*16/274;
    const startTrim=l.startBall?logicalBall/2:0;
    const endTrim=l.endBall?logicalBall/2:0;
    return {
      x1:l.x1+(dx/len)*startTrim/w*100,
      y1:l.y1+(dy/len)*startTrim/h*100,
      x2:l.x2-(dx/len)*endTrim/w*100,
      y2:l.y2-(dy/len)*endTrim/h*100
    };
  };
  lineLengthPx=function(l){
    const w=table.clientWidth||1,h=table.clientHeight||1,v=visibleEnds(l);
    return Math.hypot((v.x2-v.x1)*w/100,(v.y2-v.y1)*h/100);
  };

  const toolsRow=document.querySelector('.tools-row');
  const drawRow=document.querySelector('#drawBtn')?.closest('.editor-row');
  const iconUndo='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4v-5"/><path d="M4 7c2.2-2.7 5.2-4 8.5-3.6 4.4.5 7.5 4 7.5 8.6 0 4.9-3.9 8-8.5 8"/></svg>';
  const iconRedo='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7h5v-5"/><path d="M20 7c-2.2-2.7-5.2-4-8.5-3.6C7.1 3.9 4 7.4 4 12c0 4.9 3.9 8 8.5 8"/></svg>';
  const iconZoomReset='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="5.5"/><path d="M14.2 14.2 20 20"/><path d="M7.5 10h5"/><path d="M10 7.5v5"/><path d="M4.2 4.7 2.8 6.1M4.2 4.7 5.6 6.1M4.2 4.7v3.2"/></svg>';
  const iconReset='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V3m0 0h4M4 3l3.2 3.2"/><path d="M5 10a7 7 0 1 0 2-4.9"/><circle cx="12" cy="12" r="1.4"/><path d="M12 8.2v1.2M15.8 12h-1.2M12 15.8v-1.2M8.2 12h1.2"/></svg>';

  function historyControl(id,label,svg){
    const row=document.createElement('div');row.className='editor-row history-row';
    const help=document.createElement('span');help.className='tool-help';help.textContent=label;
    const btn=document.createElement('button');btn.type='button';btn.id=id;btn.title=label;btn.setAttribute('aria-label',label);btn.innerHTML=svg;
    row.append(help,btn);return {row,btn};
  }
  const undo=historyControl('undoBtn','1個前に戻る',iconUndo);
  const redo=historyControl('redoBtn','1個前に進む',iconRedo);
  if(drawRow){toolsRow.insertBefore(undo.row,drawRow);toolsRow.insertBefore(redo.row,drawRow)}else{toolsRow.append(undo.row,redo.row)}

  function moveButtonIntoMenu(button,label,svg,beforeRow=null){
    if(!button)return;
    const row=document.createElement('div');row.className='editor-row menu-reset-row';
    const help=document.createElement('span');help.className='tool-help';help.textContent=label;
    button.classList.add('menu-reset-button');
    button.title=label;button.setAttribute('aria-label',label);button.innerHTML=svg;
    row.append(help,button);
    if(beforeRow)toolsRow.insertBefore(row,beforeRow);else toolsRow.append(row);
  }
  const saveRow=document.querySelector('#saveBtn')?.closest('.editor-row');
  moveButtonIntoMenu(document.querySelector('#zoomResetBtn'),'拡大を元に戻す',iconZoomReset,saveRow);
  moveButtonIntoMenu(document.querySelector('#resetBtn'),'配置を全部リセット',iconReset,saveRow);

  let history=[],historyIndex=-1,historyTimer=null,applyingHistory=false;
  const snap=()=>({
    state:structuredClone(state),lines:structuredClone(lines),notes:structuredClone(notes),
    tip:tip?structuredClone(tip):null,orientation,currentSaveId,currentTitle
  });
  const key=s=>JSON.stringify(s);
  function refreshHistoryButtons(){
    undo.btn.disabled=historyIndex<=0;
    redo.btn.disabled=historyIndex<0||historyIndex>=history.length-1;
    undo.btn.classList.remove('active');
    redo.btn.classList.remove('active');
  }
  function pushHistoryNow(){
    clearTimeout(historyTimer);historyTimer=null;
    const s=snap(),k=key(s);
    if(historyIndex>=0&&key(history[historyIndex])===k){refreshHistoryButtons();return}
    history=history.slice(0,historyIndex+1);history.push(s);
    if(history.length>80)history.shift();
    historyIndex=history.length-1;refreshHistoryButtons();
  }
  function scheduleHistory(){clearTimeout(historyTimer);historyTimer=setTimeout(pushHistoryNow,180)}
  const oldMarkUnsaved=markUnsaved;
  markUnsaved=function(){oldMarkUnsaved();if(!applyingHistory)scheduleHistory()};
  function applyHistory(s){
    applyingHistory=true;
    state=structuredClone(s.state);lines=structuredClone(s.lines);notes=structuredClone(s.notes);tip=s.tip?structuredClone(s.tip):null;
    currentSaveId=s.currentSaveId;currentTitle=s.currentTitle||'';
    if(orientation!==s.orientation)setOrientation(s.orientation,false,false);
    selectedLine=-1;draggingBall=null;draggingLine=null;lineStart=null;lineDraft=null;groupDrag=null;
    render();layoutTable(true);oldMarkUnsaved();
    applyingHistory=false;refreshHistoryButtons();fitMenuScroll();clampDetachedMenu();
  }
  undo.btn.onclick=()=>{if(historyTimer)pushHistoryNow();if(historyIndex<=0)return;historyIndex--;applyHistory(history[historyIndex])};
  redo.btn.onclick=()=>{if(historyTimer)pushHistoryNow();if(historyIndex>=history.length-1)return;historyIndex++;applyHistory(history[historyIndex])};

  window.addEventListener('resize',()=>requestAnimationFrame(()=>{fitMenuScroll();clampDetachedMenu()}));
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(()=>{fitMenuScroll();clampDetachedMenu()}));

  pushHistoryNow();
  layoutTable(true);
  requestAnimationFrame(()=>{fitMenuScroll();clampDetachedMenu();renderLines()});
})();
