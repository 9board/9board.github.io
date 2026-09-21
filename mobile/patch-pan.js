(()=>{
  'use strict';
  function clampTablePan(){
    if(tableZoom<=1){tablePan.x=0;tablePan.y=0;return;}
    const wrap=tableWrap.getBoundingClientRect();
    const scale=fitScale*tableZoom;
    const scaledW=(tableFrame.offsetWidth||1)*scale;
    const scaledH=(tableFrame.offsetHeight||1)*scale;
    tablePan.x=Math.max(Math.min(0,wrap.width-scaledW),Math.min(0,tablePan.x));
    tablePan.y=Math.max(Math.min(0,wrap.height-scaledH),Math.min(0,tablePan.y));
  }
  applyTableTransform=function(){
    clampTablePan();
    tableFrame.style.transformOrigin='0 0';
    tableFrame.style.transform=`translate(${tablePan.x}px,${tablePan.y}px) scale(${fitScale*tableZoom})`;
  };
  resetTableZoom=function(){
    tableZoom=1;tablePan={x:0,y:0};pinchGesture=null;tableTouches.clear();applyTableTransform();renderLines();
  };
  let panGesture=null;
  function canPan(target){
    return tableZoom>1&&mode==='move'&&!groupMoveMode&&!target.closest('.ball,.note,.line-hit,.shot-line,.plain-line,.line-handle,.target-guide');
  }
  tableWrap.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||!e.isPrimary||!canPan(e.target))return;
    panGesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:tablePan.x,startY:tablePan.y};
    e.preventDefault();
  },{capture:true,passive:false});
  tableWrap.addEventListener('pointermove',e=>{
    if(!panGesture||e.pointerId!==panGesture.id)return;
    if(tableTouches.size>1){panGesture=null;return;}
    tablePan.x=panGesture.startX+(e.clientX-panGesture.x);
    tablePan.y=panGesture.startY+(e.clientY-panGesture.y);
    applyTableTransform();
    e.preventDefault();e.stopPropagation();
  },{capture:true,passive:false});
  const end=e=>{if(panGesture&&e.pointerId===panGesture.id){panGesture=null;applyTableTransform();}};
  for(const t of ['pointerup','pointercancel','lostpointercapture'])tableWrap.addEventListener(t,end,{capture:true});
  window.addEventListener('resize',()=>requestAnimationFrame(applyTableTransform));
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(applyTableTransform));
  applyTableTransform();

})();
