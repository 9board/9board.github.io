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
 function field(select){const input=document.createElement('input');input.id=select.id;input.type='text';input.inputMode='decimal';input.value='10';input.setAttribute('aria-label',select.getAttribute('aria-label')||'持ち時間（分・自由入力）');input.setAttribute('list',select.id+'Options');input.style.cssText='width:100%;min-width:0';const list=document.createElement('datalist');list.id=select.id+'Options';for(let m=10;m<=50;m++){const o=document.createElement('option');o.value=m;o.label=m+'分';list.append(o)}select.replaceWith(input);input.after(list);let valid=10;input.clockMinutes=()=>valid;input.setClockMinutes=n=>{n=Number(n);valid=Number.isFinite(n)&&n>0&&n<=1440?n:10;input.value=String(valid)};input.addEventListener('change',()=>{const n=Number(input.value.trim().replace(/分$/,''));if(!Number.isFinite(n)||n<=0||n>1440){input.value=String(valid);return}valid=n;input.value=String(n)});return input;}
 function player(seconds=600,shot=false){return{remaining:Math.max(0,Number(seconds)||0),shot:!!shot,expired:!!shot&&Number(seconds)<=0}}
 function advance(p,d){const before=p.remaining;p.remaining=Math.max(0,before-d);if(!p.shot&&p.remaining===0){p.shot=true;p.remaining=30;p.expired=false;play('alarm');return}if(p.shot){const crossed=[15,10,5,4,3,2,1].filter(n=>before>n&&p.remaining<=n);if(p.remaining===0){if(!p.expired){p.expired=true;play('alarm')}}else if(crossed.length){play(String(crossed[crossed.length-1]))}}}
 function turn(p,changed){unlock();silence();if(p.shot&&(changed||p.expired)){p.remaining=30;p.expired=false}}
 function text(p){const n=Math.ceil(Math.max(0,p.remaining-1e-7));return(p.shot?'SHOT ':'')+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
 window.NineBoardClock={field,toggle,player,advance,turn,text,silence};
})();
