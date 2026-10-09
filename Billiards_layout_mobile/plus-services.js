/* 9BOARD Mobile - Google login gate for the paid mobile version.
 * Loaded before the existing editor script so the current billiards UI can stay untouched.
 */
(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: 'AIzaSyAVnFfyN--P82r6bsepeQaM5pEUDIbQt0E',
    authDomain: 'board-53117.firebaseapp.com',
    projectId: 'board-53117',
    storageBucket: 'board-53117.firebasestorage.app',
    messagingSenderId: '1071728475403',
    appId: '1:1071728475403:web:fd0be70b5569164a47760e'
  };

  const FIREBASE_VERSION = '12.19.0';
  let entitlementGeneration = 0;
  let unsubscribePurchase = null;
  let purchaseTimer = null;
  const PAYMENT_LINK = 'https://buy.stripe.com/cNidR3cP862p8Fn4Nnasg00';
  const ACCOUNT_CHOICE_KEY = '9board:choose-account-after-logout';
  let chooseAccount = false;
  try { chooseAccount = sessionStorage.getItem(ACCOUNT_CHOICE_KEY) === '1'; } catch {}
  function setAccountChoice(value) {
    chooseAccount = value;
    try {
      if (value) sessionStorage.setItem(ACCOUNT_CHOICE_KEY, '1');
      else sessionStorage.removeItem(ACCOUNT_CHOICE_KEY);
    } catch {
      // Keep the current-page flag when browser storage is unavailable.
    }
  }

  function stopPurchaseCheck() {
    entitlementGeneration += 1;
    if (unsubscribePurchase) unsubscribePurchase();
    unsubscribePurchase = null;
    clearTimeout(purchaseTimer);
    purchaseTimer = null;
  }

  function setEditorLocked(locked) {
    // Preserve the editor DOM and measurements, but block pointer and keyboard access.
    for (const child of document.body.children) {
      if (child.id === 'nineboardLoginGate' || ['SCRIPT', 'STYLE'].includes(child.tagName)) continue;
      if (locked && !child.hasAttribute('data-nineboard-inert')) {
        child.setAttribute('data-nineboard-inert', child.inert ? 'true' : 'false');
        child.inert = true;
      } else if (!locked && child.hasAttribute('data-nineboard-inert')) {
        child.inert = child.getAttribute('data-nineboard-inert') === 'true';
        child.removeAttribute('data-nineboard-inert');
      }
    }
  }

  function createLoginGate() {
    if (document.getElementById('nineboardLoginGate')) return document.getElementById('nineboardLoginGate');

    const style = document.createElement('style');
    style.id = 'nineboardLoginGateStyle';
    style.textContent = `
      #nineboardLoginGate {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        overflow: auto;
        padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
        background: #f4f5f7;
        color: #1e2126;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif;
      }
      #nineboardLoginGate[hidden] { display: none !important; }
      #nineboardLoginCard {
        width: min(100%, 430px);
        margin: auto;
        flex-shrink: 0;
        padding: 28px 22px 24px;
        border-radius: 26px;
        background: #fff;
        box-shadow: 0 14px 40px rgba(20, 28, 38, .10);
        text-align: center;
      }
      #nineboardLoginLogo {
        display: block;
        width: min(100%, 360px);
        height: auto;
        margin: 0 auto 18px;
      }
      #nineboardLoginCard h1 {
        margin: 0 0 8px;
        font-size: 22px;
        line-height: 1.35;
      }
      #nineboardLoginCard p {
        margin: 0 auto 20px;
        color: #68717b;
        font-size: 14px;
        line-height: 1.75;
      }
      #nineboardGoogleLogin {
        width: 100%;
        min-height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        border: 1px solid #dfe3e8;
        border-radius: 14px;
        background: #fff;
        color: #25282d;
        font-weight: 800;
        font-size: 15px;
        box-shadow: 0 3px 10px rgba(20, 28, 38, .06);
        cursor: pointer;
      }
      #nineboardPurchaseActions[hidden], #nineboardGoogleLogin[hidden] { display: none !important; }
      #nineboardPurchaseActions a, #nineboardPurchaseActions button {
        display: block; width: 100%; margin: 10px 0; padding: 12px;
        border: 1px solid #dfe3e8; border-radius: 12px;
        background: #fff; color: #25282d; font: inherit; cursor: pointer;
        text-decoration: none; box-sizing: border-box;
      }
      #nineboardPurchaseActions a { background: #07845f; color: #fff; }
      #nineboardPurchaseActions #nineboardFreePcLink { background: transparent; color: #65717d; border: 0; font-size: 14px; }
      #nineboardGoogleLogin:disabled { opacity: .58; cursor: default; }
      #nineboardGoogleMark {
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        font: 800 21px/1 Arial, sans-serif;
        color: #4285f4;
      }
      #nineboardLoginStatus {
        min-height: 20px;
        margin: 14px 0 0;
        font-size: 12px;
        line-height: 1.5;
        color: #7b838c;
      }
      #nineboardLoginBack {
        display: inline-block;
        margin-top: 12px;
        color: #65717d;
        font-size: 12px;
        text-decoration: none;
      }
    `;
    document.head.appendChild(style);

    const gate = document.createElement('div');
    gate.id = 'nineboardLoginGate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-label', '9BOARD ログイン');
    gate.innerHTML = `
      <div id="nineboardLoginCard">
        <img id="nineboardLoginLogo" src="/assets/original-logo.png" alt="9BOARD">
        <h1>スマホ版の購入・ログイン</h1>
        <p>スマホ版は300円（税込・買い切り）です。購入済みの方はGoogleアカウントでログインしてください。</p>
        <button id="nineboardGoogleLogin" type="button" hidden>
          <span id="nineboardGoogleMark" aria-hidden="true">G</span>
          <span>Googleでログイン</span>
        </button>
        <div id="nineboardPurchaseActions">
          <a id="nineboardPurchaseLink" href="${PAYMENT_LINK}" target="_blank" rel="noopener noreferrer">購入手続きへ</a>
          <button id="nineboardPurchaseRetry" type="button">購入状態を再確認</button>
          <button id="nineboardAccountSwitch" type="button">別のアカウントでログイン</button>

        </div>

        <div id="nineboardLoginStatus" aria-live="polite">ログイン状態を確認しています…</div>
        <a id="nineboardLoginBack" href="https://9board.jp/">9BOARDトップへ戻る</a>
        <a id="nineboardFreePcLink" href="https://9board.jp/pc/" style="display:block;margin-top:12px;color:#65717d;font-size:14px;text-decoration:none">無料でPC版を使う</a>
        <a id="nineboardCommerceDisclosure" href="https://9board.jp/legal/" target="_blank" rel="noopener noreferrer" style="display:block;margin:14px 0;color:#65717d;font-size:13px;text-decoration:underline;text-underline-offset:3px">特定商取引法に基づく表記・返金条件</a>
      </div>
    `;
    document.body.appendChild(gate);
    return gate;
  }

  function showAuthError(message) {
    const status = document.getElementById('nineboardLoginStatus');
    if (status) status.textContent = message;
  }

  function showLoginButton() {
    const button = document.getElementById('nineboardGoogleLogin');
    const status = document.getElementById('nineboardLoginStatus');
    if (button) button.hidden = false;
    if (status) status.textContent = '';
  }

  function unlockApp(user) {
    const gate = document.getElementById('nineboardLoginGate');
    if (gate) gate.hidden = true;
    document.documentElement.classList.add('nineboard-authenticated');
    setEditorLocked(false);
    window.NineBoardAuthUser = user || null;
    window.dispatchEvent(new CustomEvent('9board:authchange', { detail: { user: user || null } }));
  }

  function lockApp() {
    const gate = createLoginGate();
    gate.hidden = false;
    document.documentElement.classList.remove('nineboard-authenticated');
    setEditorLocked(true);
    document.getElementById('nineboardPurchaseActions').hidden = false;
    document.getElementById('nineboardPurchaseLink').hidden = false;
    window.NineBoardAuthUser = null;
    document.querySelector('#nineboardLoginCard h1').textContent = 'スマホ版の購入・ログイン';
    document.querySelector('#nineboardLoginCard p').textContent = 'スマホ版は300円（税込・買い切り）です。購入済みの方はGoogleアカウントでログインしてください。';
    showLoginButton();
    window.dispatchEvent(new CustomEvent('9board:authchange', { detail: { user: null } }));
  }

  function awaitAuthCheck() {
    const gate = createLoginGate();
    gate.hidden = true;
    document.documentElement.classList.remove('nineboard-authenticated');
    setEditorLocked(true);
  }

  async function startFirebaseAuth() {
    awaitAuthCheck();
    document.getElementById('nineboardGoogleLogin').hidden = false;
    showAuthError('ログイン状態を確認しています…');

    try {
      const [appSdk, authSdk, firestoreSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
      ]);

      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(app);
      const db = firestoreSdk.getFirestore(app);

      try {
        await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
      } catch (error) {
        console.warn('9BOARD auth persistence:', error);
      }

      const provider = new authSdk.GoogleAuthProvider();
      async function explicitSignOut() {
        stopPurchaseCheck();
        lockApp();
        await authSdk.signOut(auth);
        setAccountChoice(true);
      }
      const loginButton = document.getElementById('nineboardGoogleLogin');

      if (loginButton) {
        loginButton.addEventListener('click', async () => {
          if (loginButton.disabled) return;
          loginButton.disabled = true;
          showAuthError('Googleログインを開いています…');
          try {
            const loginProvider = new authSdk.GoogleAuthProvider();
            if (chooseAccount) loginProvider.setCustomParameters({ prompt: 'select_account' });
            await authSdk.signInWithPopup(auth, loginProvider);
            setAccountChoice(false);
          } catch (error) {
            console.error('9BOARD Google login:', error);
            if (error && error.code === 'auth/popup-blocked') {
              showAuthError('ポップアップがブロックされました。ブラウザのポップアップを許可して、もう一度お試しください。');
            } else if (error && error.code === 'auth/popup-closed-by-user') {
              showAuthError('ログインがキャンセルされました。');
            } else {
              showAuthError('ログインできませんでした。もう一度お試しください。');
            }
          } finally {
            loginButton.disabled = false;
          }
        });
      }

      function watchPurchase(user) {
        stopPurchaseCheck();
        if (!user) { lockApp(); return; }
        awaitAuthCheck();
        const generation = entitlementGeneration;
        const isCurrent = () => generation === entitlementGeneration &&
          auth.currentUser?.uid === user.uid;
        document.getElementById('nineboardGoogleLogin').hidden = false;
        document.querySelector('#nineboardLoginCard h1').textContent = 'スマホ版の購入・ログイン';
        document.querySelector('#nineboardLoginCard p').textContent = 'スマホ版は300円（税込・買い切り）です。購入済みの方はGoogleアカウントでログインしてください。';
        document.getElementById('nineboardPurchaseActions').hidden = false;
        showAuthError('購入状態を確認しています…');
        const fail = () => {
          if (!isCurrent()) return;
          clearTimeout(purchaseTimer);
          lockApp();
          document.getElementById('nineboardGoogleLogin').hidden = false;
          document.getElementById('nineboardPurchaseActions').hidden = false;
          showAuthError('購入状態を確認できませんでした。通信状態を確認して再確認してください。');
        };
        purchaseTimer = setTimeout(fail, 15000);
        try {
          // Read only the signed-in user's document. Never grant from cached data.
          unsubscribePurchase = firestoreSdk.onSnapshot(
            firestoreSdk.doc(db, 'users', user.uid),
            { includeMetadataChanges: true },
            snapshot => {
              if (!isCurrent()) return;
              if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
                // Wait for a server-confirmed result; cached data never grants access.
                return;
              }
              clearTimeout(purchaseTimer);
              if (snapshot.exists() && snapshot.data()?.paid === true) {
                unlockApp(user);
              } else {
                lockApp();
                document.getElementById('nineboardGoogleLogin').hidden = false;
                document.getElementById('nineboardPurchaseActions').hidden = false;
                document.getElementById('nineboardPurchaseLink').hidden = false;
                document.querySelector('#nineboardLoginCard h1').textContent = 'スマホ版の購入・ログイン';
                document.querySelector('#nineboardLoginCard p').textContent = 'スマホ版は300円（税込・買い切り）です。購入済みの方はGoogleアカウントでログインしてください。';
                showAuthError('スマホ版の購入が確認できません。購入済みの方は購入時のアカウントをご確認ください。決済後の自動反映は準備中です。');
              }
            },
            error => {
              console.error('9BOARD purchase check:', error);
              fail();
            }
          );
        } catch (error) {
          console.error('9BOARD purchase listener:', error);
          fail();
        }
      }

      document.getElementById('nineboardPurchaseRetry').onclick = () => watchPurchase(auth.currentUser);
      document.getElementById('nineboardAccountSwitch').onclick = async () => {
        try {
          await explicitSignOut();
        } catch (error) {
          console.error('9BOARD account switch:', error);
          document.getElementById('nineboardGoogleLogin').hidden = false;
          document.getElementById('nineboardPurchaseActions').hidden = false;
          showAuthError('ログアウトできませんでした。もう一度お試しください。');
        }
      };
      authSdk.onAuthStateChanged(auth, watchPurchase, error => {
        stopPurchaseCheck();
        lockApp();
        console.error('9BOARD auth state:', error);
        document.getElementById('nineboardGoogleLogin').disabled = true;
        showAuthError('ログイン状態を確認できませんでした。ページを再読み込みしてください。');
      });

      window.NineBoardAuth = Object.freeze({
        getUser: () => auth.currentUser,
        authorizeCalendar: async () => {
          const user=auth.currentUser;
          if(!user)throw new Error('Googleにログインしてから同期してください');
          const calendarProvider=new authSdk.GoogleAuthProvider();
          calendarProvider.addScope('https://www.googleapis.com/auth/calendar.events');
          const result=await authSdk.reauthenticateWithPopup(user,calendarProvider);
          const credential=authSdk.GoogleAuthProvider.credentialFromResult(result);
          if(auth.currentUser?.uid!==user.uid)throw new Error('ログイン中のアカウントが変わりました。再確認してください');
          if(!credential?.accessToken)throw new Error('Googleカレンダーへのアクセス許可が必要です');
          return {token:credential.accessToken,uid:user.uid};
        },
        signOut: explicitSignOut,
        deleteAccount: async () => {
          const user = auth.currentUser;
          if (!user) return;
          stopPurchaseCheck();
          lockApp();
          try {
            await authSdk.deleteUser(user);
          } catch (error) {
            if (error && error.code === 'auth/requires-recent-login') {
              await authSdk.reauthenticateWithPopup(user, provider);
              await authSdk.deleteUser(user);
              return;
            }
            throw error;
          }
        }
      });
    } catch (error) {
      stopPurchaseCheck();
      lockApp();
      console.error('9BOARD Firebase init:', error);
      const button = document.getElementById('nineboardGoogleLogin');
      if (button) button.disabled = true;
      showAuthError('ログイン機能を読み込めませんでした。通信状態を確認してページを再読み込みしてください。');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startFirebaseAuth, { once: true });
  } else {
    startFirebaseAuth();
  }
})();

