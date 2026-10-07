import {withProgress} from './interactions.js';
import './theme.js';
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
  await chrome.runtime.sendMessage({type:'DISCONNECT_CALENDAR'});
  await chrome.storage.local.clear();
  await chrome.permissions.remove({ origins: ['https://api.pushover.net/*'] });
  enabled.checked = false; token.value = ''; user.value = '';
  result.textContent = 'Local settings and snapshots cleared. Monitoring is disabled. Exported files are unaffected.';
};

const themeSelect=document.querySelector('#themeMode');
const autoSync=document.querySelector('#calendarAutoSync');
async function calendarUI(){const data=await chrome.storage.local.get(['themeMode','calendarAutoSync','calendarConnected','calendarSyncStatus']);themeSelect.value=data.themeMode||'forest';autoSync.checked=!!data.calendarAutoSync;document.querySelector('#calendarStatus').textContent=[data.calendarConnected?'Google connected':'Not connected',data.calendarSyncStatus?.error,data.calendarSyncStatus?.ok&&`Last sync: ${data.calendarSyncStatus.created} created, ${data.calendarSyncStatus.updated} updated, ${data.calendarSyncStatus.skipped} courses skipped`].filter(Boolean).join(' · ');}
themeSelect.onchange=()=>chrome.storage.local.set({themeMode:themeSelect.value});
autoSync.onchange=()=>chrome.storage.local.set({calendarAutoSync:autoSync.checked});
let calendarBusy=false;
for(const [id,type,label] of [['connectCalendar','CONNECT_CALENDAR','Connecting…'],['syncCalendar','SYNC_CALENDAR','Syncing…'],['disconnectCalendar','DISCONNECT_CALENDAR','Disconnecting…']])document.querySelector('#'+id).onclick=async()=>{
  if(calendarBusy)return;calendarBusy=true;
  const status=document.querySelector('#calendarStatus');status.dataset.state='busy';status.textContent=label;
  try{await withProgress(document.querySelector('#'+id),label,async()=>{
    if(type==='CONNECT_CALENDAR'&&!await chrome.permissions.request({origins:['https://www.googleapis.com/*']}))throw new Error('Calendar permission was not granted.');
    const r=await chrome.runtime.sendMessage({type});
    if(!r?.ok)throw new Error(r?.error||'Calendar request failed.');
    await calendarUI();status.dataset.state='success';
    if(type==='CONNECT_CALENDAR')status.textContent='✓ Google connected. Refresh Canvas, then sync your selected courses.';
    if(type==='DISCONNECT_CALENDAR')status.textContent='Disconnected. Automatic sync stopped; existing Google events remain.';
  });}catch(e){status.dataset.state='error';status.textContent=e.message;}finally{calendarBusy=false;}
};
chrome.storage.onChanged.addListener(()=>{if(!calendarBusy)void calendarUI();});void calendarUI();

for(const [id,label] of Object.entries({"save": "Saving…", "test": "Sending…", "clear": "Clearing…"})){const button=document.getElementById(id),action=button.onclick;button.onclick=()=>withProgress(button,label,()=>action());}
