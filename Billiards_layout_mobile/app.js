let currentTitle='';
const colors=['#f3d400','#1767c8','#e6382e','#6b3ba9','#ef7d15','#248046','#7b201d','#111','#f0d63b','#1767c8','#e6382e','#6b3ba9','#ef7d15','#248046','#7b201d'];
const table=document.querySelector('.cloth');
const tableFrame=document.querySelector('.table');
const layer=document.querySelector('#ballsLayer');
const notesLayer=document.querySelector('#notesLayer');
const svg=document.querySelector('#lines');
const cueDiagram=document.querySelector('#cueDiagram');
const tipMark=document.querySelector('#tipMark');
const boardColumn=document.querySelector('#boardColumn');
const sideControls=document.querySelector('.side-controls');
const trayEl=document.querySelector('.tray');
const portraitBtn=document.querySelector('#portraitBtn');
const landscapeBtn=document.querySelector('#landscapeBtn');
const targetGuide=document.querySelector('#targetGuide');

let mode='move',draggingBall=null,draggingLine=null,lineStart=null,lineDraft=null,lines=[],notes=[],state={},selectedLine=-1,tip=null,tipDragging=false,activeLineColor='auto',activeLineChoice='auto',paletteLineType='line',currentSaveId=null,repeatBallSeq=0,orientation='portrait',activeLineWidth=2,groupMoveMode=false,groupDrag=null;
let ballPress=null,ballMoved=false,savedView='cards',savedSortOrder='newest';
let ballHold=null,lastTouchTime=0;
let ghostEnabled=false;
let ghostDrag=null;
let fitScale=1,tableZoom=1,tablePan={x:0,y:0},pinchGesture=null;
const tableTouches=new Map();
function cancelBallHold(){if(ballHold)clearTimeout(ballHold.timer);ballHold=null}
function startBallHold(e,n){
  cancelBallHold();
  if(e.pointerType!=='touch')return;
  const hold={id:e.pointerId,x:e.clientX,y:e.clientY,n};
  hold.timer=setTimeout(()=>{
    if(ballHold!==hold||!state[n])return;
    cancelBallHold();draggingBall=null;ballPress=null;groupDrag=null;lineStart=null;lineDraft=null;
    removeBall(n);
  },600);
  ballHold=hold;
}
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')lastTouchTime=Date.now();cancelBallHold()},true);
document.addEventListener('pointermove',e=>{if(ballHold&&e.pointerId===ballHold.id&&Math.hypot(e.clientX-ballHold.x,e.clientY-ballHold.y)>5)cancelBallHold()},true);
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>{if(ballHold&&e.pointerId===ballHold.id)cancelBallHold()},true);
window.addEventListener('blur',cancelBallHold);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelBallHold()});
const defs=`<defs></defs>`;
const noteFonts={
  gothic:'system-ui,-apple-system,"Noto Sans JP",sans-serif',
  mincho:'Georgia,"Yu Mincho","Hiragino Mincho ProN",serif',
  rounded:'"Arial Rounded MT Bold","Hiragino Maru Gothic ProN",system-ui,sans-serif',
  hand:'"Klee One","Yuji Syuku","Segoe Print",cursive'
};

function ballKind(n){const id=String(n);return id==='cue'||id.startsWith('cue-')?'cue':id==='ghost'||id.startsWith('ghost-')?'ghost':id}
function ballColor(n){const kind=ballKind(n);return kind==='cue'?'#fff':kind==='ghost'?'#dce7e3':colors[Number(kind)-1]||'#fff'}
function repeatBallId(kind){repeatBallSeq+=1;return `${kind}-${Date.now()}-${repeatBallSeq}`}

function markUnsaved(){document.querySelector('#saveState').textContent='未保存'}
function showTargetGuide(p,ballId=null){
  targetGuide.hidden=false;
  const clothRect=table.getBoundingClientRect(),guideRect=targetGuide.getBoundingClientRect();
  const ball=ballId===null?null:layer.querySelector('[data-n="'+ballId+'"]');
  const ballRect=ball?.getBoundingClientRect();
  const x=ballRect?ballRect.left+ballRect.width/2:clothRect.left+p.x*clothRect.width/100;
  const y=ballRect?ballRect.top+ballRect.height/2:clothRect.top+p.y*clothRect.height/100;
  // Convert the rendered center back into the guide's own unscaled coordinate space.
  targetGuide.style.setProperty('--guide-x',(x-guideRect.left)/guideRect.width*100+'%');
  targetGuide.style.setProperty('--guide-y',(y-guideRect.top)/guideRect.height*100+'%');
}
function hideTargetGuide(){targetGuide.hidden=true}
function defaultState(){state={};lines=[];notes=[];tip=null;selectedLine=-1;currentSaveId=null;render();markUnsaved()}
function clearTable(){state={};lines=[];notes=[];tip=null;selectedLine=-1;currentSaveId=null;hideTargetGuide();render();markUnsaved()}
function rotateCoordinates(next){
  const rotate=p=>next==='landscape'?{...p,x:100-p.y,y:p.x}:{...p,x:p.y,y:100-p.x};
  Object.keys(state).forEach(n=>{state[n]=rotate(state[n])});
  lines.forEach(l=>{const a=rotate({x:l.x1,y:l.y1}),b=rotate({x:l.x2,y:l.y2});l.x1=a.x;l.y1=a.y;l.x2=b.x;l.y2=b.y});
  notes.forEach(note=>Object.assign(note,rotate(note)));
}
function setOrientation(next,rotateContent=true,mark=true){
  if(!['portrait','landscape'].includes(next))next='portrait';
  if(next===orientation)return;
  if(rotateContent)rotateCoordinates(next);
  orientation=next;
  editorSidebar.dataset.orientation=next;
  boardColumn.classList.toggle('portrait',next==='portrait');
  boardColumn.classList.toggle('landscape',next==='landscape');
  portraitBtn.classList.toggle('active',next==='portrait');
  landscapeBtn.classList.toggle('active',next==='landscape');
  portraitBtn.setAttribute('aria-pressed',String(next==='portrait'));
  landscapeBtn.setAttribute('aria-pressed',String(next==='landscape'));
  resetMenuToDefault();
  render();
  layoutTable(true);
  if(mark)markUnsaved();
}
portraitBtn.onclick=()=>setOrientation('portrait');
landscapeBtn.onclick=()=>setOrientation('landscape');