(function () {
  'use strict';
  const plan = window.NineBoardPlan;
  const keys = ['9b_layouts', '9b_matches', '9b_counter'];
  let adapter = null;
  const read = key => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  function snapshot() { return Object.fromEntries(keys.map(key => [key, read(key)])); }
  async function connect(provider) {
    // Auth/purchase adapters must deliver a verified user and entitlement.
    if (adapter && adapter.unsubscribe) adapter.unsubscribe();
    adapter = provider;
    plan.setSession(null, 'free');
    try {
      const session = await provider.getSession();
      plan.setSession(session.user, session.plan);
      if (provider.onSessionChanged) adapter.unsubscribe = provider.onSessionChanged(s => plan.setSession(s.user, s.plan));
    } catch { plan.setSession(null, 'free'); }
    refresh();
  }
  async function run(feature) {
    if (!plan.can(feature)) throw new Error('この機能はPlusで利用できます。');
    if (!adapter || typeof adapter[feature] !== 'function') throw new Error('接続準備中です。Firebase・購入確認の設定後に利用できます。');
    return adapter[feature]({ user: plan.getState().user, data: snapshot() });
  }
  function backup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data: snapshot() }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = '9board-backup.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function saveAllCsv() {
    const data=snapshot(),rows=[];
    const labels={'9b_layouts':'保存配置','9b_matches':'対戦記録','9b_counter':'スコア履歴'};
    for(const key of keys)for(const item of data[key])rows.push({dataKey:key,kind:labels[key],...item});
    const columns=['dataKey','kind',...new Set(rows.flatMap(row=>Object.keys(row).filter(key=>!['dataKey','kind'].includes(key))))];
    const cell=value=>{let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);if(typeof value==='string'&&/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
    const csv='\uFEFF'+[columns.map(cell).join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='9board-all-data.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  function selectedLink() {
    if (!plan.can('layoutMatchLink')) return {};
    const id = document.getElementById('plusLayoutLink')?.value;
    const item = read('9b_layouts').find(x => String(x.id) === id);
    return item ? { layoutId: item.id, layoutSnapshot: structuredClone(item) } : {};
  }
  function askSaveName() {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.style.cssText = 'border:0;border-radius:16px;padding:24px;width:min(90vw,360px)';
      dialog.innerHTML = '<form method="dialog"><label>保存名<input id="saveNameInput" style="display:block;width:100%;margin:12px 0" required></label><button value="cancel" formnovalidate>キャンセル</button> <button value="save">保存する</button></form>';
      dialog.querySelector('input').value = '配置 ' + new Date().toLocaleString('ja-JP');
      dialog.addEventListener('close', () => { const value = dialog.returnValue === 'save' ? dialog.querySelector('input').value.trim() : ''; dialog.remove(); resolve(value); }, { once: true });
      document.body.append(dialog); dialog.showModal();
    });
  }

  function wirePrivacyLink() {
    const row = [...document.querySelectorAll('.menu-row')].find(el => el.textContent.includes('プライバシーポリシー'));
    if (!row || row.dataset.nineboardPrivacyLinked === '1') return;
    row.dataset.nineboardPrivacyLinked = '1';
    row.setAttribute('role', 'link');
    row.setAttribute('tabindex', '0');
    row.style.cursor = 'pointer';
    const openPrivacy = () => { window.location.href = 'https://9board.jp/#privacy'; };
    row.addEventListener('click', openPrivacy);
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPrivacy();
      }
    });
  }

  function renderAccountControls(settings) {
    const user = window.NineBoardAuth?.getUser?.() || window.NineBoardAuthUser || null;
    if (!user) return;

    const divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:#e5e8eb;margin:14px -16px 12px';
    if(settings.children.length)settings.append(divider);

    const title = document.createElement('p');
    title.textContent = 'アカウント';
    title.style.cssText = 'margin:0 0 8px;font-size:13px;font-weight:900;color:#34404c';
    settings.append(title);

    const name = document.createElement('p');
    name.textContent = user.displayName || user.email || 'Googleユーザー';
    name.style.cssText = 'margin:0;font-size:15px;font-weight:800;color:#1e2126;word-break:break-word';
    settings.append(name);

    const accountLine = document.createElement('div');
    accountLine.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0;margin:3px 0 10px';
    if (user.email && user.displayName) {
      const email = document.createElement('p');
      email.textContent = user.email;
      email.style.cssText = 'margin:0;flex:1 1 auto;min-width:0;font-size:11px;color:#7d838b;word-break:break-all';
      accountLine.append(email);
    } else {
      name.style.margin = '0';
      name.style.flex = '1 1 auto';
      name.style.minWidth = '0';
      accountLine.append(name);
    }

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:6px;flex:0 0 auto;flex-wrap:nowrap';

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = 'ログアウト';
    logout.style.cssText = 'padding:7px 8px;border:1px solid #d8dde3;border-radius:10px;background:#fff;color:#34404c;font-size:11px;font-weight:800;white-space:nowrap';
    logout.onclick = async () => {
      logout.disabled = true;
      try {
        await window.NineBoardAuth?.signOut?.();
      } catch (error) {
        console.error('9BOARD logout:', error);
        alert('ログアウトできませんでした。もう一度お試しください。');
        logout.disabled = false;
      }
    };
    actions.append(logout);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'アカウント削除';
    remove.style.cssText = 'padding:7px 8px;border:1px solid #efb7b7;border-radius:10px;background:#fff;color:#c23038;font-size:11px;font-weight:800;white-space:nowrap';
    remove.onclick = async () => {
      if (!confirm('9BOARDのログインアカウントを削除しますか？\nこの操作は取り消せません。')) return;
      remove.disabled = true;
      try {
        await window.NineBoardAuth?.deleteAccount?.();
        alert('アカウントを削除しました。');
      } catch (error) {
        console.error('9BOARD account delete:', error);
        alert('アカウントを削除できませんでした。もう一度お試しください。');
        remove.disabled = false;
      }
    };
    actions.append(remove);
    accountLine.append(actions);
    settings.append(accountLine);
  }

  function refresh() {
    const state = plan.getState(), plus = state.isPlus;
    const usage = document.getElementById('planUsage');
    if (usage) usage.textContent = `${plus ? 'Plus' : 'Free'} ・配置 ${read(keys[0]).length}/${plus ? '無制限' : '5件'} ・対戦記録 ${read(keys[1]).length}/${plus ? '無制限' : '10件'}`;
    const label = document.getElementById('previewPlanLabel'); if (label) label.textContent = plus ? 'Plus' : 'Free';
    const select = document.getElementById('plusLayoutLink');
    if (select) {
      const current = select.value; select.replaceChildren(new Option('配置図なし', ''));
      read(keys[0]).forEach(x => select.add(new Option(x.title || '名称なし', String(x.id))));
      select.value = current; select.disabled = !plus;
    }
    const settings = document.getElementById('plusSettings');
    if (settings) {
      settings.replaceChildren();
      renderAccountControls(settings);
      const note = document.createElement('p'); note.style.fontSize = '12px'; note.textContent = ''; settings.append(note);
      [['backup', 'バックアップを保存']].forEach(([key, title]) => {
        const button = document.createElement('button'); button.textContent = title; button.disabled = key !== 'backup' && !plan.can(key); button.style.cssText = 'padding:8px;margin:4px;border:1px solid #ddd;border-radius:8px';
        button.onclick = async () => { try { if (key === 'backup') backup(); else await run(key); } catch (e) { note.textContent = e.message; } }; settings.append(button);
      });
      const csvButton=document.createElement('button');csvButton.textContent='全てをCSVで保存';csvButton.id='nineboardAllCsv';csvButton.style.cssText='padding:8px;margin:4px;border:1px solid #ddd;border-radius:8px';csvButton.onclick=saveAllCsv;settings.appendChild(csvButton);
    }
    wirePrivacyLink();
  }
  window.NineBoardServices = Object.freeze({ connect, run, backup, snapshot, selectedLink, askSaveName });
  window.addEventListener('9board:planchange', refresh);
  window.addEventListener('9board:datachange', refresh);
  window.addEventListener('9board:authchange', refresh);
  window.addEventListener('storage', refresh);
  document.addEventListener('DOMContentLoaded', () => {
    // Demo controls cannot be enabled on the production host or persisted as purchases.
    if (['localhost', '127.0.0.1'].includes(location.hostname)) {
      document.getElementById('plusPreviewBar').hidden = false;
      document.querySelectorAll('[data-preview-plan]').forEach(button => { button.onclick = () => plan.setSession(button.dataset.previewPlan === 'plus' ? { uid: 'preview-only' } : null, button.dataset.previewPlan); });
    }
    wirePrivacyLink();
    refresh();
  });
})();




