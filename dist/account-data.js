(() => {
  let user = null;
  const writes = new Map();

  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials:'same-origin', cache:'no-store',
      ...options,
      headers:{accept:'application/json', ...(options.body ? {'content-type':'application/json'} : {}), ...(options.headers || {})},
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || (response.status === 401 ? '登录状态已失效，请重新登录。' : '个人数据服务暂时不可用。'));
    return payload;
  }

  function report(error) {
    window.dispatchEvent(new CustomEvent('account-data-error', {detail:{message:error?.message || '个人数据保存失败。'}}));
  }

  async function get(collection, key) {
    if (!user) return null;
    try {
      const query = new URLSearchParams({collection, key});
      const payload = await request(`/api/user-data?${query}`);
      return payload.item?.value ?? null;
    } catch (error) { report(error); throw error; }
  }

  function save(collection, key, value, localKey) {
    if (!user) {
      try { if (localKey) localStorage.setItem(localKey, JSON.stringify(value)); return Promise.resolve(value); }
      catch (error) { report(error); return Promise.reject(error); }
    }
    const taskKey = `${user.id}:${collection}:${key}`;
    return new Promise((resolve, reject) => {
      let pending = writes.get(taskKey);
      if (!pending) {
        pending = {value, revision:0, waiters:[], timer:null, sending:false};
        pending.settled = new Promise(resolve => { pending.settle = resolve; });
        writes.set(taskKey,pending);
      }
      pending.value = value;
      pending.revision++;
      pending.waiters.push({resolve,reject});
      if (!pending.sending) {
        clearTimeout(pending.timer);
        pending.timer = setTimeout(() => flush(taskKey,pending), 250);
      }
    });
  }

  async function flush(taskKey, pending, keepalive = false) {
    if (writes.get(taskKey) !== pending || pending.sending) return;
    pending.sending = true;
    try {
      let sentRevision;
      do {
        sentRevision = pending.revision;
        const body = JSON.stringify({collection:taskKey.split(':')[1],key:taskKey.split(':').slice(2).join(':'),value:pending.value});
        const canKeepalive = keepalive && new TextEncoder().encode(body).byteLength < 60 * 1024;
        await request('/api/user-data', {method:'PUT', body, keepalive:canKeepalive});
      } while (sentRevision !== pending.revision);
      pending.waiters.splice(0).forEach(waiter => waiter.resolve(pending.value));
      writes.delete(taskKey);
      pending.settle();
    } catch (error) {
      report(error);
      pending.waiters.splice(0).forEach(waiter => waiter.reject(error));
      writes.delete(taskKey);
      pending.settle();
    }
  }

  async function load(collection, key, localKey, fallback = null) {
    if (user) {
      const value = await get(collection, key);
      return value === null ? fallback : value;
    }
    try {
      const stored = localKey ? localStorage.getItem(localKey) : null;
      return stored ? JSON.parse(stored) : fallback;
    } catch { return fallback; }
  }

  async function remove(collection, key) {
    if (!user) return false;
    const query = new URLSearchParams({collection,key});
    try { await request(`/api/user-data?${query}`, {method:'DELETE'}); return true; }
    catch (error) { report(error); throw error; }
  }

  async function putIfAbsent(collection, key, value) {
    const existing = await get(collection, key);
    if (existing !== null) return {saved:false};
    await save(collection, key, value);
    return {saved:true};
  }

  async function listAll() {
    const items = []; const limit = 25; let offset = 0; let total = Infinity;
    while (offset < total) {
      const query = new URLSearchParams({limit:String(limit),offset:String(offset)});
      const page = await request(`/api/user-data?${query}`);
      items.push(...(page.items || []));
      total = Number(page.total) || 0;
      offset += limit;
    }
    return items;
  }

  window.AccountData = {
    setUser(nextUser) {
      const previousId = user?.id ?? null;
      user = nextUser ? {id:nextUser.id} : null;
      const nextId = user?.id ?? null;
      if (previousId !== null && previousId !== nextId) {
        for (const [taskKey, pending] of writes) {
          if (!taskKey.startsWith(`${previousId}:`) || pending.sending) continue;
          clearTimeout(pending.timer);
          const error = new Error('账号已切换，未发送的个人数据保存已取消。');
          pending.waiters.splice(0).forEach(waiter => waiter.reject(error));
          writes.delete(taskKey); pending.settle();
        }
      }
      if (previousId !== nextId) window.dispatchEvent(new CustomEvent('account-user-changed', {detail:{userId:nextId, previousUserId:previousId}}));
    },
    get userId() { return user?.id ?? null; },
    get authenticated() { return Boolean(user); },
    request,
    get,
    save,
    load,
    remove,
    putIfAbsent,
    listAll,
    async flushAll() {
      const pending = [...writes.entries()];
      for (const [taskKey, item] of pending) { clearTimeout(item.timer); void flush(taskKey,item); }
      await Promise.allSettled(pending.map(([,item]) => item.settled));
    },
    readLocal(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
  };
  window.addEventListener('pagehide', () => {
    for (const [taskKey, item] of writes) { clearTimeout(item.timer); void flush(taskKey,item,true); }
  });
})();