const tableAndTip=document.querySelector('.table-and-tip'),editorSidebar=document.querySelector('.editor-sidebar'),tableWrap=document.querySelector('.table-wrap');
const menuPlaceholder=document.createElement('div');
menuPlaceholder.className='menu-placeholder';
function clearMenuSizeLock(){
  for(const prop of ['width','min-width','max-width','height','min-height','max-height','flex-basis'])editorSidebar.style.removeProperty(prop);
}
function lockCurrentMenuSize(){
  const r=editorSidebar.getBoundingClientRect();
  // Dragging must never freeze the expanded menu's old tall box. Keep only
  // its width; content determines the height so no empty area remains below.
  for(const prop of ['width','min-width','max-width'])editorSidebar.style.setProperty(prop,r.width+'px','important');
  editorSidebar.style.removeProperty('min-height');
  editorSidebar.style.setProperty('height','fit-content','important');
  editorSidebar.style.setProperty('max-height','calc(100dvh - 8px)','important');
  editorSidebar.style.setProperty('flex-basis',r.width+'px','important');
}
let lastLayoutViewport='';
function reserveDefaultMenuSlot(){
  if(menuPlaceholder.isConnected||!editorSidebar.parentElement)return;
  const parent=editorSidebar.parentElement,r=editorSidebar.getBoundingClientRect(),style=getComputedStyle(editorSidebar);
  menuPlaceholder.dataset.orientation=orientation;
  if(orientation==='portrait'){
    menuPlaceholder.style.cssText='display:block;flex:0 0 68px;width:68px;height:1px;pointer-events:none';
  }else{
    menuPlaceholder.style.cssText=`display:block;width:${r.width}px;height:${r.height}px;max-width:620px;margin:${style.margin};pointer-events:none`;
  }
  parent.insertBefore(menuPlaceholder,editorSidebar);
}
function resetMenuToDefault(){
  editorSidebar.classList.remove('menu-detached');
  menuPlaceholder.remove();
  menuPlaceholder.style.cssText='';
  clearMenuSizeLock();
  for(const prop of ['position','left','top','right','bottom','margin','transform','zIndex'])editorSidebar.style[prop]='';
}
function updateSideLayout(){
  const detached=editorSidebar.classList.contains('menu-detached');
  if(orientation==='landscape'){
    if(!detached&&editorSidebar.parentElement!==boardColumn)boardColumn.append(editorSidebar);
    if(trayEl.parentElement!==boardColumn)boardColumn.append(trayEl);
    // Keep the balls directly below the table, independent of menu expansion.
    if(tableAndTip.nextElementSibling!==trayEl)boardColumn.insertBefore(trayEl,tableAndTip.nextElementSibling);
  }else{
    if(!detached&&editorSidebar.parentElement!==tableAndTip)tableAndTip.insertBefore(editorSidebar,tableWrap);
    if(trayEl.parentElement!==sideControls)sideControls.append(trayEl);
  }
}
function availableTableWidth(){
  const total=boardColumn.clientWidth,scW=sideControls.getBoundingClientRect().width,gap=parseFloat(getComputedStyle(tableAndTip).gap)||0;
  const menuSlot=editorSidebar.parentElement===tableAndTip&&editorSidebar.style.position!=='fixed'?editorSidebar:menuPlaceholder.parentElement===tableAndTip?menuPlaceholder:null;
  const menuW=menuSlot?menuSlot.getBoundingClientRect().width+gap:0;
  return Math.max(100,total-scW-gap-menuW);
}
function availableTableHeight(){
  const vh=window.visualViewport?window.visualViewport.height:document.documentElement.clientHeight,top=Math.max(0,tableAndTip.getBoundingClientRect().top);
  let reserve=16;
  if(orientation==='landscape')reserve+=trayEl.getBoundingClientRect().height+68+3+6;
  return Math.max(140,vh-top-reserve);
}
function layoutTable(force=false){
  const viewport=`${document.documentElement.clientWidth}:${document.documentElement.clientHeight}`;
  // Only a pinch on the same layout viewport is ignored. Rotation must always
  // update the entire board, even while the page remains zoomed in.
  if(force!==true&&viewport===lastLayoutViewport&&window.visualViewport&&Math.abs(window.visualViewport.scale-1)>.01)return;
  lastLayoutViewport=viewport;
  updateSideLayout();
  const wRatio=orientation==='landscape'?2:1,hRatio=orientation==='landscape'?1:2;
  const unit=Math.max(50,Math.min(availableTableWidth()/wRatio,availableTableHeight()/hRatio,310));
  const ratio=unit/310;fitScale=ratio;
  // A single canonical table is scaled as a whole: wood, pockets, diamonds,
  // cloth, balls, lines and notes retain exactly the desktop proportions.
  tableFrame.style.width=310*wRatio+'px';
  tableFrame.style.height=310*hRatio+'px';
  applyTableTransform();
  tableWrap.style.width=unit*wRatio+'px';
  tableWrap.style.height=unit*hRatio+'px';
  editorSidebar.style.maxHeight=Math.max(180,availableTableHeight())+'px';
  table.style.setProperty('--ball-size',Math.min(table.clientWidth,table.clientHeight)*16/274+'px');
  renderLines();
  clampMenuPosition();
}

function applyTableTransform(){
  tableFrame.style.transform=`translate(${tablePan.x}px,${tablePan.y}px) scale(${fitScale*tableZoom})`;
}
function resetTableZoom(){tableZoom=1;tablePan={x:0,y:0};pinchGesture=null;tableTouches.clear();applyTableTransform();renderLines()}
function pinchInfo(){
  const [a,b]=[...tableTouches.values()];
  return {distance:Math.hypot(b.x-a.x,b.y-a.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
}
tableWrap.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  tableTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(tableTouches.size===2){
    const p=pinchInfo();
    pinchGesture={distance:p.distance,center:p.center,zoom:tableZoom,pan:{...tablePan}};
    draggingBall=null;draggingLine=null;lineStart=null;lineDraft=null;groupDrag=null;ballPress=null;cancelBallHold();hideTargetGuide();
    e.preventDefault();e.stopPropagation();
  }
},{capture:true,passive:false});
tableWrap.addEventListener('pointermove',e=>{
  if(!tableTouches.has(e.pointerId))return;
  tableTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!pinchGesture||tableTouches.size<2)return;
  const p=pinchInfo(),nextZoom=Math.max(1,Math.min(3,pinchGesture.zoom*p.distance/Math.max(1,pinchGesture.distance)));
  const factor=nextZoom/pinchGesture.zoom;
  tableZoom=nextZoom;
  tablePan.x=pinchGesture.pan.x+(p.center.x-pinchGesture.center.x)+(pinchGesture.center.x-tableWrap.getBoundingClientRect().left)*(1-factor);
  tablePan.y=pinchGesture.pan.y+(p.center.y-pinchGesture.center.y)+(pinchGesture.center.y-tableWrap.getBoundingClientRect().top)*(1-factor);
  applyTableTransform();renderLines();e.preventDefault();e.stopPropagation();
},{capture:true,passive:false});
function endTableTouch(e){
  tableTouches.delete(e.pointerId);
  if(tableTouches.size<2)pinchGesture=null;
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])tableWrap.addEventListener(type,endTableTouch,{capture:true});
window.addEventListener('resize',layoutTable);
window.addEventListener('orientationchange',()=>setTimeout(layoutTable,50));
if(window.visualViewport)window.visualViewport.addEventListener('resize',layoutTable);

