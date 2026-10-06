export function shortCourse(course) {
  const match = `${course.courseCode || ''} ${course.name || ''}`.match(/\b([A-Z]{2,5})\s*(\d{3})\b/i);
  return match ? `${match[1].toUpperCase()} ${match[2]}` : (course.courseCode || course.name || 'Canvas');
}
export function completed(a) {
  return !!(a.submission?.excused || (a.submission?.submittedAt && ['submitted', 'graded'].includes(a.submission?.workflowState)));
}
export function filterDeadlines(snapshot, { selectedCourseIds = null, filter = 'upcoming', now = Date.now() } = {}) {
  return (snapshot?.courses || []).filter(({course}) => selectedCourseIds === null || selectedCourseIds.includes(String(course.id)))
    .flatMap(({course, assignments}) => (assignments || []).map(a => ({...a, course: shortCourse(course)})))
    .filter(a => {
      const due = Date.parse(a.dueAt);
      if (filter === 'completed') return completed(a);
      if (!Number.isFinite(due) || completed(a)) return false;
      if (filter === 'overdue') return due < now;
      if (due < now) return false;
      return filter === '48h' ? due <= now + 48 * 3600000 : filter === '7d' ? due <= now + 7 * 86400000 : true;
    }).sort((a,b) => (Date.parse(a.dueAt) || Infinity) - (Date.parse(b.dueAt) || Infinity));
}
export function syncSummary({monitoringEnabled, canvasStatus = {}, canvasSnapshot = {}, canvasRefreshStatus = {}}, now = Date.now()) {
  const state = monitoringEnabled ? (canvasStatus.state || 'unknown') : 'disabled';
  const fetched = Date.parse(canvasSnapshot.fetchedAt);
  const freshness = !Number.isFinite(fetched) ? 'No saved snapshot' : now - fetched > 30 * 60000 ? 'Saved snapshot may be stale' : 'Recently fetched snapshot';
  return {state, freshness, coverage: canvasSnapshot.coverage === 'partial' ? 'Partial course coverage' : canvasSnapshot.coverage || 'Coverage not checked', error: canvasRefreshStatus.error || null};
}
