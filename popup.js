import { shortCourse, filterDeadlines, syncSummary } from './deadlines.js';
const $ = id => document.getElementById(id);
let snapshot = {}, preferences = {selectedCourseIds:null,filter:'upcoming'}, busy = false;
function displayDate(value) { const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Phoenix'}).format(date) : 'No due date'; }
function renderItems() {
  const items = filterDeadlines(snapshot, preferences), shown = items.slice(0,20);
  $('deadlineCount').textContent = `${items.length} ITEMS`;
  $('viewSummary').textContent = items.length > 20 ? `Showing the first 20 of ${items.length} matching items.` : `${items.length} matching items · Arizona time`;
  $('assignments').replaceChildren(...(shown.length ? shown.map(a => {
    const li = document.createElement('li');
    const course = document.createElement('span'); course.className='course';course.textContent=a.course;
    const title = document.createElement('span');title.className='assignment';
    let link;try {const url=new URL(a.htmlUrl);if(url.origin==='https://canvas.asu.edu') {link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';}}catch{}
    if(link){link.textContent=a.name;title.append(link);}else title.textContent=a.name;
    const due=document.createElement('span');due.className='due';due.textContent=`${preferences.filter==='completed'?'Original due':'Due'} ${displayDate(a.dueAt)}`;
    li.append(course,title,due);return li;
  }) : [Object.assign(document.createElement('li'),{className:'empty',textContent:'No matching items in the saved snapshot. Missing items do not prove completion or cancellation.'})]));
}
async function render() {
  const data=await chrome.storage.local.get(['canvasStatus','canvasSnapshot','canvasRefreshStatus','monitoringEnabled','viewPreferences']);
  snapshot=data.canvasSnapshot||{};preferences={selectedCourseIds:null,filter:'upcoming',...data.viewPreferences};
  const summary=syncSummary(data);$('statusCard').dataset.state=summary.state;$('state').textContent=summary.state.replace('_',' ');
  $('detail').textContent=[!data.monitoringEnabled?'Monitoring is off. Enable it in Settings; saved data is retained.':data.canvasStatus?.detail,summary.freshness,summary.coverage,summary.error&&`Refresh failed: ${summary.error}; saved data retained`,snapshot.fetchedAt&&`Snapshot: ${displayDate(snapshot.fetchedAt)} (Arizona)`,data.canvasStatus?.checkedAt&&`Session checked: ${displayDate(data.canvasStatus.checkedAt)}`].filter(Boolean).join(' · ');
  $('deadlineFilter').value=preferences.filter;
  const legend=document.createElement('legend');legend.textContent='Included courses';
  $('courseFilters').replaceChildren(legend,...(snapshot.courses||[]).map(({course,error})=>{
    const label=document.createElement('label');label.className='course-choice';
    const input=document.createElement('input');input.type='checkbox';input.checked=preferences.selectedCourseIds===null||preferences.selectedCourseIds.includes(String(course.id));
    input.onchange=async()=>{let ids=preferences.selectedCourseIds===null?(snapshot.courses||[]).map(c=>String(c.course.id)):[...preferences.selectedCourseIds];ids=ids.filter(id=>id!==String(course.id));if(input.checked)ids.push(String(course.id));preferences.selectedCourseIds=ids;await savePreferences();};
    const text=document.createElement('span');text.textContent=`${shortCourse(course)}${error?' · incomplete':''}`;label.append(input,text);return label;
  }));renderItems();
}
async function savePreferences(){await chrome.storage.local.set({viewPreferences:preferences});renderItems();}
$('deadlineFilter').onchange=async()=>{preferences.filter=$('deadlineFilter').value;await savePreferences();};
$('allCourses').onclick=async()=>{preferences.selectedCourseIds=null;await savePreferences();await render();};
async function run(type){if(busy)return;busy=true;for(const id of ['check','snapshot'])$(id).disabled=true;try{const r=await chrome.runtime.sendMessage({type});await render();if(!r?.ok)$('detail').textContent=`${r?.error||'Unable to complete check.'} · ${$('detail').textContent}`;}catch{$('detail').textContent='Check failed. Saved snapshot retained; try again.';}finally{busy=false;for(const id of ['check','snapshot'])$(id).disabled=false;}}
$('check').onclick=()=>run('CHECK_NOW');$('snapshot').onclick=()=>run('REFRESH_SNAPSHOT');
$('export').onclick=async()=>{try{const r=await chrome.runtime.sendMessage({type:'EXPORT_SNAPSHOT'});$('detail').textContent=r.ok?'Full snapshot download started. It contains private coursework data.':r.error;}catch{$('detail').textContent='Could not start export.';}};
$('open').onclick=()=>chrome.tabs.create({url:'https://canvas.asu.edu/'});$('settings').onclick=()=>chrome.runtime.openOptionsPage();
chrome.storage.onChanged.addListener(()=>void render());void render();