function isPhoneSized(){return Math.min(window.screen.width,window.screen.height)<=500}
function syncOrientationToDevice(){
  if(!isPhoneSized())return;
  const type=(screen.orientation&&screen.orientation.type)||(Math.abs(window.orientation||0)===90?'landscape':'portrait');
  if(type.startsWith('landscape'))setOrientation('landscape');
  else if(type.startsWith('portrait'))setOrientation('portrait');
}
if(screen.orientation)screen.orientation.addEventListener('change',syncOrientationToDevice);
window.addEventListener('orientationchange',()=>setTimeout(syncOrientationToDevice,50));
syncOrientationToDevice();
function ballEl(n,x,y,mini=false){
  const kind=ballKind(n),el=document.createElement('div'),striped=!['cue','ghost'].includes(kind)&&Number(kind)>8;
  el.className=`ball ${mini?'mini':''} ${kind==='cue'?'cue':''} ${kind==='ghost'?'ghost':''} ${striped?'striped':''}`;
  if(!['cue','ghost'].includes(kind))el.style.setProperty('--ball',colors[Number(kind)-1]);
  el.dataset.n=n;el.style.left=x+'%';el.style.top=y+'%';el.innerHTML=['cue','ghost'].includes(kind)?'':`<span>${kind}</span>`;el.setAttribute('aria-label',kind==='cue'?'手玉':kind==='ghost'?'イメージボール':`${kind}番ボール`);
  return el;
}
function renderBalls(){layer.innerHTML='';Object.entries(state).forEach(([n,p])=>layer.append(ballEl(n,p.x,p.y)))}
function updateBallPositions(){Object.entries(state).forEach(([n,p])=>{const el=layer.querySelector(`[data-n="${n}"]`);if(el){el.style.left=p.x+'%';el.style.top=p.y+'%'}})}
function freeSpot(){
  const r=table.getBoundingClientRect(),minDist=ballDiameter()*1.2,existing=Object.values(state);
  const fitsPx=(px,py)=>existing.every(b=>Math.hypot(b.x*r.width/100-px,b.y*r.height/100-py)>=minDist);
  const cx=r.width/2,cy=r.height/2;
  if(fitsPx(cx,cy))return{x:50,y:50};
  for(let ring=1;ring<=16;ring++){
    const radius=ring*(minDist*.85),steps=Math.max(8,ring*8);
    for(let i=0;i<steps;i++){
      const angle=(i/steps)*Math.PI*2,px=cx+radius*Math.cos(angle),py=cy+radius*Math.sin(angle);
      if(px<r.width*.05||px>r.width*.95||py<r.height*.03||py>r.height*.97)continue;
      if(fitsPx(px,py))return{x:px/r.width*100,y:py/r.height*100};
    }
  }
  return{x:50,y:50};
}
function renderTray(){
  const tray=document.querySelector('#trayBalls');tray.innerHTML='';
  ['cue','ghost',1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].filter(n=>['cue','ghost'].includes(String(n))||!state[n]).forEach(n=>{
    const ball=ballEl(n,0,0,true);let gesture=null,suppressClick=false;
    ball.tabIndex=0;ball.setAttribute('role','button');
    const place=p=>{const id=['cue','ghost'].includes(String(n))?repeatBallId(String(n)):String(n);state[id]=p;render();markUnsaved()};
    const cleanup=()=>{gesture?.preview?.remove();gesture=null};
    ball.onclick=()=>{if(suppressClick){suppressClick=false;return}place(freeSpot())};
    ball.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place(freeSpot())}};
    ball.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;suppressClick=false;e.preventDefault();gesture={id:e.pointerId,x:e.clientX,y:e.clientY};ball.setPointerCapture(e.pointerId)});
    ball.addEventListener('pointermove',e=>{
      if(!gesture||gesture.id!==e.pointerId)return;
      if(!gesture.preview&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<5)return;
      if(!gesture.preview){gesture.preview=ballEl(n,0,0);gesture.preview.classList.add('tray-drag-preview');document.body.append(gesture.preview)}
      e.preventDefault();
      const lift=e.pointerType==='touch'?28:0,preview=gesture.preview,r=table.getBoundingClientRect();
      const inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
      const destination=inside?ballPoint(point({clientX:e.clientX,clientY:e.clientY-lift})):null;
      // Preview, crosshair and drop all use the same clamped/snapped table point.
      preview.style.left=(destination?r.left+destination.x*r.width/100:e.clientX)+'px';
      preview.style.top=(destination?r.top+destination.y*r.height/100:e.clientY-lift)+'px';
      preview.style.width=preview.style.height=ballDiameter()+'px';
      if(destination)showTargetGuide(destination);else hideTargetGuide();
    });
    ball.addEventListener('pointerup',e=>{
      if(!gesture||gesture.id!==e.pointerId)return;
      const moved=!!gesture.preview,r=table.getBoundingClientRect();suppressClick=moved;cleanup();
      hideTargetGuide();if(moved&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){const lift=e.pointerType==='touch'?28:0;place(ballPoint(point({clientX:e.clientX,clientY:e.clientY-lift})))}
    });
    ball.addEventListener('pointercancel',()=>{suppressClick=true;hideTargetGuide();cleanup()});
    ball.addEventListener('lostpointercapture',cleanup);tray.append(ball);
  });
}
function ballDiameter(){const r=table.getBoundingClientRect();return Math.min(r.width,r.height)*16/274}
function ballPoint(p,exclude=null){
  const r=table.getBoundingClientRect(),d=ballDiameter(),rx=d/2/r.width*100,ry=d/2/r.height*100;
  const clamp=q=>({x:Math.max(rx,Math.min(100-rx,q.x)),y:Math.max(ry,Math.min(100-ry,q.y))});
  p=clamp(p);let best=d*.2,result=p;
  Object.entries(state).forEach(([n,b])=>{
    if(String(n)===String(exclude))return;
    const dx=(p.x-b.x)*r.width/100,dy=(p.y-b.y)*r.height/100,len=Math.hypot(dx,dy),gap=Math.abs(len-d);
    if(len===0||gap>=best)return;
    const q={x:b.x+dx/len*d/r.width*100,y:b.y+dy/len*d/r.height*100};
    if(q.x<rx||q.x>100-rx||q.y<ry||q.y>100-ry)return;
    best=gap;result=q;
  });return result;
}
function renderNotes(){
  notesLayer.innerHTML='';notes.forEach((note,i)=>{
    const el=document.createElement('div');el.className='table-note';el.textContent=note.text;el.style.left=note.x+'%';el.style.top=note.y+'%';el.style.color=note.color||'#ffe15b';el.style.background=note.background==='transparent'?'transparent':note.background||'#07110d';el.style.fontFamily=noteFonts[note.font]||noteFonts.gothic;el.style.fontSize=(Number(note.size)||18)+'px';
    el.addEventListener('pointerdown',e=>{e.stopPropagation();if(mode==='erase'){notes.splice(i,1);renderNotes();markUnsaved();return}el.setPointerCapture(e.pointerId)});
    el.addEventListener('pointermove',e=>{if(!el.hasPointerCapture(e.pointerId))return;const p=point(e);note.x=p.x;note.y=p.y;el.style.left=p.x+'%';el.style.top=p.y+'%'});
    el.addEventListener('pointerup',e=>{if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);markUnsaved()});
    notesLayer.append(el);
  });
}
function point(e){const r=table.getBoundingClientRect();return{x:Math.max(2,Math.min(98,(e.clientX-r.left)/r.width*100)),y:Math.max(2,Math.min(98,(e.clientY-r.top)/r.height*100))}}
function nearestBall(p,maxPx=36,exclude=null){
  const r=table.getBoundingClientRect();let found=null,best=maxPx;
  Object.entries(state).forEach(([n,b])=>{if(String(n)===String(exclude))return;const d=Math.hypot((b.x-p.x)*r.width/100,(b.y-p.y)*r.height/100);if(d<best){best=d;found=n}});return found;
}
function syncBallLines(n){const b=state[n];if(!b)return;lines.forEach(l=>{if(String(l.startBall)===String(n)){l.x1=b.x;l.y1=b.y}if(String(l.endBall)===String(n)){l.x2=b.x;l.y2=b.y}})}
function visibleEnds(l){
  const r=table.getBoundingClientRect(),dx=(l.x2-l.x1)*r.width/100,dy=(l.y2-l.y1)*r.height/100,len=Math.hypot(dx,dy)||1,startTrim=l.startBall?ballDiameter()/2:0,endTrim=l.endBall?ballDiameter()/2:0;
  return{x1:l.x1+(dx/len)*startTrim/r.width*100,y1:l.y1+(dy/len)*startTrim/r.height*100,x2:l.x2-(dx/len)*endTrim/r.width*100,y2:l.y2-(dy/len)*endTrim/r.height*100};
}
function lineLengthPx(l){const r=table.getBoundingClientRect(),v=visibleEnds(l);return Math.hypot((v.x2-v.x1)*r.width/100,(v.y2-v.y1)*r.height/100)}
function lineMarkup(l,i,draft=false){
  const v=visibleEnds(l),len=lineLengthPx(l),isArrow=l.type!=='plain',color=l.color||ballColor(l.startBall),width=l.width||2,markerId=`arrow-${draft?'draft':i}`,marker=isArrow&&len>14?` marker-end="url(#${markerId})"`:'',selected=!draft&&selectedLine===i?' selected-line':'';
  const markerSize=Math.max(5,Math.min(16,Math.round(5+width*1.6)));
  const markerDef=isArrow&&len>14?`<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="${markerSize}" markerHeight="${markerSize}" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker></defs>`:'';
  const visual=len>3?`${markerDef}<line data-i="${i}" style="--line-color:${color};--line-width:${width}" class="${isArrow?'shot-line':'plain-line'}${selected}${draft?' draft-line':''}" x1="${v.x1}%" y1="${v.y1}%" x2="${v.x2}%" y2="${v.y2}%"${marker}/>`:'';
  const hit=draft||len<=3?'':`<line data-i="${i}" class="line-hit" x1="${v.x1}%" y1="${v.y1}%" x2="${v.x2}%" y2="${v.y2}%"/>`;return `<g>${visual}${hit}</g>`;
}
function renderLines(){let html=defs+lines.map((l,i)=>lineMarkup(l,i)).join('');if(lineDraft)html+=lineMarkup(lineDraft,-1,true);svg.innerHTML=html;renderGhosts()}
// Positions use screen distances so portrait, landscape and scaled tables agree.
function ghostPosition(l){
  if(!l.ghostEnabled||l.ghostDismissed||l.type==='plain'||!state[l.startBall]||!/^([1-9]|1[0-5])$/.test(String(l.startBall)))return null;
  const r=table.getBoundingClientRect(),dx=(l.x2-l.x1)*r.width/100,dy=(l.y2-l.y1)*r.height/100,len=Math.hypot(dx,dy);
  if(len<1)return null;
  const along=l.ghostOffset?.along??-1,side=l.ghostOffset?.side??0,d=ballDiameter();
  return {x:l.x1+(dx/len*along-dy/len*side)*d/r.width*100,y:l.y1+(dy/len*along+dx/len*side)*d/r.height*100};
}
function renderGhosts(){
  layer.querySelectorAll('.linked-ghost').forEach(el=>el.remove());
  [...lines,...(lineDraft?[lineDraft]:[])].forEach(l=>{
    const p=ghostPosition(l);if(!p)return;
    const el=ballEl('ghost',p.x,p.y);el.classList.add('linked-ghost');el.removeAttribute('data-n');
    const dismiss=()=>{ghostDrag=null;l.ghostDismissed=true;renderLines();markUnsaved()};
    el.addEventListener('pointerdown',e=>{
      e.stopPropagation();if(!e.isPrimary||e.button!==0)return;if(mode==='erase'){dismiss();return}
      ghostDrag={l,id:e.pointerId,x:e.clientX,y:e.clientY,p,moved:false};
      if(e.pointerType==='touch'){
        const hold={id:e.pointerId,x:e.clientX,y:e.clientY};
        hold.timer=setTimeout(()=>{if(ballHold===hold){cancelBallHold();dismiss()}},600);ballHold=hold;
      }
    });
    el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();dismiss()});layer.append(el);
  });
}
document.addEventListener('pointermove',e=>{
  const g=ghostDrag;if(!g||g.id!==e.pointerId)return;
  const mx=e.clientX-g.x,my=e.clientY-g.y;
  if(!g.moved&&Math.hypot(mx,my)<=5)return;
  g.moved=true;cancelBallHold();table.setPointerCapture(e.pointerId);e.preventDefault();
  const r=table.getBoundingClientRect(),l=g.l,d=ballDiameter();
  const dx=(l.x2-l.x1)*r.width/100,dy=(l.y2-l.y1)*r.height/100,len=Math.hypot(dx,dy);
  if(len<1)return;
  const x=Math.max(d/2,Math.min(r.width-d/2,g.p.x*r.width/100+mx))-l.x1*r.width/100;
  const y=Math.max(d/2,Math.min(r.height-d/2,g.p.y*r.height/100+my))-l.y1*r.height/100;
  l.ghostOffset={along:(x*dx+y*dy)/len/d,side:(-x*dy+y*dx)/len/d};
  renderGhosts();
},{passive:false});
function finishGhostDrag(e){if(ghostDrag&&(!e||ghostDrag.id===e.pointerId)){if(ghostDrag.moved)markUnsaved();ghostDrag=null;cancelBallHold()}}
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,finishGhostDrag);
window.addEventListener('blur',()=>finishGhostDrag());
const ghostToggle=document.querySelector('#ghostToggle');
ghostToggle.onclick=()=>{
  ghostEnabled=!ghostEnabled;ghostToggle.textContent='イメージボール '+(ghostEnabled?'ON':'OFF');
  ghostToggle.setAttribute('aria-pressed',String(ghostEnabled));
  if(lines[selectedLine]){lines[selectedLine].ghostEnabled=ghostEnabled;lines[selectedLine].ghostDismissed=false;renderLines();markUnsaved()}
};
function renderTip(){if(tip){tipMark.hidden=false;tipMark.style.left=(tip.x*100)+'%';tipMark.style.top=(tip.y*100)+'%'}else{tipMark.hidden=true}}
function render(){cancelBallHold();renderBalls();renderLines();renderTray();renderNotes();renderTip()}
function removeBall(n){delete state[n];lines=lines.filter(l=>String(l.startBall)!==String(n)&&String(l.endBall)!==String(n));selectedLine=-1;render();markUnsaved()}
function removeLine(i){if(i<0||i>=lines.length)return;lines.splice(i,1);selectedLine=-1;renderLines();markUnsaved()}

