const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const sdk = {
  app: 'export const getApps=()=>[]; export const initializeApp=()=>({});',
  auth: `export const auth={currentUser:null};
export const getAuth=()=>auth;
export const browserLocalPersistence={}; export const setPersistence=async()=>{};
export class GoogleAuthProvider{setCustomParameters(p){this.params=p}}
export const signInWithPopup=async(a,p)=>{
 window.testLoginParams=p.params||{};
 if(window.testPopupCancel) throw {code:'auth/popup-closed-by-user'};
 window.testAuth({uid:'chosen'});
};
export const signOut=async()=>{
 if(window.testSignOutFailure) throw new Error('signout failed');
 window.testAuth(null);
};
export const deleteUser=async()=>window.testAuth(null);
export const reauthenticateWithPopup=async()=>{};
export function onAuthStateChanged(a,cb,err){
 window.testAuth=u=>{a.currentUser=u;cb(u)};window.testAuthError=err;
 window.testAuth(null);
}`,
  firestore: `export const getFirestore=()=>({});
export const doc=(db,collection,uid)=>({collection,uid});
export function onSnapshot(ref,options,next,error){
 const item={ref,options,next,error,closed:false};
 (window.testListeners ||= []).push(item);
 window.testPurchase=(paid,exists=true,fromCache=false,pending=false)=>{
   item.next({exists:()=>exists,data:()=>({paid}),metadata:{fromCache,hasPendingWrites:pending}});
 };
 window.testPurchaseError=error;
 return ()=>{item.closed=true};
}`
};
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const p = await browser.newPage({viewport:{width:390,height:844}});
  const failures=[];
  p.on('pageerror',e=>failures.push(e.message));
  await p.route('https://www.gstatic.com/firebasejs/**', r=>{
   const name=r.request().url().match(/firebase-(app|auth|firestore)\.js/)[1];
   return r.fulfill({contentType:'text/javascript',body:sdk[name]});
  });
  await p.route('https://9board.jp/**',r=>{
   let relative=new URL(r.request().url()).pathname.slice(1);
   let file=relative==='Billiards_layout_mobile/'?path.join(__dirname,'../Billiards_layout_mobile/index.html'):
    relative==='Billiards_layout_mobile/plus-services.js'?path.join(__dirname,'../Billiards_layout_mobile/plus-services.js'):
    path.join(__dirname,'..',relative);
   if(!fs.existsSync(file))return r.fulfill({status:404,body:''});
   return r.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':undefined});
  });
  await p.goto('https://9board.jp/Billiards_layout_mobile/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>typeof testAuth==='function');
  const state=()=>p.evaluate(()=>({
   locked:!document.documentElement.classList.contains('nineboard-authenticated'),
   gate:!document.getElementById('nineboardLoginGate').hidden,
   buy:!document.getElementById('nineboardPurchaseLink').hidden,
   user:window.NineBoardAuthUser?.uid || null,
   login:!document.getElementById('nineboardGoogleLogin').hidden
  }));
  const locked=async()=>{const s=await state();assert(s.locked&&s.gate);return s};
  assert((await locked()).login);
  await p.locator('#nineboardGoogleLogin').click();
  assert.deepEqual(await p.evaluate(()=>testLoginParams),{},'Normal login has no forced chooser');
  await p.evaluate(()=>testAuth(null));
  await p.locator('#nineboardGoogleLogin').click();
  assert.deepEqual(await p.evaluate(()=>testLoginParams),{},'Automatic signout does not request chooser');
  await p.evaluate(()=>testAuth({uid:'paid-user'}));
  assert(!(await locked()).buy);
  await p.evaluate(()=>testPurchase(true));
  assert.equal((await state()).locked,false);
  assert.equal(await p.locator('#ballbar button').count(),17);
  await p.evaluate(()=>location.hash='layout');
  await p.locator('#ballbar button').nth(2).click();
  assert(await p.locator('#ballsLayer .ball').count()>0,'Existing ball placement works');
  await p.screenshot({path:path.join(__dirname,'paid-mobile.png')});
  // Revocation and malformed values must lock immediately.
  for(const value of [false,'true',1,null,undefined]){
   await p.evaluate(v=>testPurchase(v),value);
   assert((await locked()).buy);
   await p.evaluate(()=>testPurchase(true));
  }
  await p.evaluate(()=>testPurchase(true,false));
  assert((await locked()).buy);
  await p.evaluate(()=>testPurchase(true));
  await p.evaluate(()=>testPurchase(true,true,true));
  assert(!(await locked()).buy,'Cache is an error, not proof of purchase');
  await p.evaluate(()=>testPurchase(true));
  await p.evaluate(()=>testPurchase(true,true,false,true));
  await locked();
  await p.evaluate(()=>testPurchase(true));
  await p.evaluate(()=>testPurchaseError({code:'permission-denied'}));
  assert(!(await locked()).buy);
  await p.locator('#nineboardPurchaseRetry').click();
  await p.evaluate(()=>testPurchase(true));
  assert.equal((await state()).locked,false);
  // Old subscriptions must not reopen after account switch, including same UID.
  await p.evaluate(()=>{window.oldListener=testListeners.at(-1);testAuth({uid:'other'});});
  await locked();
  await p.evaluate(()=>oldListener.next({exists:()=>true,data:()=>({paid:true}),metadata:{fromCache:false}}));
  await locked();
  assert(await p.evaluate(()=>oldListener.closed));
  assert.deepEqual(await p.evaluate(()=>testListeners.at(-1).ref),{collection:'users',uid:'other'});
  await p.evaluate(()=>testPurchase(false));
  assert(await p.locator('#ballsLayer').evaluate(el=>!!el.closest('[inert]')));
  await p.setViewportSize({width:844,height:390});
  assert(await p.locator('#nineboardLoginCard').evaluate(el=>el.getBoundingClientRect().top>=0),'Landscape gate starts within viewport');
  await p.setViewportSize({width:390,height:844});
  await p.screenshot({path:path.join(__dirname,'unpaid-mobile.png')});
  assert.equal(await p.locator('#nineboardPurchaseLink').getAttribute('href'),'https://buy.stripe.com/cNidR3cP862p8Fn4Nnasg00');
  await p.locator('#nineboardAccountSwitch').click();
  assert((await locked()).login);
  await p.evaluate(()=>window.testPopupCancel=true);
  await p.locator('#nineboardGoogleLogin').click();
  assert.equal(await p.evaluate(()=>testLoginParams.prompt),'select_account');
  await p.evaluate(()=>window.testPopupCancel=false);
  await p.locator('#nineboardGoogleLogin').click();
  assert.equal(await p.evaluate(()=>testLoginParams.prompt),'select_account','Cancellation preserves chooser');
  assert.equal(await p.evaluate(()=>sessionStorage.getItem('9board:choose-account-after-logout')),null);
  await p.evaluate(()=>testAuth({uid:'paid-user'}));
  await p.evaluate(()=>testPurchase(true));
  await p.evaluate(()=>NineBoardAuth.signOut());
  assert((await locked()).login);
  await p.reload({waitUntil:'networkidle'});
  await p.waitForFunction(()=>typeof testAuth==='function');
  await p.locator('#nineboardGoogleLogin').click();
  assert.equal(await p.evaluate(()=>testLoginParams.prompt),'select_account','Explicit logout survives reload');
  await p.evaluate(()=>testAuth(null));
  await p.locator('#nineboardGoogleLogin').click();
  assert.deepEqual(await p.evaluate(()=>testLoginParams),{},'Successful login consumes chooser');
  await p.evaluate(async()=>{
    window.testSignOutFailure=true;
    try {await NineBoardAuth.signOut()} catch {}
    window.testSignOutFailure=false;
    testAuth(null);
  });
  await p.locator('#nineboardGoogleLogin').click();
  assert.deepEqual(await p.evaluate(()=>testLoginParams),{},'Failed logout does not request chooser');
  await p.evaluate(()=>testAuth({uid:'paid-user'}));
  await p.evaluate(()=>testPurchase(true));
  await p.evaluate(()=>testAuthError({code:'auth/error'}));
  await locked();
  await p.evaluate(()=>testPurchase(true));
  await locked();
  // Timeout uses the real application timer, accelerated by Playwright clock.
  await p.clock.install();
  await p.evaluate(()=>testAuth({uid:'slow'}));
  await p.clock.runFor(15001);
  assert.match(await p.locator('#nineboardLoginStatus').textContent(),/確認できません/);
  await locked();
  assert.deepEqual(failures,[]);
  // Offline SDK failure must show a visible gate instead of the old blank card.
  await p.route('https://www.gstatic.com/firebasejs/**',r=>r.abort());
  await p.reload({waitUntil:'networkidle'});
  await locked();
  assert(await p.locator('#nineboardLoginCard').isVisible());
  assert.match(await p.locator('#nineboardLoginStatus').textContent(),/読み込めません/);
  console.log('PASS: strict paid, missing document, revocation, cached/pending data, permission error, retry, account switch, stale callbacks, signout, auth error, timeout, SDK failure, ball placement, payment URL.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
