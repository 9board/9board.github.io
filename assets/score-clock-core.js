/* Shared chess/shot clock. Voice files must be licensed before configuring clips. */
(function(){
 'use strict';
 const clips={}; // Licensed Marisa recordings pending; never substitute browser TTS.
 let clipBytes={};
 fetch('/assets/clock-audio/manifest.json').then(r=>r.ok?r.json():{}).then(async manifest=>{
  for(const key of ['15','10','5','4','3','2','1'])if(manifest[key]){
   const url=new URL(manifest[key],location.origin);if(url.origin!==location.origin)continue;
   const r=await fetch(url);if(r.ok){clipBytes[key]=await r.arrayBuffer();if(context)clips[key]=await context.decodeAudioData(clipBytes[key].slice(0));}
  }
 }).catch(()=>{});
 let context, current;
 let enabled=true;try{enabled=localStorage.getItem('9boardClockAudio')!=='off'}catch(e){}
 function unlock(){try{if(!context){context=new (window.AudioContext||window.webkitAudioContext)();for(const key of Object.keys(clipBytes))context.decodeAudioData(clipBytes[key].slice(0)).then(b=>clips[key]=b).catch(()=>{});}context.resume().catch(()=>{});}catch(e){}}
 function silence(){if(current){try{current.stop()}catch(e){} current=null}}
 function play(key){if(!enabled)return;unlock();silence();if(key==='alarm'&&context){const o=context.createOscillator(),g=context.createGain();o.frequency.value=880;o.connect(g);g.connect(context.destination);g.gain.setValueAtTime(.16,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.65);o.start();o.stop(context.currentTime+.65);current=o;}else if(clips[key]&&context){const s=context.createBufferSource();s.buffer=clips[key];s.connect(context.destination);s.start();current=s;}}
 function toggle(head){const label=document.createElement('label');label.style.cssText='font-size:12px;white-space:nowrap';const input=document.createElement('input');input.type='checkbox';input.checked=enabled;input.setAttribute('aria-label','音声ON/OFF');input.onchange=()=>{enabled=input.checked;silence();unlock();try{localStorage.setItem('9boardClockAudio',enabled?'on':'off')}catch(e){}};label.append(input,document.createTextNode(' 音声ON/OFF'));label.title='アラーム音。魔理沙の読み上げは素材・許諾の確認待ち';head.append(label);}
 function field(select){
  const wrap=document.createElement('div');wrap.style.cssText='position:relative;width:100%;min-width:0';
  const input=document.createElement('input');input.id=select.id;input.type='text';input.inputMode='decimal';input.value='10';input.autocomplete='off';
  input.setAttribute('aria-label',select.getAttribute('aria-label')||'持ち時間（分・自由入力）');input.setAttribute('role','combobox');input.setAttribute('aria-haspopup','listbox');input.setAttribute('aria-expanded','false');input.style.cssText='width:100%;min-width:0;padding-right:38px';
  const arrow=document.createElement('button');arrow.type='button';arrow.textContent='▾';arrow.setAttribute('aria-label','持ち時間の候補を開く');arrow.style.cssText='position:absolute;right:1px;top:1px;bottom:1px;width:34px;border:0;background:transparent;color:inherit;padding:0;min-height:0;cursor:pointer;border-radius:10px';
  const list=document.createElement('div');list.id=select.id+'Options';list.setAttribute('role','listbox');list.hidden=true;list.style.cssText='position:fixed;z-index:10000;max-height:240px;overflow-y:auto;overscroll-behavior:contain;background:#fff;border:1px solid #dfe7e2;border-radius:10px;box-shadow:0 5px 16px #0002;padding:4px;box-sizing:border-box;color:#34404c';input.setAttribute('aria-controls',list.id);
  select.replaceWith(wrap);wrap.append(input,arrow);document.body.append(list);let valid=10,active=-1;
  function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1}
  function highlight(i){active=Math.max(0,Math.min(40,i));Array.from(list.children).forEach((o,j)=>{o.style.background=j===active?'#e9f7f1':'#fff';o.setAttribute('aria-selected',String(j===active))});input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'})}
  function open(){const rect=wrap.getBoundingClientRect();list.style.left=rect.left+'px';list.style.width=rect.width+'px';const below=innerHeight-rect.bottom;list.style.maxHeight=Math.max(80,Math.min(240,below>=120?below-8:rect.top-8))+'px';list.style.top=below>=120?rect.bottom+4+'px':'auto';list.style.bottom=below>=120?'auto':innerHeight-rect.top+4+'px';list.hidden=false;input.setAttribute('aria-expanded','true');list.scrollTop=0;active=-1;}
  function commit(){const n=Number(input.value.trim().replace(/分$/,''));if(!Number.isFinite(n)||n<=0||n>1440){input.value=String(valid);return}valid=n;input.value=String(n)}
  input.clockMinutes=()=>valid;input.setClockMinutes=n=>{n=Number(n);valid=Number.isFinite(n)&&n>0&&n<=1440?n:10;input.value=String(valid)};
  for(let m=10;m<=50;m++){const o=document.createElement('div');o.id=list.id+'-'+m;o.setAttribute('role','option');o.setAttribute('aria-selected','false');o.textContent=m+'分';o.style.cssText='padding:10px 12px;cursor:pointer;font:inherit;min-height:40px;box-sizing:border-box;border-radius:6px';o.addEventListener('pointerdown',e=>e.preventDefault());o.onclick=()=>{input.value=String(m);input.dispatchEvent(new Event('change',{bubbles:true}));close()};list.append(o)}
  input.addEventListener('change',commit);input.addEventListener('focus',open);input.addEventListener('click',()=>{if(list.hidden)open()});input.addEventListener('input',close);
  arrow.onclick=()=>list.hidden?open():close();
  input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)open();highlight(active<0?(e.key==='ArrowDown'?0:40):active+(e.key==='ArrowDown'?1:-1))}else if(e.key==='Enter'){e.preventDefault();if(!list.hidden&&active>=0)list.children[active].click();else{input.dispatchEvent(new Event('change',{bubbles:true}));close()}}else if(e.key==='Escape'||e.key==='Tab')close()});
  document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target)&&!list.contains(e.target))close()});window.addEventListener('resize',()=>{if(!list.hidden)open()});document.addEventListener('scroll',e=>{if(e.target!==list&&!list.hidden)open()},true);
  return input;
 }
 function player(seconds=600,shot=false){return{remaining:Math.max(0,Number(seconds)||0),shot:!!shot,expired:!!shot&&Number(seconds)<=0}}
 function advance(p,d){const before=p.remaining;p.remaining=Math.max(0,before-d);if(!p.shot&&p.remaining===0){p.shot=true;p.remaining=30;p.expired=false;play('alarm');return}if(p.shot){const crossed=[15,10,5,4,3,2,1].filter(n=>before>n&&p.remaining<=n);if(p.remaining===0){if(!p.expired){p.expired=true;play('alarm')}}else if(crossed.length){play(String(crossed[crossed.length-1]))}}}
 function turn(p,changed){unlock();silence();if(p.shot&&(changed||p.expired)){p.remaining=30;p.expired=false}}
 function text(p){const n=Math.ceil(Math.max(0,p.remaining-1e-7));return(p.shot?'SHOT ':'')+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
 window.NineBoardClock={field,toggle,player,advance,turn,text,silence};
})();
