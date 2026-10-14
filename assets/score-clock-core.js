/* Shared chess/shot clock with original notification sound files. */
(function(){
 'use strict';
 let context,master,current,sequence=0;
 let enabled=true,volume=.8;
 try{enabled=localStorage.getItem('9boardClockAudio')!=='off';const v=localStorage.getItem('9boardClockVolume');if(v!==null&&Number.isFinite(Number(v)))volume=Math.max(0,Math.min(1,Number(v)))}catch(e){}
 const bytes={};for(const key of ['alarm','warning','countdown'])bytes[key]=fetch('/assets/clock-audio/'+key+'.wav?v=20261014-sound1').then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer()}).catch(()=>null);
 const buffers={};
 function unlock(){try{if(!context){context=new (window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=volume;master.connect(context.destination);for(const key of Object.keys(bytes))buffers[key]=bytes[key].then(b=>b?context.decodeAudioData(b):null).catch(()=>null);}context.resume().catch(()=>{});}catch(e){}}
 function silence(){sequence++;if(current){try{current.stop()}catch(e){}current=null}}
 function play(key,after){if(!enabled||volume===0)return;unlock();if(!context)return;silence();const token=sequence;buffers[key]?.then(buffer=>{if(!buffer||token!==sequence||!enabled||volume===0)return;const source=context.createBufferSource();source.buffer=buffer;source.connect(master);source.onended=()=>{if(token===sequence){current=null;if(after)play(after)}};current=source;source.start();});}
 function toggle(head){
  const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 0 12px;font-size:12px;color:inherit';
  const label=document.createElement('label');label.style.whiteSpace='nowrap';const input=document.createElement('input');input.type='checkbox';input.checked=enabled;input.setAttribute('aria-label','音声ON/OFF');input.onchange=()=>{enabled=input.checked;silence();unlock();try{localStorage.setItem('9boardClockAudio',enabled?'on':'off')}catch(e){}};label.append(input,document.createTextNode(' 通知音ON/OFF'));
  const volumeLabel=document.createElement('label');volumeLabel.style.cssText='display:flex;align-items:center;gap:6px';const value=document.createElement('span');const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.step='1';slider.value=String(Math.round(volume*100));slider.setAttribute('aria-label','通知音の音量');slider.style.cssText='width:100px;min-width:0;padding:0';const show=()=>value.textContent='音量 '+Math.round(volume*100)+'%';show();slider.oninput=()=>{volume=Number(slider.value)/100;unlock();if(master)master.gain.setValueAtTime(volume,context.currentTime);show();try{localStorage.setItem('9boardClockVolume',String(volume))}catch(e){}};
  volumeLabel.append(value,slider);const preview=document.createElement('button');preview.type='button';preview.textContent='音を確認';preview.style.cssText='border:1px solid #dfe7e2;border-radius:8px;background:#fff;color:inherit;padding:6px 10px;font:inherit;min-height:30px';preview.onclick=()=>play('alarm');row.append(label,volumeLabel,preview);head.after(row);
 }
 function field(select){
  const wrap=document.createElement('div');wrap.style.cssText='position:relative;width:100%;min-width:0';
  const input=document.createElement('input');input.id=select.id;input.type='text';input.inputMode='decimal';input.value='10';input.autocomplete='off';
  input.setAttribute('aria-label',select.getAttribute('aria-label')||'持ち時間（分・自由入力）');input.setAttribute('role','combobox');input.setAttribute('aria-haspopup','listbox');input.setAttribute('aria-expanded','false');input.style.cssText='width:100%;min-width:0;padding-right:38px';
  const arrow=document.createElement('button');arrow.type='button';arrow.textContent='▾';arrow.setAttribute('aria-label','持ち時間の候補を開く');arrow.style.cssText='position:absolute;right:1px;top:1px;bottom:1px;width:34px;border:0;background:transparent;color:inherit;padding:0;min-height:0;cursor:pointer;border-radius:10px';
  const list=document.createElement('div');list.id=select.id+'Options';list.setAttribute('role','listbox');list.hidden=true;list.style.cssText='position:fixed;z-index:10000;max-height:240px;overflow-y:auto;overscroll-behavior:contain;background:#fff;border:1px solid #dfe7e2;border-radius:10px;box-shadow:0 5px 16px #0002;padding:4px;box-sizing:border-box;color:#34404c';input.setAttribute('aria-controls',list.id);
  select.replaceWith(wrap);wrap.append(input,arrow);document.body.append(list);let valid=10,active=-1;
  function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1}
  function highlight(i){active=Math.max(0,Math.min(list.children.length-1,i));Array.from(list.children).forEach((o,j)=>{o.style.background=j===active?'#e9f7f1':'#fff';o.setAttribute('aria-selected',String(j===active))});input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'})}
  function open(){const rect=wrap.getBoundingClientRect();list.style.left=rect.left+'px';list.style.width=rect.width+'px';const below=innerHeight-rect.bottom;list.style.maxHeight=Math.max(80,Math.min(240,below>=120?below-8:rect.top-8))+'px';list.style.top=below>=120?rect.bottom+4+'px':'auto';list.style.bottom=below>=120?'auto':innerHeight-rect.top+4+'px';list.hidden=false;input.setAttribute('aria-expanded','true');list.scrollTop=0;active=-1;}
  function commit(){const n=Number(input.value.trim().replace(/分$/,''));if(!Number.isFinite(n)||n<=0||n>1440){input.value=String(valid);return}valid=n;input.value=String(n)}
  input.clockMinutes=()=>valid;input.setClockMinutes=n=>{n=Number(n);valid=Number.isFinite(n)&&n>0&&n<=1440?n:10;input.value=String(valid)};
  const free=document.createElement('div');free.id=list.id+'-free';free.setAttribute('role','option');free.setAttribute('aria-selected','false');free.textContent='自由入力';free.style.cssText='padding:10px 12px;cursor:pointer;font:inherit;min-height:40px;box-sizing:border-box;border-radius:6px';free.addEventListener('pointerdown',e=>e.preventDefault());free.onclick=()=>{input.value='';input.placeholder='分数を入力';input.focus();close()};list.append(free);
  for(let m=10;m<=50;m++){const o=document.createElement('div');o.id=list.id+'-'+m;o.setAttribute('role','option');o.setAttribute('aria-selected','false');o.textContent=m+'分';o.style.cssText='padding:10px 12px;cursor:pointer;font:inherit;min-height:40px;box-sizing:border-box;border-radius:6px';o.addEventListener('pointerdown',e=>e.preventDefault());o.onclick=()=>{input.value=String(m);input.dispatchEvent(new Event('change',{bubbles:true}));close()};list.append(o)}
  input.addEventListener('change',commit);input.addEventListener('focus',open);input.addEventListener('click',()=>{if(list.hidden)open()});input.addEventListener('input',close);
  arrow.onclick=()=>list.hidden?open():close();
  input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)open();highlight(active<0?(e.key==='ArrowDown'?0:list.children.length-1):active+(e.key==='ArrowDown'?1:-1))}else if(e.key==='Enter'){e.preventDefault();if(!list.hidden&&active>=0)list.children[active].click();else{input.dispatchEvent(new Event('change',{bubbles:true}));close()}}else if(e.key==='Escape'||e.key==='Tab')close()});
  document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target)&&!list.contains(e.target))close()});window.addEventListener('resize',()=>{if(!list.hidden)open()});document.addEventListener('scroll',e=>{if(e.target!==list&&!list.hidden)open()},true);
  return input;
 }
 function player(seconds=600,shot=false){return{remaining:Math.max(0,Number(seconds)||0),shot:!!shot,expired:!!shot&&Number(seconds)<=0}}
 function advance(p,d){const before=p.remaining;p.remaining=Math.max(0,before-d);if(!p.shot&&p.remaining===0){p.shot=true;p.remaining=30;p.expired=false;play('alarm','warning');return}{const crossed=[30,15,10,5,4,3,2,1].filter(n=>before>n&&p.remaining<=n);if(p.remaining===0){if(!p.expired){p.expired=true;play('alarm')}}else if(crossed.length){play(crossed[crossed.length-1]>=10?'warning':'countdown')}}}
 function turn(p,changed){unlock();silence();if(p.shot&&(changed||p.expired)){p.remaining=30;p.expired=false;play('warning')}}
 function text(p){const n=Math.ceil(Math.max(0,p.remaining-1e-7));return(p.shot?'SHOT ':'')+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
 window.NineBoardClock={field,toggle,player,advance,turn,text,silence};
})();
