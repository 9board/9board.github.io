/* 9BOARD Mobile - Score helpers + chess clock for the score screen only. */
(function(){
  'use strict';

  function init(){
    const counterScreen=document.querySelector('.screen[data-screen="counter"]');
    const scoreCard=counterScreen?.querySelector('.counter-card');
    if(!counterScreen||!scoreCard) return;

    if(!document.getElementById('mobileScoreAddonStyle')){
      const style=document.createElement('style');
      style.id='mobileScoreAddonStyle';
      style.textContent=`
        .score-name-label{display:block;font-size:11px;font-weight:900;color:#59616a;margin:0 0 6px;text-align:left}
        .score-extra-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;padding-top:14px;border-top:1px solid var(--line)}
        .score-extra-field{display:grid;gap:6px;font-size:11px;font-weight:900;color:#59616a}
        .score-extra-field select,.score-extra-field input{width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;color:#34404c;font-weight:800}
        .score-reset-only{width:100%;margin-top:10px;min-height:42px;border:1px solid var(--line);border-radius:12px;background:#fff;color:#34404c;font-size:13px;font-weight:900}
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
    }

    const p1=document.getElementById('p1name');
    const p2=document.getElementById('p2name');
    for(const input of [p1,p2]){if(input){input.value='';input.placeholder='名前';input.setAttribute('aria-label','名前');}}
    const oldRace=scoreCard.querySelector('.race');
    if(oldRace) oldRace.style.display='none';

    if(!document.getElementById('scoreExtraRow')){
      const extra=document.createElement('div');
      extra.id='scoreExtraRow';
      extra.className='score-extra-row';
      extra.innerHTML=`
        <div class="score-rule-group"><b>何先</b><div class="score-two-cols"><label class="score-extra-field"><span data-score-name="1">名前1</span><select id="scoreP1Race"></select><input id="scoreP1RaceFree" placeholder="例：35先・2セット先取" hidden></label><label class="score-extra-field"><span data-score-name="2">名前2</span><select id="scoreP2Race"></select><input id="scoreP2RaceFree" placeholder="例：35先・2セット先取" hidden></label></div></div>

        <div class="score-rule-group"><b>JPAルール</b><div class="score-two-cols"><label class="score-extra-field"><span data-score-name="1">名前1</span><select id="scoreP1SL"></select><input id="scoreP1SLFree" placeholder="JPAルールを入力" hidden></label><label class="score-extra-field"><span data-score-name="2">名前2</span><select id="scoreP2SL"></select><input id="scoreP2SLFree" placeholder="JPAルールを入力" hidden></label></div></div>
        <label class="score-extra-field">ゲーム形式<select id="scoreGameType"><option>9ボール</option><option>8ボール</option><option>10ボール</option><option value="free">自由入力</option></select><input id="scoreGameFree" placeholder="ゲーム形式を入力" hidden><button type="button" id="scoreGameSave">保存</button></label>
      `;
      scoreCard.appendChild(extra);
      const originalRace=document.getElementById('raceType');
      const gameType=document.getElementById('scoreGameType');
      if(originalRace&&gameType){gameType.value=originalRace.value;gameType.addEventListener('change',()=>{originalRace.value=gameType.value;});}

    }

    if(!document.getElementById('scoreResetOnly')){
      const btn=document.createElement('button');
      btn.type='button';btn.id='scoreResetOnly';btn.className='score-reset-only';btn.textContent='点数をクリア';
      btn.addEventListener('click',()=>{
        const reset=document.getElementById('clearScorePoints');
        if(reset) reset.click();
      });
      scoreCard.querySelector('.score-meta').insertAdjacentElement('afterend',btn);
    }

    if(document.getElementById('mobileChessClock')) return;

    const box=document.createElement('section');
    box.id='mobileChessClock';
    box.innerHTML=`
      <div class="clock-head"><h2>チェスクロック</h2><span>タップで開始・切替、2回タップで停止</span></div>
      <div class="clock-presets">
        <div class="clock-preset"><label for="mobileLeftClockSelect">持ち時間</label><select id="mobileLeftClockSelect"></select></div>
        <div class="clock-preset"><label for="mobileRightClockSelect">持ち時間</label><select id="mobileRightClockSelect"></select></div>
      </div>
      <div class="clock-faces">
        <button type="button" class="clock-face" id="mobileLeftClockFace"><b id="mobileLeftClockName">名前1</b><strong id="mobileLeftClock">10:00</strong></button>
        <button type="button" class="clock-face" id="mobileRightClockFace"><b id="mobileRightClockName">名前2</b><strong id="mobileRightClock">10:00</strong></button>
      </div>
      <div class="clock-actions"><button type="button" class="clock-action" id="mobileClockStop">停止</button><button type="button" class="clock-action" id="mobileClockReset">リセット</button></div>
      <div class="clock-note">ここのリセットはチェスクロックだけを初期時間に戻します</div>
    `;
    scoreCard.insertAdjacentElement('afterend',box);

    const leftSelect=box.querySelector('#mobileLeftClockSelect');
    const rightSelect=box.querySelector('#mobileRightClockSelect');
    for(let m=10;m<=120;m+=5){leftSelect.add(new Option(m+'分',m));rightSelect.add(new Option(m+'分',m));}
    leftSelect.value='10'; rightSelect.value='10';
    const leftFace=box.querySelector('#mobileLeftClockFace'),rightFace=box.querySelector('#mobileRightClockFace');
    const leftValue=box.querySelector('#mobileLeftClock'),rightValue=box.querySelector('#mobileRightClock');
    const leftName=box.querySelector('#mobileLeftClockName'),rightName=box.querySelector('#mobileRightClockName');
    const stopButton=box.querySelector('#mobileClockStop'),resetButton=box.querySelector('#mobileClockReset');
    let run=null,timer=null,last=0,left=600,right=600;
    const fmt=s=>{s=Math.max(0,Math.floor(Number(s)||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
    const syncNames=()=>{leftName.textContent=p1?.value.trim()||'名前1';rightName.textContent=p2?.value.trim()||'名前2'};
    function render(){leftValue.textContent=fmt(left);rightValue.textContent=fmt(right);leftFace.classList.toggle('active',run==='left');rightFace.classList.toggle('active',run==='right');syncNames();}
    function tick(){const now=Date.now(),d=(now-last)/1000;last=now;if(run==='left')left=Math.max(0,left-d);if(run==='right')right=Math.max(0,right-d);if(left<=0||right<=0){run=null;clearInterval(timer);timer=null;}render();}
    function start(side){run=side;last=Date.now();if(!timer)timer=setInterval(tick,250);render();}
    function stop(){run=null;if(timer){clearInterval(timer);timer=null;}render();}
    function reset(){run=null;if(timer){clearInterval(timer);timer=null;}left=Number(leftSelect.value)*60;right=Number(rightSelect.value)*60;render();}
    let lastTapSide=null,lastTapAt=0;function tapFace(side){const now=Date.now();if(lastTapSide===side&&now-lastTapAt<450){stop();lastTapSide=null;lastTapAt=0;return}lastTapSide=side;lastTapAt=now;start(side)}
    leftFace.addEventListener('click',()=>tapFace('left'));rightFace.addEventListener('click',()=>tapFace('right'));
    stopButton.addEventListener('click',stop);resetButton.addEventListener('click',()=>window.NineBoardConfirmReset(reset));
    leftSelect.addEventListener('change',()=>{left=Number(leftSelect.value)*60;render();});rightSelect.addEventListener('change',()=>{right=Number(rightSelect.value)*60;render();});
    p1?.addEventListener('input',syncNames);p2?.addEventListener('input',syncNames);
    render();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
