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
      const info = document.createElement('p'); info.textContent = plus ? 'Plus：保存無制限' : 'Free：ログイン不要・配置5件／対戦記録10件／スコア履歴10件まで'; settings.append(info);
      const note = document.createElement('p'); note.style.fontSize = '12px'; note.textContent = 'クラウド保存・端末間同期・Android共有は接続準備中です。'; settings.append(note);
      [['backup', 'バックアップを保存'], ['cloudSave', 'クラウド保存'], ['deviceSync', '端末間同期'], ['androidShare', 'Android共有']].forEach(([key, title]) => {
        const button = document.createElement('button'); button.textContent = title; button.disabled = !plan.can(key); button.style.cssText = 'padding:8px;margin:4px;border:1px solid #ddd;border-radius:8px';
        button.onclick = async () => { try { if (key === 'backup') backup(); else await run(key); } catch (e) { note.textContent = e.message; } }; settings.append(button);
      });
    }
  }
  window.NineBoardServices = Object.freeze({ connect, run, backup, snapshot, selectedLink, askSaveName });
  window.addEventListener('9board:planchange', refresh);
  window.addEventListener('9board:datachange', refresh);
  window.addEventListener('storage', refresh);
  document.addEventListener('DOMContentLoaded', () => {
    // Demo controls cannot be enabled on the production host or persisted as purchases.
    if (['localhost', '127.0.0.1'].includes(location.hostname)) {
      document.getElementById('plusPreviewBar').hidden = false;
      document.querySelectorAll('[data-preview-plan]').forEach(button => { button.onclick = () => plan.setSession(button.dataset.previewPlan === 'plus' ? { uid: 'preview-only' } : null, button.dataset.previewPlan); });
    }
    refresh();
  });
})();
