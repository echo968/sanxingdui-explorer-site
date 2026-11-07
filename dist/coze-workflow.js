(() => {
  async function run(spaceId, fields = {}, options = {}) {
    const response = await fetch('/api/coze/workflow', {
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({space_id:spaceId,...fields}),
      signal:options.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `工作流请求失败（${response.status}）。`);
    return payload.outputs || {};
  }

  window.SanxingduiCoze = Object.freeze({run});
})();
