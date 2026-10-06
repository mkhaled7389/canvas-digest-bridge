const result = document.querySelector('#result');
const token = document.querySelector('#pushoverToken');
const user = document.querySelector('#pushoverUser');
const enabled = document.querySelector('#enabled');
chrome.storage.local.get(['pushoverToken', 'pushoverUser', 'monitoringEnabled']).then((v) => {
  token.value = v.pushoverToken || ''; user.value = v.pushoverUser || ''; enabled.checked = !!v.monitoringEnabled;
});
enabled.onchange = async () => {
  await chrome.storage.local.set({ monitoringEnabled: enabled.checked });
  result.textContent = enabled.checked ? 'Monitoring enabled. Open Canvas and refresh assignments.' : 'Monitoring disabled. Saved data remains until cleared.';
};
document.querySelector('#save').onclick = async () => {
  if (!token.value.trim() && !user.value.trim()) {
    await chrome.storage.local.remove(['pushoverToken', 'pushoverUser']);
    await chrome.permissions.remove({ origins: ['https://api.pushover.net/*'] });
    result.textContent = 'Mobile alerts disabled.'; return;
  }
  if (!token.value.trim() || !user.value.trim()) { result.textContent = 'Enter both values, or clear both to disable alerts.'; return; }
  if (!await chrome.permissions.request({ origins: ['https://api.pushover.net/*'] })) { result.textContent = 'Permission was not granted.'; return; }
  await chrome.storage.local.set({ pushoverToken: token.value.trim(), pushoverUser: user.value.trim() });
  result.textContent = 'Optional mobile alerts configured.';
};
document.querySelector('#test').onclick = async () => {
  try { const response = await chrome.runtime.sendMessage({ type: 'SEND_TEST_ALERT' }); result.textContent = response.ok ? 'Test sent. Check Pushover.' : response.error; }
  catch { result.textContent = 'Unable to send the test.'; }
};
document.querySelector('#clear').onclick = async () => {
  await chrome.storage.local.clear();
  await chrome.permissions.remove({ origins: ['https://api.pushover.net/*'] });
  enabled.checked = false; token.value = ''; user.value = '';
  result.textContent = 'Local settings and snapshots cleared. Monitoring is disabled. Exported files are unaffected.';
};
