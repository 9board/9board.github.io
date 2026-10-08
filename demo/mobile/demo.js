'use strict';
// Deliberately standalone: no app services, accounts, persistent storage or requests.
const svg=document.querySelector('#board'),ballsGroup=document.querySelector('#balls'),arrowsGroup=document.querySelector('#arrows'),guide=document.querySelector('#guide');
const NS='http://www.w3.org/2000/svg',colors={1:'#edb820',2:'#1d67c6',3:'#e2483e'};
let balls=[],arrows=[],mode='ball',selected=null,gesture=null;
function el(name,attrs){const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n}
function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
function clamp(p){return{x:Math.max(61,Math.min(589,p.x)),y:Math.max(63,Math.min(303,p.y))}}
function renderBalls(){ballsGroup.replaceChildren();for(const b of balls){const g=el('g',{'class':'ball'+(selected===b.n?' selected':''),'data-number':b.n,transform:`translate(${b.x} ${b.y})`});g.append(el('circle',{r:17,fill:colors[b.n],'class':'ball-edge'}),el('circle',{r:9.5,fill:'#fff2d4'}),el('ellipse',{cx:-7,cy:-9,rx:4,ry:2.5,'class':'ball-glint'}));const t=el('text',{'class':'ball-number',y:0});t.textContent=b.n;g.append(t);ballsGroup.append(g)}document.querySelectorAll('[data-ball]').forEach(b=>b.setAttribute('aria-pressed',String(selected===Number(b.dataset.ball))))}
function renderArrows(){arrowsGroup.replaceChildren();for(const a of arrows)arrowsGroup.append(el('line',{x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2,stroke:'#fff','stroke-width':3,'stroke-linecap':'round','marker-end':'url(#arrowhead)'}))}
function setMode(m){mode=m;document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===m;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});guide.textContent=m==='arrow'?'台の上をドラッグして、矢印を描いてください。':'球をタップして追加し、指で動かせます。'}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
document.querySelectorAll('[data-ball]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.ball);if(!balls.some(x=>x.n===n))balls.push({n,x:200+n*65,y:185});selected=n;setMode('ball');renderBalls()});
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=point(e);if(p.x<44||p.x>605||p.y<46||p.y>320)return;const q=clamp(p);if(mode==='arrow'){if(arrows.length>=8){guide.textContent='体験版では矢印は8本までです。消して描き直せます。';return}const a={x1:q.x,y1:q.y,x2:q.x,y2:q.y};arrows.push(a);gesture={kind:'arrow',id:e.pointerId,a};renderArrows()}else{const target=e.target.closest('[data-number]');if(!target)return;selected=Number(target.dataset.number);const b=balls.find(b=>b.n===selected);gesture={kind:'ball',id:e.pointerId,b,dx:b.x-p.x,dy:b.y-p.y};renderBalls()}svg.setPointerCapture(e.pointerId);e.preventDefault()});
svg.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const p=point(e);if(gesture.kind==='ball'){const q=clamp({x:p.x+gesture.dx,y:p.y+gesture.dy});gesture.b.x=q.x;gesture.b.y=q.y;renderBalls()}else{const q=clamp(p);gesture.a.x2=q.x;gesture.a.y2=q.y;renderArrows()}});
function end(e){if(!gesture||gesture.id!==e.pointerId)return;if(gesture.kind==='arrow'&&Math.hypot(gesture.a.x2-gesture.a.x1,gesture.a.y2-gesture.a.y1)<10)arrows=arrows.filter(a=>a!==gesture.a);gesture=null;renderArrows()}
svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
document.querySelector('#reset').onclick=()=>{balls=[];arrows=[];gesture=null;selected=null;setMode('ball');renderBalls();renderArrows()};
document.querySelector('#clearArrows').onclick=()=>{arrows=[];gesture=null;renderArrows()};
document.addEventListener('keydown',e=>{const d={ArrowLeft:[-3,0],ArrowRight:[3,0],ArrowUp:[0,-3],ArrowDown:[0,3]}[e.key],b=balls.find(b=>b.n===selected);if(!d||!b||mode!=='ball')return;e.preventDefault();const q=clamp({x:b.x+d[0],y:b.y+d[1]});b.x=q.x;b.y=q.y;renderBalls()});
renderBalls();
