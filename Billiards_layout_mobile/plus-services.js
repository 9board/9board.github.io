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
  let authInstance = null;

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
        align-items: center;
        justify-content: center;
        padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
        background: #f4f5f7;
        color: #1e2126;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif;
      }
      #nineboardLoginGate[hidden] { display: none !important; }
      #nineboardLoginCard {
        width: min(100%, 430px);
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
        <h1>有料版にログイン</h1>
        <p>スマホ版を利用するには<br>Googleアカウントでログインしてください。</p>
        <button id="nineboardGoogleLogin" type="button" hidden>
          <span id="nineboardGoogleMark" aria-hidden="true">G</span>
          <span>Googleでログイン</span>
        </button>
        <div id="nineboardLoginStatus" aria-live="polite">ログイン状態を確認しています…</div>
        <a id="nineboardLoginBack" href="https://9board.jp/">9BOARDトップへ戻る</a>
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
    window.NineBoardAuthUser = user || null;
    window.dispatchEvent(new CustomEvent('9board:authchange', { detail: { user: user || null } }));
  }

  function lockApp() {
    const gate = createLoginGate();
    gate.hidden = false;
    document.documentElement.classList.remove('nineboard-authenticated');
    window.NineBoardAuthUser = null;
    showLoginButton();
    window.dispatchEvent(new CustomEvent('9board:authchange', { detail: { user: null } }));
  }

  async function startFirebaseAuth() {
    createLoginGate();

    try {
      const [appSdk, authSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`)
      ]);

      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(app);
      authInstance = auth;

      try {
        await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
      } catch (error) {
        console.warn('9BOARD auth persistence:', error);
      }

      const provider = new authSdk.GoogleAuthProvider();
      const loginButton = document.getElementById('nineboardGoogleLogin');

      if (loginButton) {
        loginButton.addEventListener('click', async () => {
          if (loginButton.disabled) return;
          loginButton.disabled = true;
          showAuthError('Googleログインを開いています…');
          try {
            await authSdk.signInWithPopup(auth, provider);
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

      authSdk.onAuthStateChanged(auth, user => {
        if (user) unlockApp(user);
        else lockApp();
      }, error => {
        console.error('9BOARD auth state:', error);
        showLoginButton();
        showAuthError('ログイン状態を確認できませんでした。ページを再読み込みしてください。');
      });

      window.NineBoardAuth = Object.freeze({
        getUser: () => auth.currentUser,
        signOut: () => authSdk.signOut(auth),
        deleteAccount: async () => {
          const user = auth.currentUser;
          if (!user) return;
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
      console.error('9BOARD Firebase init:', error);
      showLoginButton();
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
    if (!plan.can('backup')) throw new Error('バックアップはPlusで利用できます。');
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data: snapshot() }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = '9board-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    settings.append(divider);

    const title = document.createElement('p');
    title.textContent = 'アカウント';
    title.style.cssText = 'margin:0 0 8px;font-size:13px;font-weight:900;color:#34404c';
    settings.append(title);

    const name = document.createElement('p');
    name.textContent = user.displayName || user.email || 'Googleユーザー';
    name.style.cssText = 'margin:0;font-size:15px;font-weight:800;color:#1e2126;word-break:break-word';
    settings.append(name);

    if (user.email && user.displayName) {
      const email = document.createElement('p');
      email.textContent = user.email;
      email.style.cssText = 'margin:3px 0 10px;font-size:11px;color:#7d838b;word-break:break-all';
      settings.append(email);
    } else {
      name.style.marginBottom = '10px';
    }

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = 'ログアウト';
    logout.style.cssText = 'padding:9px 12px;border:1px solid #d8dde3;border-radius:10px;background:#fff;color:#34404c;font-weight:800';
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
    remove.style.cssText = 'padding:9px 12px;border:1px solid #efb7b7;border-radius:10px;background:#fff;color:#c23038;font-weight:800';
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
    settings.append(actions);
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
      const info = document.createElement('p'); info.textContent = plus ? 'Plus：保存無制限' : 'Free：配置5件／対戦記録10件／スコア履歴10件まで'; settings.append(info);
      const note = document.createElement('p'); note.style.fontSize = '12px'; note.textContent = 'クラウド保存・端末間同期・Android共有は接続準備中です。'; settings.append(note);
      [['backup', 'バックアップを保存'], ['cloudSave', 'クラウド保存'], ['deviceSync', '端末間同期'], ['androidShare', 'Android共有']].forEach(([key, title]) => {
        const button = document.createElement('button'); button.textContent = title; button.disabled = !plan.can(key); button.style.cssText = 'padding:8px;margin:4px;border:1px solid #ddd;border-radius:8px';
        button.onclick = async () => { try { if (key === 'backup') backup(); else await run(key); } catch (e) { note.textContent = e.message; } }; settings.append(button);
      });
      renderAccountControls(settings);
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
