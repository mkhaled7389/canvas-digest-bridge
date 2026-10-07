import assert from 'node:assert/strict';
import {filterDeadlines,shortCourse,syncSummary} from './deadlines.js';
const now=Date.parse('2026-10-06T15:00:00Z');
const assignment=(id,h,submission=null)=>({id,name:`Assignment ${id}`,dueAt:new Date(now+h*3600000).toISOString(),submission});
const snapshot={courses:[{course:{id:1,courseCode:'2026FallC-T-MAT210-61166'},assignments:[assignment(1,1),assignment(2,60),assignment(3,-1),assignment(4,2,{workflowState:'graded'}),assignment(5,3,{workflowState:'graded',submittedAt:'2026-10-05T10:00Z'})]},{course:{id:2,name:'WPC 101'},assignments:[assignment(6,10),assignment(7,300)]}]};
const ids=(filter,selectedCourseIds=null)=>filterDeadlines(snapshot,{filter,selectedCourseIds,now}).map(a=>a.id);
assert.deepEqual(ids('48h'),[1,4,6]);assert.deepEqual(ids('7d'),[1,4,6,2]);assert.deepEqual(ids('overdue'),[3]);assert.deepEqual(ids('completed'),[5]);assert.deepEqual(ids('upcoming',[]),[]);assert.deepEqual(ids('48h',['2']),[6]);
assert.equal(shortCourse({courseCode:'2026FallC-T-MAT210-61166'}),'MAT 210');
assert.equal(syncSummary({monitoringEnabled:false,canvasStatus:{state:'signed_in'}},now).state,'disabled');
assert.equal(syncSummary({monitoringEnabled:true,canvasSnapshot:{fetchedAt:new Date(now-31*60000).toISOString(),coverage:'partial'}},now).freshness,'Saved snapshot may be stale');
assert.equal(syncSummary({monitoringEnabled:true,canvasSnapshot:{coverage:'partial'}},now).coverage,'Partial course coverage');
console.log('PASS: course selection, time windows, overdue, completion evidence, disabled/stale/partial status');
const {eventId,eventBody,syncCalendar}=await import('./calendar.js');
assert.equal(await eventId(7,1,1),await eventId(7,1,1));
assert.notEqual(await eventId(7,1,1),await eventId(8,1,1));
assert.match(await eventId(7,1,1),/^[0-9a-v]{5,1024}$/);
const body=eventBody({id:1,courseCode:'MAT210'},assignment(1,1),7);
assert.equal(Date.parse(body.start.dateTime),now+3600000);assert.equal(body.reminders,undefined);
assert.match(eventBody({id:1},assignment(1,1,{workflowState:'submitted',submittedAt:'2026-10-05'}),7).summary,/✓ Completed/);
const state={canvasSnapshot:{...snapshot,userId:7,fetchedAt:new Date().toISOString()},calendarConnected:true};
const events=new Map();let calendarCreates=0,patches=0;
globalThis.chrome={runtime:{getManifest:()=>({oauth2:{client_id:'test'}})},identity:{getAuthToken:async()=>({token:'test'}),removeCachedAuthToken:async()=>{}},storage:{local:{get:async()=>state,set:async v=>Object.assign(state,v)}}};
globalThis.fetch=async(url,opts={})=>{
 const path=new URL(url).pathname;const data=opts.body&&JSON.parse(opts.body);
 if(path.endsWith('/calendars')){calendarCreates++;return {ok:true,json:async()=>({id:`course${calendarCreates}`})};}
 if(opts.method==='POST'){events.set(data.id,{...data,etag:'1',reminders:{useDefault:false,overrides:[{method:'popup',minutes:20}]}});return {ok:true,json:async()=>data};}
 const id=path.split('/').at(-1);
 if(!events.has(id))return {ok:false,status:404};
 if(opts.method==='PATCH'){patches++;events.set(id,{...events.get(id),...data});}
 return {ok:true,json:async()=>events.get(id)};
};
const first=await syncCalendar();assert.equal(first.created,7);assert.equal(calendarCreates,2);
const second=await syncCalendar();assert.equal(second.created,0);assert.equal(second.unchanged,7);assert.equal(calendarCreates,2);
state.canvasSnapshot.courses[0].assignments[0].dueAt=new Date(now+2*3600000).toISOString();
await syncCalendar();assert.equal(patches,1);assert.equal(events.get(await eventId(7,1,1)).reminders.overrides[0].minutes,20);
state.canvasSnapshot.courses[0].error='network_error';state.canvasSnapshot.courses[0].assignments[0].dueAt=new Date(now+3*3600000).toISOString();
await syncCalendar();assert.equal(patches,1);
state.canvasSnapshot.fetchedAt='invalid';await assert.rejects(syncCalendar(),/Refresh Canvas/);
console.log('PASS: stable event IDs, repeat sync deduplication, moved deadline, reminder preservation, incomplete-course and stale-snapshot safety');
