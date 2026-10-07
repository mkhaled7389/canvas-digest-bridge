if (!globalThis.__canvasDigestBridgeLoaded) {
globalThis.__canvasDigestBridgeLoaded = true;
function captureTheme() {
  const body=getComputedStyle(document.body), root=getComputedStyle(document.documentElement);
  const pick=(names,fallback)=>names.map(n=>root.getPropertyValue(n).trim()).find(Boolean)||fallback;
  void chrome.storage.local.set({canvasTheme:{pine:body.backgroundColor,panel:pick(['--ic-brand-primary'],body.backgroundColor),ink:body.color,mint:pick(['--ic-brand-button--primary-bgd','--ic-brand-primary'],'#c4e7b7')}}).catch(()=>{});
}
captureTheme();
let themeTimer;
new MutationObserver(()=>{clearTimeout(themeTimer);themeTimer=setTimeout(captureTheme,500);}).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme'],subtree:true});
async function sessionStatus() {
  if (!(await chrome.storage.local.get('monitoringEnabled')).monitoringEnabled) return { state: 'disabled', detail: 'Enable monitoring in Settings.' };
  try {
    const response = await fetch('/api/v1/users/self/profile', {
      signal: AbortSignal.timeout(15000), credentials: 'include',
      headers: { accept: 'application/json' }
    });
    if (response.status === 401 || response.redirected) {
      return { state: 'signed_out', detail: 'Canvas redirected or rejected the signed-in profile check.' };
    }
    if (!response.ok) return { state: 'unknown', detail: `Canvas profile check returned ${response.status}.` };
    const profile = await response.json();
    return { state: 'signed_in', detail: `Connected as ${profile.name || 'ASU student'}.`, userId: profile.id };
  } catch {
    return { state: 'unknown', detail: 'Could not reach Canvas from this tab.' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CHECK_CANVAS_SESSION') {
    sessionStatus().then(sendResponse);
    return true;
  }
});

sessionStatus().then((status) => chrome.runtime.sendMessage({ type: 'CANVAS_STATUS', status })).catch(() => {});

async function fetchAllCanvasPages(initialPath) {
  const entries = [];
  let path = initialPath;
  for (let page = 0; path && page < 20; page += 1) {
    try {
      const url = new URL(path, 'https://canvas.asu.edu/');
      if (url.origin !== 'https://canvas.asu.edu') return { error: 'unexpected_origin', entries };
      const response = await fetch(url.href, { signal: AbortSignal.timeout(15000), credentials: 'include', headers: { accept: 'application/json' } });
      if (response.redirected) return { error: 'redirected', entries };
      if (!response.ok) return { error: response.status, entries };
      const data = await response.json();
      if (!Array.isArray(data)) return { error: 'invalid_response', entries };
      entries.push(...data);
      const link = response.headers.get('link') || '';
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      path = match ? match[1] : null;
    } catch (error) {
      return { error: error instanceof SyntaxError ? 'invalid_json' : 'network_error', entries };
    }
  }
  return { entries, error: path ? 'pagination_limit' : null };
}

async function canvasSnapshot() {
  if (!(await chrome.storage.local.get('monitoringEnabled')).monitoringEnabled) return { error: 'monitoring_disabled' };
  const identity = await sessionStatus();
  if (identity.state !== 'signed_in') return { error: identity.state }; 
  const courseResult = await fetchAllCanvasPages('/api/v1/courses?enrollment_state=active&include[]=term&per_page=100');
  if (courseResult.error === 401) return { error: 'signed_out' };
  if (courseResult.error) return { error: `courses_${courseResult.error}` };
  const courses = courseResult.entries;
  const activeCourses = courses.filter((course) => course && course.id && !course.concluded);
  const results = await Promise.all(activeCourses.map(async (course) => {
    const result = await fetchAllCanvasPages(`/api/v1/courses/${encodeURIComponent(course.id)}/assignments?include[]=submission&per_page=100`);
    return {
      course: { id: course.id, name: course.name, courseCode: course.course_code },
      assignments: result.entries.map((a) => ({
        id: a.id, name: a.name, dueAt: a.due_at, htmlUrl: a.html_url,
        availableAt: a.unlock_at, lockAt: a.lock_at, pointsPossible: a.points_possible, hasSubmittedSubmissions: a.has_submitted_submissions,
        submission: a.submission ? {
          workflowState: a.submission.workflow_state, submittedAt: a.submission.submitted_at, excused: a.submission.excused
        } : null
      })),
      error: result.error || null
    };
  }));
  return { userId: identity.userId, fetchedAt: new Date().toISOString(), coverage: results.some((r) => r.error) ? 'partial' : 'complete visible active courses', courses: results };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'REFRESH_CANVAS_SNAPSHOT') {
    canvasSnapshot().then(sendResponse).catch(() => sendResponse({ error: 'snapshot_error' }));
    return true;
  }
});

}
