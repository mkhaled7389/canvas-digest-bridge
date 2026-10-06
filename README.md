# Canvas Digest Bridge

An independent, read-only Chrome extension for **ASU Canvas**. Not affiliated with ASU, Instructure, or BetterCampus.

## Version status
- **0.2.1**: submitted to Chrome Web Store; pending review as of October 6, 2026. Not publicly installable from the store yet.
- **0.3.0**: development version in this repository. Adds course selection, deadline filters, and clearer sync status. Not submitted to the store.

## Features
- Opt-in session monitoring while Chrome runs; desktop sign-out notifications.
- Course checkboxes and Upcoming / Next 48 hours / Next 7 days / Overdue / Submitted-excused filters.
- Exact saved Canvas deadlines displayed in Arizona time, with links to assignments.
- Monitoring disabled, session check, snapshot freshness, and partial-coverage status shown separately.
- Local full-snapshot JSON export. Display filters do not remove data from exports.
- Optional Pushover sign-out alerts using your own keys.

A grade alone is not completion evidence. Submitted work requires a submission timestamp plus submitted/graded state; excused work is separately treated as inactive. Overdue means the saved deadline passed and completion is unverified. Check Canvas for revisions, resubmissions, late policies, and external-tool work.

## Install the development version
Download this repository ZIP and extract it. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Open Settings and enable monitoring, sign in at https://canvas.asu.edu in the same Chrome profile, then refresh assignments.

An open ASU Canvas tab is required. Chrome sleep, network outages, SSO expiration, and Canvas availability can delay checks. Old courses/organizations may appear among active enrollments; deselect them in the view. Coverage describes only fetched visible active courses. Missing items in a partial snapshot do not prove cancellation or completion.

## Privacy
Collection starts only after you enable monitoring. Snapshots and preferences remain in Chrome local storage until exported or cleared. Optional Pushover sends short sign-out/test messages and configured notification keys, not coursework. No analytics, remote code, ASU passwords, or cookie exports.

[Privacy and support](https://canvas-digest-bridge-privacy.mkhaled26.chatgpt.site). Please never upload coursework snapshots, credentials, or personal account details to public issues.

This extension does not log you in, bypass MFA, submit assignments, sync Google Calendar, read mail, or send a personalized digest.

## Development
No dependencies or build step. Run `npm test` with Node.js, or `node tests.mjs`. Load the repository folder directly into Chrome for UI testing. Version 0.3.0's data/filter tests and browser smoke test with synthetic assignments pass; live ASU testing remains required before a store update. See VALIDATION.md. Keep the submitted store package separate from development work.

## License
No open-source license has been granted yet. Public source availability does not itself grant redistribution or modification rights. Contact the publisher about reuse.