function startGroupDrag(e){
  groupDrag={startX:e.clientX,startY:e.clientY,state:structuredClone(state),lines:structuredClone(lines),notes:structuredClone(notes)};
  table.setPointerCapture(e.pointerId);
}
function moveGroupDrag(e){
  if(!groupDrag)return;
  const r=table.getBoundingClientRect();
  let dx=(e.clientX-groupDrag.startX)/r.width*100,dy=(e.clientY-groupDrag.startY)/r.height*100;
  const pts=[];Object.values(groupDrag.state).forEach(p=>pts.push(p));groupDrag.lines.forEach(l=>{pts.push({x:l.x1,y:l.y1});pts.push({x:l.x2,y:l.y2})});groupDrag.notes.forEach(n=>pts.push({x:n.x,y:n.y}));
  if(pts.length){
    const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
    dx=Math.max(-minX,Math.min(100-maxX,dx));dy=Math.max(-minY,Math.min(100-maxY,dy));
  }
  Object.keys(groupDrag.state).forEach(n=>{state[n]={x:groupDrag.state[n].x+dx,y:groupDrag.state[n].y+dy}});
  lines.forEach((l,i)=>{const o=groupDrag.lines[i];if(!o)return;l.x1=o.x1+dx;l.y1=o.y1+dy;l.x2=o.x2+dx;l.y2=o.y2+dy});
  notes.forEach((n,i)=>{const o=groupDrag.notes[i];if(!o)return;n.x=o.x+dx;n.y=o.y+dy});
  updateBallPositions();renderLines();renderNotes();
}
function endGroupDrag(){if(groupDrag){groupDrag=null;markUnsaved()}}

