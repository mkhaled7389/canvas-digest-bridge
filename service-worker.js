const CHECK_ALARM = 'canvas-session-check';
const CANVAS_URL = 'https://canvas.asu.edu/';

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(CHECK_ALARM, { periodInMinutes: 5 });
  await chrome.storage.local.set({
    canvasStatus: { state: 'unknown', checkedAt: null, detail: 'Waiting for a Canvas tab.' }
  });
});

async function canvasTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => {
    try { return new URL(tab.url).origin === 'https://canvas.asu.edu'; }
    catch { return false; }
  });
}

// An extension reload leaves existing tabs without a working content-script listener.
// Try every Canvas tab and recover a missing listener in the permitted Canvas origin.
async function requestCanvas(type) {
  const tabs = await canvasTabs();
  const errors = [];
  for (const tab of tabs.sort((a, b) => Number(b.active) - Number(a.active))) {
    try {
      let response;
      try { response = await chrome.tabs.sendMessage(tab.id, { type }); }
      catch (error) {
        if (!/Receiving end does not exist|Could not establish connection/.test(error.message || '')) throw error;
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['canvas-session.js'] });
        response = await chrome.tabs.sendMessage(tab.id, { type });
      }
      if (response) return { response };
      errors.push('Tab returned no response');
    } catch (error) { errors.push(error.message || String(error)); }
  }
  return { error: tabs.length ? errors.join('; ') : 'No Canvas tab is open in this Chrome profile.' };
}

async function checkSession({ notify = true } = {}) {
  if (!(await chrome.storage.local.get('monitoringEnabled')).monitoringEnabled) return { ok: false, error: 'Monitoring is disabled. Enable it in Settings first.' };
  const result = await requestCanvas('CHECK_CANVAS_SESSION');
  const response = result.response;
  if (!response) {
    await setStatus({ state: 'unknown', detail: `Canvas bridge could not connect: ${result.error}` });
    return;
  }
  await setStatus(response, notify);
  if (response.state === 'signed_in') await refreshSnapshot();
}

async function setStatus(next, notify = false) {
  const prior = (await chrome.storage.local.get('canvasStatus')).canvasStatus || {};
  const status = { ...next, checkedAt: new Date().toISOString() };
  await chrome.storage.local.set({ canvasStatus: status });
  if (notify && status.state === 'signed_out' && prior.state !== 'signed_out') {
    await chrome.notifications.create('canvas-signed-out', {
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: 'Canvas needs sign-in',
      message: 'Open Canvas and complete ASU sign-in. Refresh assignments after reconnecting; saved snapshots may be outdated.',
      priority: 2
    });
    await deliverConfiguredWebhook(status);
  }
}

async function deliverConfiguredWebhook(status) {
  const { pushoverToken, pushoverUser } = await chrome.storage.local.get(['pushoverToken', 'pushoverUser']);
  try {
    if (pushoverToken && pushoverUser) {
      const body = new URLSearchParams({ token: pushoverToken, user: pushoverUser, title: 'Canvas needs sign-in', message: 'Open Canvas and complete ASU sign-in. Saved assignment data may be outdated.', priority: '0', url: CANVAS_URL, url_title: 'Open Canvas' });
      await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    }
  } catch {
    // The on-device alert remains authoritative when a configured delivery endpoint is unavailable.
  }
}

async function refreshSnapshot() {
  if (!(await chrome.storage.local.get('monitoringEnabled')).monitoringEnabled) return { ok: false, error: 'Enable monitoring in Settings first.' };
  const result = await requestCanvas('REFRESH_CANVAS_SNAPSHOT');
  const snapshot = result.response;
  if (!snapshot) {
    await chrome.storage.local.set({ canvasRefreshStatus: { checkedAt: new Date().toISOString(), error: result.error } });
    return { ok: false, error: result.error };
  }
  if (snapshot.error === 'signed_out') {
    await setStatus({ state: 'signed_out', detail: 'Canvas rejected the assignment refresh.' }, true);
    return { ok: false, error: 'Canvas needs sign-in.' };
  }
  if (snapshot.error) {
    await chrome.storage.local.set({ canvasRefreshStatus: { checkedAt: new Date().toISOString(), error: snapshot.error } });
    return { ok: false, error: `Canvas snapshot failed: ${snapshot.error}. Previous snapshot retained.` };
  }
  await chrome.storage.local.set({ canvasSnapshot: snapshot, canvasRefreshStatus: { checkedAt: new Date().toISOString(), coverage: snapshot.coverage, error: null } });
  return { ok: true, courses: snapshot.courses.length, fetchedAt: snapshot.fetchedAt };
}
async function exportSnapshot() {
  const { canvasSnapshot } = await chrome.storage.local.get('canvasSnapshot');
  if (!canvasSnapshot?.courses || !Array.isArray(canvasSnapshot.courses)) return { ok: false, error: 'Refresh assignments before exporting a snapshot.' };
  const file = `canvas-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
  const url = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(canvasSnapshot, null, 2))}`;
  await chrome.downloads.download({ url, filename: file, saveAs: true, conflictAction: 'uniquify' });
  return { ok: true, courses: canvasSnapshot.courses.length };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) void checkSession().catch(() => {});
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CHECK_NOW') {
    void checkSession({ notify: false }).then((result) => sendResponse(result || { ok: true })).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (message.type === 'CANVAS_STATUS') {
    void chrome.storage.local.get('monitoringEnabled').then((v) => v.monitoringEnabled && setStatus(message.status, true)).catch(() => {});
  }
  if (message.type === 'REFRESH_SNAPSHOT') {
    void refreshSnapshot().then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (message.type === 'EXPORT_SNAPSHOT') {
    void exportSnapshot().then(sendResponse).catch(() => sendResponse({ ok: false, error: 'Could not start the snapshot download.' }));
    return true;
  }
  if (message.type === 'SEND_TEST_ALERT') {
    void sendTestAlert().then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
async function sendTestAlert() {
  const { pushoverToken, pushoverUser } = await chrome.storage.local.get(['pushoverToken', 'pushoverUser']);
  if (!pushoverToken || !pushoverUser) return { ok: false, error: 'Save both Pushover values first.' };
  try {
    const body = new URLSearchParams({ token: pushoverToken, user: pushoverUser, title: 'Canvas Digest Bridge', message: 'Test successful. Canvas sign-out alerts will arrive here.', priority: '0', url: CANVAS_URL, url_title: 'Open Canvas' });
    const response = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok || (await response.json()).status !== 1) return { ok: false, error: `Pushover rejected the test (${response.status}).` };
    return { ok: true };
  } catch { return { ok: false, error: 'Could not reach Pushover.' }; }
}

