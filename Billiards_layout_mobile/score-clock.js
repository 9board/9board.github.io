/* 9BOARD Mobile - Chess clock add-on for the score screen only. */
(function(){
  'use strict';

  function init(){
    if(document.getElementById('mobileChessClock')) return;
    const counterScreen=document.querySelector('.screen[data-screen="counter"]');
    const scoreCard=counterScreen?.querySelector('.counter-card');
    if(!counterScreen||!scoreCard) return;

    const style=document.createElement('style');
    style.id='mobileChessClockStyle';
    style.textContent=`
      #mobileChessClock{background:#fff;border-radius:24px;padding:18px;border:1px solid #edf0f1;box-shadow:var(--shadow);margin-top:14px}
      #mobileChessClock .clock-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:14px}
      #mobileChessClock .clock-head h2{margin:0;font-size:18px;color:var(--ink)}
      #mobileChessClock .clock-head span{font-size:11px;color:var(--muted);font-weight:800;text-align:right}
      #mobileChessClock .clock-presets,#mobileChessClock .clock-faces{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #mobileChessClock .clock-preset label{display:block;font-size:11px;font-weight:900;color:#59616a;margin-bottom:6px}
      #mobileChessClock .clock-preset select{width:100%;border:1px solid var(--line);border-radius:12px;background:#fff;color:#34404c;padding:10px 11px;font-weight:900}
      #mobileChessClock .clock-faces{margin-top:10px}
      #mobileChessClock .clock-face{min-height:132px;border:1px solid var(--line);border-radius:18px;padding:14px 6px;background:#f8fbf9;color:#1d4e42;text-align:center;touch-action:manipulation}
      #mobileChessClock .clock-face.active{background:#e9f7f1;border-color:#9bcfbd;box-shadow:inset 0 0 0 1px rgba(11,165,119,.08)}
      #mobileChessClock .clock-face b{display:block;font-size:14px;margin-bottom:8px;color:#34404c}
      #mobileChessClock .clock-face strong{display:block;font-size:42px;line-height:1;font-weight:950;color:#1d4e42;font-variant-numeric:tabular-nums}
      #mobileChessClock .clock-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
      #mobileChessClock .clock-action{min-height:46px;border:1px solid var(--line);border-radius:13px;background:#fff;color:#34404c;font-size:14px;font-weight:900}
      #mobileChessClock .clock-note{margin:8px 2px 0;font-size:10px;color:var(--muted);text-align:center}
    `;
    document.head.appendChild(style);

    const box=document.createElement('section');
    box.id='mobileChessClock';
    box.innerHTML=`
      <div class="clock-head"><h2>チェスクロック</h2><span>左右の枠をタップして開始・切り替え</span></div>
      <div class="clock-presets">
        <div class="clock-preset"><label for="mobileLeftClockSelect">自分の持ち時間</label><select id="mobileLeftClockSelect"></select></div>
        <div class="clock-preset"><label for="mobileRightClockSelect">相手の持ち時間</label><select id="mobileRightClockSelect"></select></div>
      </div>
      <div class="clock-faces">
        <button type="button" class="clock-face" id="mobileLeftClockFace"><b id="mobileLeftClockName">自分</b><strong id="mobileLeftClock">10:00</strong></button>
        <button type="button" class="clock-face" id="mobileRightClockFace"><b id="mobileRightClockName">相手</b><strong id="mobileRightClock">10:00</strong></button>
      </div>
      <div class="clock-actions">
        <button type="button" class="clock-action" id="mobileClockStop">停止</button>
        <button type="button" class="clock-action" id="mobileClockReset">リセット</button>
      </div>
      <div class="clock-note">スコアの↻はスコアだけ、ここのリセットはチェスクロックだけをリセットします</div>
    `;
    scoreCard.insertAdjacentElement('afterend',box);

    const leftSelect=box.querySelector('#mobileLeftClockSelect');
    const rightSelect=box.querySelector('#mobileRightClockSelect');
    for(let m=10;m<=120;m+=5){leftSelect.add(new Option(m+'分',m));rightSelect.add(new Option(m+'分',m));}
    leftSelect.value='10'; rightSelect.value='10';

    const leftFace=box.querySelector('#mobileLeftClockFace');
    const rightFace=box.querySelector('#mobileRightClockFace');
    const leftValue=box.querySelector('#mobileLeftClock');
    const rightValue=box.querySelector('#mobileRightClock');
    const leftName=box.querySelector('#mobileLeftClockName');
    const rightName=box.querySelector('#mobileRightClockName');
    const stopButton=box.querySelector('#mobileClockStop');
    const resetButton=box.querySelector('#mobileClockReset');

    let run=null,timer=null,last=0,left=600,right=600;
    const fmt=s=>{s=Math.max(0,Math.floor(Number(s)||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
    const syncNames=()=>{leftName.textContent=document.getElementById('p1name')?.value.trim()||'自分';rightName.textContent=document.getElementById('p2name')?.value.trim()||'相手'};
    function render(){leftValue.textContent=fmt(left);rightValue.textContent=fmt(right);leftFace.classList.toggle('active',run==='left');rightFace.classList.toggle('active',run==='right');syncNames();}
    function tick(){const now=Date.now(),d=(now-last)/1000;last=now;if(run==='left')left=Math.max(0,left-d);if(run==='right')right=Math.max(0,right-d);if(left<=0||right<=0){run=null;clearInterval(timer);timer=null;}render();}
    function start(side){run=side;last=Date.now();if(!timer)timer=setInterval(tick,250);render();}
    function stop(){run=null;render();}
    function reset(){run=null;if(timer){clearInterval(timer);timer=null;}left=Number(leftSelect.value)*60;right=Number(rightSelect.value)*60;render();}

    leftFace.addEventListener('click',()=>start('left'));
    rightFace.addEventListener('click',()=>start('right'));
    stopButton.addEventListener('click',stop);
    resetButton.addEventListener('click',reset);
    leftSelect.addEventListener('change',()=>{left=Number(leftSelect.value)*60;render();});
    rightSelect.addEventListener('change',()=>{right=Number(rightSelect.value)*60;render();});
    document.getElementById('p1name')?.addEventListener('input',syncNames);
    document.getElementById('p2name')?.addEventListener('input',syncNames);
    render();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