table.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0)return;
  e.preventDefault();
  if(e.target.closest('.table-note'))return;
  const ball=e.target.closest('.ball')||(mode==='move'?layer.querySelector(`[data-n="${nearestBall(point(e),22)}"]`):null);
  if(ball)startBallHold(e,ball.dataset.n);
  if(mode==='move'&&groupMoveMode){startGroupDrag(e);return}
  if(ball&&mode!=='erase'){selectedLine=-1;draggingBall=ball.dataset.n;ballPress={x:e.clientX,y:e.clientY,origin:{...state[draggingBall]},touch:e.pointerType==='touch'};ballMoved=false;table.setPointerCapture(e.pointerId);renderLines();return}
  if(mode==='erase'&&ball)return;
  if(mode==='line'||mode==='plain'){
    const p=point(e),startBall=ball?.dataset.n||nearestBall(p,42),a=startBall?state[startBall]:p;lineStart={...p,ball:startBall};showTargetGuide(p);
    const autoColor=activeLineColor==='auto',colorBall=startBall||nearestBall(p,Infinity);lineDraft={x1:a.x,y1:a.y,x2:p.x,y2:p.y,type:mode==='plain'?'plain':'arrow',startBall:startBall||null,endBall:null,color:autoColor?ballColor(colorBall):activeLineColor,autoColor,width:activeLineWidth,ghostEnabled:mode==='line'&&ghostEnabled};table.setPointerCapture(e.pointerId);renderLines();return;
  }
  if(mode==='move'){selectedLine=-1;renderLines()}
});
table.addEventListener('pointermove',e=>{
  if(groupDrag){moveGroupDrag(e);return}
  if(draggingBall){e.preventDefault();ballMoved=true;const r=table.getBoundingClientRect();state[draggingBall]=ballPoint({x:ballPress.origin.x+(e.clientX-ballPress.x)/r.width*100,y:ballPress.origin.y+(e.clientY-ballPress.y-(ballPress.touch?28:0))/r.height*100},draggingBall);syncBallLines(draggingBall);updateBallPositions();showTargetGuide(state[draggingBall],draggingBall);if(lines.length)renderLines();return}
  if(lineStart){const p=point(e),endBall=nearestBall(p,42,lineStart.ball),b=endBall?state[endBall]:p;lineDraft.x2=b.x;lineDraft.y2=b.y;lineDraft.endBall=endBall||null;showTargetGuide(b);renderLines();return}
  if(!draggingLine)return;e.preventDefault();const p=point(e),l=lines[draggingLine.i],o=draggingLine.original;showTargetGuide(p);
  if(draggingLine.kind==='start'){
    l.startBall=null;l.x1=p.x;l.y1=p.y;
  }
  else if(draggingLine.kind==='end'){
    l.endBall=null;l.x2=p.x;l.y2=p.y;
  }
  else{
    if(o.startBall)l.startBall=null;if(o.endBall)l.endBall=null;
    const xs=[o.x1,o.x2],ys=[o.y1,o.y2];
    let dx=p.x-draggingLine.start.x,dy=p.y-draggingLine.start.y;
    dx=Math.max(-Math.min(...xs),Math.min(100-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(100-Math.max(...ys),dy));
    l.x1=o.x1+dx;l.y1=o.y1+dy;l.x2=o.x2+dx;l.y2=o.y2+dy;
  }renderLines();
});
table.addEventListener('pointerup',()=>{
  if(groupDrag){endGroupDrag();return}
  if(draggingBall){draggingBall=null;ballPress=null;hideTargetGuide();if(ballMoved)markUnsaved();return}
  if(lineStart){if(lineDraft&&lineLengthPx(lineDraft)>8){lines.push({...lineDraft});selectedLine=lines.length-1;markUnsaved()}lineStart=null;lineDraft=null;hideTargetGuide();renderLines();return}
  if(draggingLine){
    const l=lines[draggingLine.i];
    draggingLine=null;hideTargetGuide();if(lineLengthPx(l)<5)removeLine(selectedLine);else{renderLines();markUnsaved()}
  }
});
table.addEventListener('pointercancel',()=>{draggingBall=null;draggingLine=null;lineStart=null;lineDraft=null;groupDrag=null;hideTargetGuide();renderLines()});

svg.addEventListener('pointerdown',e=>{
  if(e.target.dataset.i===undefined)return;e.stopPropagation();const i=Number(e.target.dataset.i);if(mode==='erase'){removeLine(i);return}if(!['move','line','plain'].includes(mode))return;
  if(groupMoveMode){startGroupDrag(e);return}
  selectedLine=i;const p=point(e),l=lines[i],v=visibleEnds(l),r=table.getBoundingClientRect(),d1=Math.hypot((p.x-v.x1)*r.width/100,(p.y-v.y1)*r.height/100),d2=Math.hypot((p.x-v.x2)*r.width/100,(p.y-v.y2)*r.height/100),kind=Math.min(d1,d2)<=26?(d1<d2?'start':'end'):'move';
  const original={...l};draggingLine={i,kind,start:p,original};table.setPointerCapture(e.pointerId);renderLines();
});
table.addEventListener('contextmenu',e=>{
  const ball=e.target.closest('.ball');if(!ball||ball.classList.contains('linked-ghost'))return;
  e.preventDefault();e.stopPropagation();
  // Mobile context menus must not bypass the hold duration or movement cancellation.
  if(e.pointerType==='mouse'||(!e.pointerType&&Date.now()-lastTouchTime>1500)){
    cancelBallHold();draggingBall=null;ballPress=null;removeBall(ball.dataset.n);
  }
});

function updateTip(e){
  const r=cueDiagram.getBoundingClientRect();let x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  const dx=x-.5,dy=y-.5,d=Math.hypot(dx,dy);if(d>.46){const k=.46/d;x=.5+dx*k;y=.5+dy*k}
  tip={x,y};renderTip();markUnsaved();
}
cueDiagram.addEventListener('pointerdown',e=>{tipDragging=true;cueDiagram.setPointerCapture(e.pointerId);updateTip(e)});
cueDiagram.addEventListener('pointermove',e=>{if(tipDragging)updateTip(e)});
cueDiagram.addEventListener('pointerup',()=>{tipDragging=false});
cueDiagram.addEventListener('pointercancel',()=>{tipDragging=false});
document.querySelector('#tipClearBtn').onclick=()=>{tip=null;renderTip();markUnsaved()};

function setMode(next,showHint=true){
  mode=next;selectedLine=-1;renderLines();
  if(next!=='move')setGroupMoveMode(false);else refreshMoveButtons();
  drawBtn.classList.toggle('active',next==='line'||next==='plain');
  const hint=document.querySelector('#hint');hint.textContent=mode==='line'?'球から球へなぞると自動接続':mode==='plain'?'球から球へなぞると自動接続':mode==='erase'?'球または線をタップして消去':'球をドラッグ。線の端をつかむと伸縮';hint.style.opacity=1;setTimeout(()=>hint.style.opacity=0,1800);
  if(!showHint)hint.style.opacity=0;
}
document.querySelectorAll('.tools [data-mode]').forEach(btn=>btn.onclick=()=>{colorPanel.hidden=true;setMode(btn.dataset.mode)});
function refreshMoveButtons(){
  document.querySelectorAll('.tools [data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode&&!groupMoveMode));
  const groupBtn=document.querySelector('#groupMoveBtn');groupBtn.classList.toggle('active',groupMoveMode);groupBtn.setAttribute('aria-pressed',String(groupMoveMode));
}
function setGroupMoveMode(value){groupMoveMode=value;refreshMoveButtons()}

const colorPanel=document.querySelector('#lineColorPanel'),drawBtn=document.querySelector('#drawBtn'),swatches=document.querySelector('#lineColorSwatches'),autoColorBtn=document.querySelector('#autoColorBtn'),lineColorPicker=document.querySelector('#lineColorPicker'),colorArrowBtn=document.querySelector('#colorArrowBtn'),colorPlainBtn=document.querySelector('#colorPlainBtn');
document.body.append(colorPanel);
function refreshColorChoice(){autoColorBtn.classList.toggle('active',activeLineChoice==='auto');swatches.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.choice===activeLineChoice));colorArrowBtn.classList.toggle('active',mode==='line');colorPlainBtn.classList.toggle('active',mode==='plain')}
function usePaletteMode(){setMode(paletteLineType,false);refreshColorChoice()}
[['cue','白'],...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(n=>[n,n])].forEach(([n,label])=>{const kind=ballKind(n),striped=kind!=='cue'&&Number(kind)>8;const b=document.createElement('button');b.type='button';b.className=`color-swatch ball${kind==='cue'?' cue':''}${striped?' striped':''}`;if(kind!=='cue')b.style.setProperty('--ball',colors[Number(kind)-1]);b.innerHTML=kind==='cue'?'':`<span>${kind}</span>`;b.dataset.choice=String(n);b.dataset.color=ballColor(n);b.title=`${label}の色`;b.setAttribute('aria-label',`${label}の色`);b.onclick=()=>{activeLineColor=b.dataset.color;activeLineChoice=b.dataset.choice;usePaletteMode();refreshColorChoice();colorPanel.hidden=true};swatches.append(b)});
function toggleDrawType(next){paletteLineType=next;if(mode===next)setMode('move',false);else setMode(next,false);refreshColorChoice()}
colorArrowBtn.onclick=()=>toggleDrawType('line');colorPlainBtn.onclick=()=>toggleDrawType('plain');
const lineWidthRange=document.querySelector('#lineWidthRange'),lineWidthValue=document.querySelector('#lineWidthValue');
lineWidthRange.oninput=()=>{activeLineWidth=Number(lineWidthRange.value);lineWidthValue.textContent=activeLineWidth};
const groupMoveBtn=document.querySelector('#groupMoveBtn');
groupMoveBtn.onclick=()=>{
  colorPanel.hidden=true;if(mode!=='move')setMode('move',false);
  setGroupMoveMode(!groupMoveMode);
  const hint=document.querySelector('#hint');hint.textContent=groupMoveMode?'まとめて移動：どこをつかんでも全部一緒に動く':'球をドラッグ。線の端をつかむと伸縮';hint.style.opacity=1;setTimeout(()=>hint.style.opacity=0,1800);
};
autoColorBtn.onclick=()=>{activeLineColor='auto';activeLineChoice='auto';usePaletteMode();refreshColorChoice();colorPanel.hidden=true};lineColorPicker.onchange=()=>{activeLineColor=lineColorPicker.value;activeLineChoice='custom';usePaletteMode();refreshColorChoice();colorPanel.hidden=true};refreshColorChoice();
drawBtn.onclick=()=>{
  const opening=colorPanel.hidden;
  if(['line','plain'].includes(mode))paletteLineType=mode;
  colorPanel.hidden=!colorPanel.hidden;
  if(opening&&!['line','plain'].includes(mode))setMode(paletteLineType,false);
  refreshColorChoice();
};
document.querySelector('#lineColorClose').onclick=()=>{colorPanel.hidden=true};

/* Drag the settings header without changing any input or drawing mode. */
let paletteDrag=null;
colorPanel.style.setProperty('z-index','6000','important');
const paletteHeader=colorPanel.querySelector('.color-panel-head');
paletteHeader.style.touchAction='none';
paletteHeader.style.cursor='grab';
paletteHeader.style.userSelect='none';
function clampPalette(){
  if(colorPanel.hidden||!colorPanel.dataset.moved)return;
  const vv=window.visualViewport,r=colorPanel.getBoundingClientRect();
  const x=vv?.offsetLeft||0,y=vv?.offsetTop||0,w=vv?.width||innerWidth,h=vv?.height||innerHeight;
  colorPanel.style.setProperty('left',Math.max(x+6,Math.min(r.left,x+w-r.width-6))+'px','important');
  colorPanel.style.setProperty('top',Math.max(y+6,Math.min(r.top,y+h-r.height-6))+'px','important');
}
paletteHeader.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||e.target.closest('button,input,select'))return;
  const r=colorPanel.getBoundingClientRect();
  paletteDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};
  e.preventDefault();paletteHeader.setPointerCapture(e.pointerId);
});
paletteHeader.addEventListener('pointermove',e=>{
  if(!paletteDrag||paletteDrag.id!==e.pointerId)return;
  e.preventDefault();colorPanel.dataset.moved='true';
  colorPanel.style.setProperty('inset','auto','important');
  colorPanel.style.setProperty('transform','none','important');
  colorPanel.style.setProperty('margin','0','important');
  colorPanel.style.setProperty('left',paletteDrag.left+e.clientX-paletteDrag.x+'px','important');
  colorPanel.style.setProperty('top',paletteDrag.top+e.clientY-paletteDrag.y+'px','important');
  clampPalette();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])paletteHeader.addEventListener(event,()=>{paletteDrag=null});
