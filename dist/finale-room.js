(() => {
  const $ = selector => document.querySelector(selector);
  const room = $('#ai-finale-room');
  if (!room) return;

  const video = $('#ai-finale-video');
  const source = video?.querySelector('source[data-src]');
  const poster = $('#ai-finale-poster');
  const status = $('#ai-finale-video-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = $('#ai-finale-dialog');
  const form = $('#ai-finale-form');
  const note = $('#ai-finale-note');
  const saveStatus = $('#ai-finale-save-status');
  const storageKey = 'sanxingdui-finale-echoes-v1';
  let videoLoaded = false;
  let dialogOpener = null;

  function showFallback(message) {
    room.classList.add('is-video-fallback');
    status.hidden = false;
    status.textContent = message || '尾厅影像暂时无法播放，当前显示静态画面。';
    if (video) video.pause();
  }

  async function activate() {
    if (!document.body.classList.contains('ai-finale-room-mode')) return;
    room.classList.toggle('is-reduced-motion', reducedMotion.matches);
    if (reducedMotion.matches || !video || !source) {
      video?.pause();
      return;
    }
    if (!videoLoaded) {
      source.src = source.dataset.src;
      videoLoaded = true;
      video.load();
    }
    try {
      await video.play();
      room.classList.remove('is-video-fallback');
      status.hidden = true;
    } catch {
      showFallback('浏览器未能自动播放尾厅影像，当前显示静态画面。');
    }
  }

  function deactivate() {
    video?.pause();
    if (dialog?.open) dialog.close();
  }

  function navigateToFoyer() {
    const state = history.state || {};
    history.pushState({...state,page:'ai-exhibition',room:'foyer'}, '', `${location.pathname}?page=ai-exhibition&room=foyer`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({top:0,behavior:'auto'});
  }

  function openDialog(button) {
    dialogOpener = button;
    saveStatus.textContent = '';
    const inAccount = Boolean(window.AccountData?.authenticated);
    dialog.querySelector('.ai-finale-local-note').textContent = inAccount ? '留言会保存在当前账号，可在个人账号页面查看。' : '留言仅保存在本机浏览器。';
    form.querySelector('[type="submit"]').textContent = inAccount ? '保存到账号' : '保存在本机';
    dialog.showModal();
    note.focus({preventScroll:true});
  }

  $('#ai-finale-open-echo').addEventListener('click', event => openDialog(event.currentTarget));
  $('#ai-finale-close').addEventListener('click', () => dialog.close());
  $('#ai-finale-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialogOpener?.focus({preventScroll:true}));
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = note.value.trim();
    if (!text) {
      saveStatus.textContent = '写下一句话后再保存；也可以选择稍后再说。';
      note.focus();
      return;
    }
    try {
      const entry = {text,createdAt:new Date().toISOString()};
      if (window.AccountData?.authenticated) {
        const id = crypto.randomUUID();
        saveStatus.textContent = '正在保存到当前账号…';
        await window.AccountData.save('finale_echoes',id,entry);
        note.value = '';
        saveStatus.textContent = '已保存到当前账号，可在个人账号页面查看。';
        return;
      }
      let entries = [];
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(stored)) entries = stored;
      } catch {}
      entries.push(entry);
      localStorage.setItem(storageKey, JSON.stringify(entries.slice(-50)));
      note.value = '';
      saveStatus.textContent = '已保存在本机浏览器。感谢你留下这段回声。';
    } catch {
      saveStatus.textContent = window.AccountData?.authenticated ? '账号保存失败；内容仍保留在输入框中，请稍后重试。' : '浏览器未能保存这段回声；内容仍保留在输入框中。';
    }
  });
  window.addEventListener('account-user-changed', () => {
    note.value = '';
    saveStatus.textContent = '';
    if (dialog?.open) dialog.close();
  });

  $('#ai-finale-restart').addEventListener('click', () => {
    try { sessionStorage.removeItem('aiEyeLastArtwork'); } catch {}
    window.dispatchEvent(new Event('ai-exhibition:reset'));
    navigateToFoyer();
  });

  video?.addEventListener('error', () => showFallback());
  video?.addEventListener('loadeddata', () => {
    if (!reducedMotion.matches) {
      room.classList.remove('is-video-fallback');
      status.hidden = true;
    }
  });
  poster?.addEventListener('error', () => {
    room.classList.add('is-poster-fallback');
    status.hidden = false;
    status.textContent = '尾厅影像与静态封面暂时无法读取。';
  });
  reducedMotion.addEventListener?.('change', activate);
  window.addEventListener('ai-finale-room:activate', activate);
  window.addEventListener('ai-finale-room:deactivate', deactivate);
  window.addEventListener('pagehide', deactivate);
  if (document.body.classList.contains('ai-finale-room-mode')) activate();
})();
