/* Existing Firebase project and Google account; no extra OAuth scopes. */
(async function(){
 const VERSION='12.19.0';
 try{const [appSDK,authSDK,sdk]=await Promise.all(['app','auth','firestore'].map(name=>import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-'+name+'.js')));
 const config={apiKey:'AIzaSyAVnFfyN--P82r6bsepeQaM5pEUDIbQt0E',authDomain:'board-53117.firebaseapp.com',projectId:'board-53117',storageBucket:'board-53117.firebasestorage.app',messagingSenderId:'1071728475403',appId:'1:1071728475403:web:fd0be70b5569164a47760e'};
 const app=appSDK.getApps().length?appSDK.getApp():appSDK.initializeApp(config),auth=authSDK.getAuth(app),db=sdk.getFirestore(app);await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);
 const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;font-size:12px';const name=document.createElement('span'),login=document.createElement('button');login.type='button';login.textContent='Googleでログインして記録を保存';login.onclick=async()=>{try{await authSDK.signInWithPopup(auth,new authSDK.GoogleAuthProvider())}catch(e){alert('ログインできませんでした。端末の記録は保持しています。')}};const retry=document.createElement('button');retry.type='button';retry.textContent='保存を再確認';retry.onclick=()=>window.NineBoardScoreHistory.connectCloud(auth.currentUser,sdk,db);controls.append(name,login,retry);const mount=()=>{const status=document.getElementById('scoreHistorySaveStatus');if(status)status.after(controls)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 authSDK.onAuthStateChanged(auth,user=>{login.hidden=!!user;name.textContent=user?(user.displayName||'ログイン中'):'ログインするとPC・スマホで記録を共有できます';window.NineBoardScoreHistory.connectCloud(user,sdk,db)});
 }catch(e){const el=document.getElementById('scoreHistorySaveStatus');if(el)el.textContent='端末保存済み・ログイン機能の通信状態を確認してください'}
})();