window.addEventListener('resize',clampPalette);
window.visualViewport?.addEventListener('resize',clampPalette);

document.addEventListener('pointerdown',e=>{if(colorPanel.hidden||colorPanel.contains(e.target)||e.target.closest('#drawBtn'))return;colorPanel.hidden=true});

const memoDialogEl=document.querySelector('#memoDialog'),memoInput=document.querySelector('#memo'),memoColor=document.querySelector('#memoColor'),memoBackground=document.querySelector('#memoBackground'),memoTransparent=document.querySelector('#memoTransparent'),memoFont=document.querySelector('#memoFont'),memoSize=document.querySelector('#memoSize');
const guideDialog=document.querySelector('#guideDialog');
function setTopMenu(activeId){document.querySelectorAll('.primary-menu button').forEach(b=>b.classList.toggle('active',b.id===activeId))}
document.querySelector('#guideBtn').onclick=()=>{setTopMenu('guideBtn');if(!guideDialog.open)guideDialog.showModal()};
document.querySelector('#guideCloseBtn').onclick=()=>guideDialog.close();
guideDialog.addEventListener('close',()=>setTopMenu(null));
document.querySelector('#memoBtn').onclick=()=>{memoInput.value='';memoTransparent.checked=false;memoBackground.disabled=false;memoDialogEl.showModal()};
memoTransparent.onchange=()=>{memoBackground.disabled=memoTransparent.checked};
memoDialogEl.addEventListener('close',()=>{const text=memoInput.value.trim();if(memoDialogEl.returnValue==='ok'&&text){const offset=(notes.length%5)*5;notes.push({text,color:memoColor.value,background:memoTransparent.checked?'transparent':memoBackground.value,font:memoFont.value,size:Number(memoSize.value),x:50+offset,y:50+offset});renderNotes();markUnsaved()}memoInput.value=''});
document.querySelector('#resetBtn').onclick=clearTable;
document.querySelector('#zoomResetBtn').onclick=resetTableZoom;

