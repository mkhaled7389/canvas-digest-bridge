import { completed, shortCourse } from './deadlines.js';
const API = 'https://www.googleapis.com/calendar/v3';
let running;
export async function eventId(userId, courseId, assignmentId) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`asu:${userId}:${courseId}:${assignmentId}`));
  return 'cdb' + [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function eventBody(course, assignment, userId) {
  const due = new Date(assignment.dueAt).toISOString();
  return {summary:`${completed(assignment)?'✓ Completed — ':''}${shortCourse(course)}: ${assignment.name}`,
    description:`Canvas assignment: ${assignment.htmlUrl || ''}\nCompletion: ${completed(assignment)?'submitted or excused':'unverified'}`,
    start:{dateTime:due},end:{dateTime:new Date(Date.parse(due)+60000).toISOString()},
    extendedProperties:{private:{bridge:'canvas-digest-bridge',canvasUserId:String(userId),courseId:String(course.id),assignmentId:String(assignment.id)}}};
}
async function token(interactive=false) {
  if (!chrome.runtime.getManifest().oauth2?.client_id) throw new Error('Publisher OAuth setup is required before Google Calendar can connect. See CALENDAR-SETUP.md.');
  return (await chrome.identity.getAuthToken({interactive})).token;
}
async function request(path, accessToken, method='GET', body, etag) {
  const response=await fetch(API+path,{method,headers:{Authorization:`Bearer ${accessToken}`,...(body?{'Content-Type':'application/json'}:{}),...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(response.status===401) await chrome.identity.removeCachedAuthToken({token:accessToken});
  if(!response.ok) {const error=new Error(`Google Calendar returned ${response.status}. Reconnect for 401; retry a fresh sync for 412.`);error.status=response.status;throw error;}
  return response.json();
}
export async function connectCalendar() {await token(true);await chrome.storage.local.set({calendarConnected:true});return {ok:true};}
export async function disconnectCalendar() {
  await chrome.storage.local.set({calendarConnected:false,calendarAutoSync:false});
  const t=await token(false).catch(()=>null);
  if(t) await chrome.identity.removeCachedAuthToken({token:t});
  return {ok:true}; // Existing Google events and mappings are deliberately retained.
}
export function syncCalendar() {
  if(running) return running;
  running=performSync().finally(()=>{running=null;});return running;
}
async function performSync() {
  const data=await chrome.storage.local.get(['canvasSnapshot','calendarConnected','viewPreferences','calendarMappings']);
  if(!data.calendarConnected) throw new Error('Connect Google Calendar in Settings first.');
  const snapshot=data.canvasSnapshot;
  if(!snapshot?.userId || Date.now()-Date.parse(snapshot.fetchedAt)>30*60000 || !Number.isFinite(Date.parse(snapshot.fetchedAt))) throw new Error('Refresh Canvas first: a recent snapshot with verified user identity is required.');
  const accessToken=await token();const mappings=data.calendarMappings||{};
  let created=0,updated=0,unchanged=0,skipped=0;
  for(const {course,assignments,error} of snapshot.courses||[]) {
    if(error || (data.viewPreferences?.selectedCourseIds && !data.viewPreferences.selectedCourseIds.includes(String(course.id)))) {skipped++;continue;}
    const eligible=(assignments||[]).filter(a=>Number.isFinite(Date.parse(a.dueAt)) && a.id);
    if(!eligible.length) continue;
    const key=`${snapshot.userId}:${course.id}`;
    if(mappings[key]?.pending) throw new Error('Calendar creation was interrupted. Check Google Calendar before resetting the pending mapping; automatic creation is paused to avoid duplicates.');
    if(!mappings[key]?.id) {
      mappings[key]={pending:true};await chrome.storage.local.set({calendarMappings:mappings});
      const calendar=await request('/calendars',accessToken,'POST',{summary:`Canvas — ${shortCourse(course)}`,timeZone:'America/Phoenix',description:'Managed by Canvas Digest Bridge. Assignment deadlines only.'});
      mappings[key]={id:calendar.id};await chrome.storage.local.set({calendarMappings:mappings});
    }
    for(const a of eligible) {
      const id=await eventId(snapshot.userId,course.id,a.id);
      const path=`/calendars/${encodeURIComponent(mappings[key].id)}/events/${id}`;
      const body=eventBody(course,a,snapshot.userId);
      let existing;
      try {existing=await request(path,accessToken);}catch(e){if(e.status!==404)throw e;}
      if(existing) {
        const props=existing.extendedProperties?.private;
        if(props?.bridge!=='canvas-digest-bridge'||props.canvasUserId!==String(snapshot.userId)||props.assignmentId!==String(a.id)||props.courseId!==String(course.id)) throw new Error('Event ownership mismatch. No change made.');
        if(existing.summary===body.summary && existing.description===body.description && Date.parse(existing.start?.dateTime)===Date.parse(a.dueAt)){unchanged++;continue;}
        // PATCH leaves user reminders, color, and other unrelated fields intact.
        await request(path,accessToken,'PATCH',body,existing.etag);updated++;
      } else {
        // Stable IDs make uncertain inserts retry-safe; next run reads the same ID.
        await request(`/calendars/${encodeURIComponent(mappings[key].id)}/events`,accessToken,'POST',{id,...body});created++;
      }
    }
  }
  const result={ok:true,created,updated,unchanged,skipped,checkedAt:new Date().toISOString()};
  await chrome.storage.local.set({calendarSyncStatus:result});return result;
}