function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawCanvasBall(ctx,n,x,y,r){
  const kind=ballKind(n);
  if(kind==='ghost'){ctx.save();ctx.strokeStyle='#ff4040';ctx.lineWidth=2;ctx.lineCap='round';ctx.setLineDash([1,3]);ctx.beginPath();ctx.arc(x,y,r-1,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();return}
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();const base=ctx.createRadialGradient(x-r*.38,y-r*.42,r*.04,x,y,r*1.12);
  if(kind==='cue'){base.addColorStop(0,'#fff');base.addColorStop(.72,'#fffdf2');base.addColorStop(1,'#b9b28f')}
  else if(Number(kind)>8){base.addColorStop(0,'#fff');base.addColorStop(.72,'#fffdf4');base.addColorStop(1,'#aaa58e')}
  else{const color=colors[Number(kind)-1];base.addColorStop(0,'#fff');base.addColorStop(.13,color);base.addColorStop(.7,color);base.addColorStop(1,'#111')}
  ctx.fillStyle=base;ctx.fillRect(x-r,y-r,r*2,r*2);if(kind!=='cue'&&Number(kind)>8){ctx.fillStyle=colors[Number(kind)-1];ctx.fillRect(x-r,y-r*.48,r*2,r*.96)}
  const shade=ctx.createRadialGradient(x-r*.25,y-r*.35,0,x,y,r);shade.addColorStop(.45,'transparent');shade.addColorStop(1,'#0008');ctx.fillStyle=shade;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  ctx.strokeStyle='#ffffffbd';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r-.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-r*.32,y-r*.38,r*.2,r*.1,-.45,0,Math.PI*2);ctx.fill();
  if(kind!=='cue'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r*.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.font=`bold ${r*.72}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(kind,x,y+.3)}
}
function drawExportLine(ctx,l,clothX,clothY,clothW,clothH){
  const v=visibleEnds(l),x1=clothX+clothW*v.x1/100,y1=clothY+clothH*v.y1/100,x2=clothX+clothW*v.x2/100,y2=clothY+clothH*v.y2/100,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<3)return;
  const color=l.color||ballColor(l.startBall),width=l.width||2;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=width;ctx.setLineDash(l.type==='plain'?[]:[8,5]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
  if(l.type!=='plain'&&len>14){const a=Math.atan2(dy,dx),legLen=6*width;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-legLen*Math.cos(a-.48),y2-legLen*Math.sin(a-.48));ctx.lineTo(x2-legLen*Math.cos(a+.48),y2-legLen*Math.sin(a+.48));ctx.closePath();ctx.fill()}
}
function drawExportNotes(ctx,clothX,clothY,clothW,clothH){
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';notes.forEach(note=>{
    const x=clothX+clothW*note.x/100,y=clothY+clothH*note.y/100,size=Number(note.size)||18,family=noteFonts[note.font]||noteFonts.gothic,rows=note.text.split('\n'),lineHeight=size*1.35;
    ctx.font=`900 ${size}px ${family}`;
    const textWidth=Math.max(...rows.map(row=>ctx.measureText(row).width),1),boxWidth=textWidth+14,boxHeight=rows.length*lineHeight+8;
    if(note.background!=='transparent'){ctx.fillStyle=note.background||'#07110d';roundedRect(ctx,x-boxWidth/2,y-boxHeight/2,boxWidth,boxHeight,5);ctx.fill()}
    rows.forEach((row,i)=>{const ty=y+(i-(rows.length-1)/2)*lineHeight;ctx.strokeStyle='#07110d';ctx.lineWidth=3;ctx.strokeText(row,x,ty);ctx.fillStyle=note.color||'#ffe15b';ctx.fillText(row,x,ty)})
  });
}
function drawSidePockets(ctx,frameRect){
  ctx.fillStyle='#020202';
  for(const selector of ['.p3','.p4']){
    const el=tableFrame.querySelector(selector),r=el.getBoundingClientRect(),x=r.left-frameRect.left,y=r.top-frameRect.top,w=r.width,h=r.height,first=selector==='.p3';
    ctx.beginPath();
    if(orientation==='portrait'&&first){ctx.moveTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+h/2,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h/2);ctx.quadraticCurveTo(x,y,x+h/2,y)}
    else if(orientation==='portrait'){ctx.moveTo(x,y);ctx.lineTo(x+w-h/2,y);ctx.quadraticCurveTo(x+w,y,x+w,y+h/2);ctx.quadraticCurveTo(x+w,y+h,x+w-h/2,y+h);ctx.lineTo(x,y+h)}
    else if(first){ctx.moveTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w,y+h/2);ctx.quadraticCurveTo(x+w,y,x+w/2,y);ctx.quadraticCurveTo(x,y,x,y+h/2)}
    else{ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h/2);ctx.quadraticCurveTo(x+w,y+h,x+w/2,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h/2)}
    ctx.closePath();ctx.fill();
  }
}
function drawWoodFrame(ctx,w,h){
  roundedRect(ctx,0,0,w,h,16);ctx.save();ctx.clip();
  for(let y=-2;y<h;y+=7){ctx.fillStyle='#934526';ctx.fillRect(0,y,w,2);ctx.fillStyle='#a9522e';ctx.fillRect(0,y+2,w,3);ctx.fillStyle='#7d351f';ctx.fillRect(0,y+5,w,2)}
  ctx.restore();
  ctx.save();roundedRect(ctx,1,1,w-2,h-2,15);ctx.strokeStyle='#6d2d1c';ctx.lineWidth=2;ctx.stroke();
  roundedRect(ctx,3.5,3.5,w-7,h-7,13);ctx.strokeStyle='#b9633c';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function downloadImage(){
  // Export the same canonical design at full resolution on every device.
  const displayTransform=tableFrame.style.transform;
  tableFrame.style.transform='none';
  try{
  const frameRect=tableFrame.getBoundingClientRect(),clothRect=table.getBoundingClientRect(),scale=3,frameW=frameRect.width,frameH=frameRect.height,extra=86,width=frameW+extra,height=frameH;
  const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=Math.round(width*scale);c.height=Math.round(height*scale);ctx.scale(scale,scale);
  const cx=clothRect.left-frameRect.left,cy=clothRect.top-frameRect.top,cw=clothRect.width,ch=clothRect.height;
  drawWoodFrame(ctx,frameW,frameH);
  ctx.save();roundedRect(ctx,cx,cy,cw,ch,2);ctx.clip();const clothGrad=ctx.createLinearGradient(cx,0,cx+cw,0);clothGrad.addColorStop(0,'#08ae7d');clothGrad.addColorStop(1,'#08aa7a');ctx.fillStyle=clothGrad;ctx.fillRect(cx,cy,cw,ch);ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=.6;ctx.setLineDash([2,2]);
  const xDivisions=orientation==='landscape'?8:4,yDivisions=orientation==='landscape'?4:8;
  for(let i=1;i<xDivisions;i++){ctx.beginPath();ctx.moveTo(cx+cw*i/xDivisions,cy);ctx.lineTo(cx+cw*i/xDivisions,cy+ch);ctx.stroke()}for(let i=1;i<yDivisions;i++){ctx.beginPath();ctx.moveTo(cx,cy+ch*i/yDivisions);ctx.lineTo(cx+cw,cy+ch*i/yDivisions);ctx.stroke()}ctx.setLineDash([]);lines.forEach(l=>drawExportLine(ctx,l,cx,cy,cw,ch));Object.entries(state).forEach(([n,p])=>drawCanvasBall(ctx,n,cx+cw*p.x/100,cy+ch*p.y/100,ballDiameter()/2));lines.forEach(l=>{const p=ghostPosition(l);if(p)drawCanvasBall(ctx,'ghost',cx+cw*p.x/100,cy+ch*p.y/100,ballDiameter()/2)});drawExportNotes(ctx,cx,cy,cw,ch);ctx.restore();
  const horizontalDots=orientation==='landscape'?7:3,verticalDots=orientation==='landscape'?3:7;ctx.fillStyle='#fff';for(let i=1;i<=horizontalDots;i++)for(const y of [10,frameH-10]){ctx.beginPath();ctx.arc(52+(frameW-104)*(i-.5)/horizontalDots,y,2,0,Math.PI*2);ctx.fill()}for(let i=1;i<=verticalDots;i++)for(const x of [10,frameW-10]){ctx.beginPath();ctx.arc(x,52+(frameH-104)*(i-.5)/verticalDots,2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#020202';ctx.strokeStyle='#49180f';ctx.lineWidth=2;for(const [x,y] of [[18,18],[frameW-18,18],[18,frameH-18],[frameW-18,frameH-18]]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);roundedRect(ctx,-10,-10,20,20,7);ctx.fill();ctx.stroke();ctx.restore()}drawSidePockets(ctx,frameRect);
  ctx.fillStyle='#151b20';ctx.fillRect(frameW,0,extra,frameH);ctx.fillStyle='#d5aa58';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('撞点',frameW+extra/2,24);
  const bx=frameW+extra/2,by=67,br=27;drawCanvasBall(ctx,'cue',bx,by,br);
  if(tip){ctx.beginPath();ctx.arc(bx-br+tip.x*br*2,by-br+tip.y*br*2,3.5,0,Math.PI*2);ctx.fillStyle='#e6382e';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke()}
  const a=document.createElement('a');a.download=(currentTitle||'ビリヤード配置')+'.png';a.href=c.toDataURL('image/png');a.click();showSaveToast('画像のダウンロードを開始しました');
  }finally{tableFrame.style.transform=displayTransform}
}
function formatSavedTime(value){if(!value)return'';if(/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(String(value)))return `${value}（時刻記録なし）`;const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);return d.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
let saveToastTimer;
function positionSaveToast(){
  const toast=document.querySelector('#saveToast');if(!toast||toast.hidden)return;
  const r=table.getBoundingClientRect();
  toast.style.left=(r.left+r.width/2)+'px';toast.style.top=(r.top+r.height/2)+'px';
  toast.style.maxWidth=Math.max(80,r.width-12)+'px';
}
window.addEventListener('resize',positionSaveToast);
window.addEventListener('scroll',positionSaveToast,true);
function showSaveToast(message){
  let toast=document.querySelector('#saveToast');
  if(!toast){toast=document.createElement('div');toast.id='saveToast';toast.className='save-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.append(toast)}
  clearTimeout(saveToastTimer);toast.hidden=false;toast.textContent=message;positionSaveToast();
  saveToastTimer=setTimeout(()=>{toast.hidden=true},2200);
}
document.querySelector('#saveBtn').onclick=()=>{
  const saved=JSON.parse(localStorage.getItem('poolNotes')||'[]'),now=new Date().toISOString(),data={title:currentTitle||'名称なし',state:structuredClone(state),lines:structuredClone(lines),notes:structuredClone(notes),tip:tip?{...tip}:null,orientation,updatedAt:now};let label='新規保存済み';
  const index=currentSaveId===null?-1:saved.findIndex(s=>String(s.id)===String(currentSaveId));
  if(index>=0){saved[index]={...saved[index],...data,createdAt:saved[index].createdAt||saved[index].date||now};label='上書き保存済み'}
  else{currentSaveId=Date.now();saved.unshift({id:currentSaveId,...data,createdAt:now,date:new Date().toLocaleDateString('ja-JP')})}
  try{localStorage.setItem('poolNotes',JSON.stringify(saved.slice(0,30)))}catch(error){showSaveToast('保存できませんでした。空き容量やブラウザの設定をご確認ください');return}showSaveToast('配置を保存しました');document.querySelector('#saveState').textContent=label;const help=document.querySelector('#saveHelp');help.textContent='保存済み';setTimeout(()=>help.textContent='配置を保存',1400);
};
function savedTimestamp(s){const time=Date.parse(s.updatedAt||s.createdAt||s.date||'');return Number.isNaN(time)?Number(s.id)||0:time}
function readSaved(){return JSON.parse(localStorage.getItem('poolNotes')||'[]')}
function writeSaved(items){localStorage.setItem('poolNotes',JSON.stringify(items.slice(0,30)))}
function downloadSavedImage(item){const backup={state,lines,notes,tip,orientation,title:currentTitle};state=structuredClone(item.state||{});lines=structuredClone(item.lines||[]);notes=structuredClone(item.notes||[]);tip=item.tip?{...item.tip}:null;setOrientation(item.orientation||'portrait',false,false);currentTitle=item.title||'ビリヤード配置';render();downloadImage();state=backup.state;lines=backup.lines;notes=backup.notes;tip=backup.tip;setOrientation(backup.orientation,false,false);currentTitle=backup.title;render()}
function renderSavedDialog(){
  const list=document.querySelector('#savedList'),items=readSaved().sort((a,b)=>savedSortOrder==='newest'?savedTimestamp(b)-savedTimestamp(a):savedTimestamp(a)-savedTimestamp(b));list.innerHTML='';list.className=savedView==='list'?'saved-list list-view':'saved-list card-view';document.querySelector('#savedCardView').classList.toggle('active',savedView==='cards');document.querySelector('#savedListView').classList.toggle('active',savedView==='list');document.querySelector('#savedSort').value=savedSortOrder;
  if(!items.length){list.innerHTML='<p>保存した配置はまだありません。</p>';return}
  if(savedView==='list'){const head=document.createElement('div');head.className='saved-table-head';head.innerHTML='<span>タイトル</span><span>更新日時</span><span>詳細</span>';list.append(head)}
  items.forEach(item=>{
    const card=document.createElement('div');card.className='saved-card';const summary=document.createElement('div');summary.className='saved-summary';const titleText=document.createElement('b');titleText.textContent=item.title||'名称なし';const time=document.createElement('time');time.textContent=formatSavedTime(item.updatedAt||item.createdAt||item.date)||'日時不明';const expand=document.createElement('button');expand.className='saved-expand';expand.textContent='展開';expand.hidden=savedView!=='list';summary.append(titleText,time,expand);
    const details=document.createElement('div');details.className='saved-details';details.hidden=savedView==='list';const input=document.createElement('input');input.className='saved-title-input';input.value=item.title||'名称なし';input.hidden=true;input.setAttribute('aria-label','保存タイトル');const meta=document.createElement('small'),created=item.createdAt||item.date,updated=item.updatedAt;meta.textContent=`新規保存：${formatSavedTime(created)||'日時不明'}${updated&&updated!==created?`\n上書き：${formatSavedTime(updated)}`:''}${item.result?`\n結果：${item.result}`:''}`;meta.style.whiteSpace='pre-line';const actions=document.createElement('div');actions.className='saved-actions';
    const edit=document.createElement('button');edit.textContent='編集';const rename=document.createElement('button');rename.textContent='タイトルを保存';rename.hidden=true;const open=document.createElement('button');open.textContent='この配置を開く';const image=document.createElement('button');image.textContent='画像を保存';const del=document.createElement('button');del.textContent='削除';del.className='danger';
    expand.onclick=()=>{details.hidden=!details.hidden;expand.textContent=details.hidden?'展開':'閉じる'};
    edit.onclick=()=>{titleText.hidden=true;input.hidden=false;edit.hidden=true;rename.hidden=false;input.focus();input.select()};
    rename.onclick=()=>{const saved=readSaved(),target=saved.find(s=>String(s.id)===String(item.id));if(!target)return;target.title=input.value.trim()||'名称なし';target.updatedAt=new Date().toISOString();writeSaved(saved);if(String(currentSaveId)===String(target.id))currentTitle=target.title;renderSavedDialog()};
    open.onclick=()=>{const target=readSaved().find(s=>String(s.id)===String(item.id));if(!target)return;state=structuredClone(target.state||{});lines=structuredClone(target.lines||[]);notes=structuredClone(target.notes||[]);if(!notes.length&&target.memo)notes=[{text:target.memo,color:'#ffe15b',x:50,y:50}];tip=target.tip?{...target.tip}:null;selectedLine=-1;currentSaveId=target.id;setOrientation(target.orientation||'portrait',false,false);currentTitle=target.title||'名称なし';render();document.querySelector('#saveState').textContent='保存済み';document.querySelector('#savedDialog').close()};
    image.onclick=()=>downloadSavedImage(item);
    del.onclick=()=>{if(!confirm(`「${item.title||'名称なし'}」を削除しますか？`))return;const saved=readSaved().filter(s=>String(s.id)!==String(item.id));writeSaved(saved);if(String(currentSaveId)===String(item.id)){currentSaveId=null;markUnsaved()}renderSavedDialog()};
    actions.append(edit,rename,open,image,del);details.append(input,meta,actions);card.append(summary,details);list.append(card);
  });
}
const savedDialogEl=document.querySelector('#savedDialog');
document.querySelector('#savedBtn').onclick=()=>{setTopMenu('savedBtn');renderSavedDialog();if(!savedDialogEl.open)savedDialogEl.showModal()};
savedDialogEl.addEventListener('close',()=>setTopMenu(null));
document.querySelector('#savedCardView').onclick=()=>{savedView='cards';renderSavedDialog()};
document.querySelector('#savedListView').onclick=()=>{savedView='list';renderSavedDialog()};
document.querySelector('#savedSort').onchange=e=>{savedSortOrder=e.target.value;renderSavedDialog()};
const menuToggleBtn=document.querySelector('#menuToggleBtn');
function setMenuExpanded(expanded){
  editorSidebar.classList.toggle('menu-collapsed',!expanded);
  if(expanded&&editorSidebar.classList.contains('menu-detached'))clearMenuSizeLock();
  if(!expanded&&editorSidebar.classList.contains('menu-detached'))resetMenuToDefault();
  menuToggleBtn.setAttribute('aria-expanded',String(expanded));
  menuToggleBtn.setAttribute('aria-label',expanded?'編集メニューを閉じる':'編集メニューを開く');
  menuToggleBtn.title=expanded?'編集メニューを閉じる':'編集メニューを開く';
  menuToggleBtn.querySelector('span').textContent=expanded?'×':'☰';
  menuToggleBtn.querySelector('small').textContent=expanded?'閉じる':'メニュー';
  requestAnimationFrame(()=>{clampMenuPosition();layoutTable(true)});
}
let toggleTouch=null,ignoreTouchClickUntil=0;
menuToggleBtn.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'){ignoreTouchClickUntil=0;return}
  if(e.isPrimary)toggleTouch={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
});
document.addEventListener('pointermove',e=>{
  if(toggleTouch&&e.pointerId===toggleTouch.id&&Math.hypot(e.clientX-toggleTouch.x,e.clientY-toggleTouch.y)>5)toggleTouch.moved=true;
});
document.addEventListener('pointerup',e=>{
  if(!toggleTouch||e.pointerId!==toggleTouch.id)return;
  const tap=!toggleTouch.moved;toggleTouch=null;ignoreTouchClickUntil=Date.now()+750;
  if(tap)setMenuExpanded(editorSidebar.classList.contains('menu-collapsed'));
});
document.addEventListener('pointercancel',()=>{toggleTouch=null});
menuToggleBtn.addEventListener('click',e=>{
  if(e.detail!==0&&Date.now()<ignoreTouchClickUntil)return;
  setMenuExpanded(editorSidebar.classList.contains('menu-collapsed'));
});
let menuDrag=null,suppressMenuClick=false;
function clampMenuPosition(){
  if(editorSidebar.style.position!=='fixed')return;
  const r=editorSidebar.getBoundingClientRect(),vw=window.visualViewport?window.visualViewport.width:document.documentElement.clientWidth,vh=window.visualViewport?window.visualViewport.height:document.documentElement.clientHeight;
  let left=parseFloat(editorSidebar.style.left)||0,top=parseFloat(editorSidebar.style.top)||0;
  left=Math.max(4,Math.min(left,vw-r.width-4));
  top=Math.max(4,Math.min(top,vh-r.height-4));
  editorSidebar.style.left=left+'px';editorSidebar.style.top=top+'px';
}
function initMenuDrag(){
  editorSidebar.style.touchAction='auto';
  editorSidebar.style.cursor='default';
  menuToggleBtn.style.touchAction='none';
  menuToggleBtn.style.cursor='grab';

  editorSidebar.addEventListener('click',e=>{
    if(!suppressMenuClick)return;
    e.preventDefault();
    e.stopPropagation();
    suppressMenuClick=false;
  },true);

  editorSidebar.addEventListener('pointerdown',e=>{
    if(!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;
    suppressMenuClick=false;
    // Expanded: drag the grip. Collapsed: drag the remaining menu button.
    // A short tap still opens the menu; only an actual drag suppresses its click.
    const collapsedButton=editorSidebar.classList.contains('menu-collapsed')&&e.target.closest('#menuToggleBtn');
    if(!e.target.closest('.menu-drag-handle')&&!collapsedButton)return;
    const r=editorSidebar.getBoundingClientRect();
    menuDrag={id:e.pointerId,startX:e.clientX,startY:e.clientY,origLeft:r.left,origTop:r.top,moved:false};
    if(!collapsedButton){editorSidebar.setPointerCapture(e.pointerId);e.preventDefault()}
  });

  document.addEventListener('pointermove',e=>{
    if(!menuDrag||menuDrag.id!==e.pointerId)return;
    const dx=e.clientX-menuDrag.startX,dy=e.clientY-menuDrag.startY;
    if(!menuDrag.moved){
      if(Math.hypot(dx,dy)<5)return;
      menuDrag.moved=true;
      lockCurrentMenuSize();
      reserveDefaultMenuSlot();
      editorSidebar.classList.add('menu-detached');
      document.body.append(editorSidebar);
      editorSidebar.setPointerCapture(e.pointerId);
      editorSidebar.style.position='fixed';
      editorSidebar.style.margin='0';
      editorSidebar.style.right='auto';
      editorSidebar.style.bottom='auto';
      editorSidebar.style.transform='none';
      editorSidebar.style.left=menuDrag.origLeft+'px';
      editorSidebar.style.top=menuDrag.origTop+'px';
      menuToggleBtn.style.cursor='grabbing';
    }
    e.preventDefault();
    editorSidebar.style.left=(menuDrag.origLeft+dx)+'px';
    editorSidebar.style.top=(menuDrag.origTop+dy)+'px';
  });

  const endMenuDrag=e=>{
    if(!menuDrag||menuDrag.id!==e.pointerId)return;
    if(menuDrag.moved){
      suppressMenuClick=true;
      clampMenuPosition();
      // Keep the menu exactly where the user released it.
      // It returns to the default slot only when the table orientation changes.
      layoutTable(true);
    }
    if(editorSidebar.hasPointerCapture(e.pointerId))editorSidebar.releasePointerCapture(e.pointerId);
    menuToggleBtn.style.cursor='grab';
    menuDrag=null;
  };
  document.addEventListener('pointerup',endMenuDrag);
  document.addEventListener('pointercancel',endMenuDrag);
}
defaultState();
initMenuDrag();
layoutTable();
