# Canvas Compass

An independent ASU Canvas Chrome extension for exact deadlines, submission status, course filters, local exports, and optional Google Calendar syncing. Not affiliated with ASU, Instructure, or BetterCampus.

## Release status

Version 0.4.1 is a development preview. The earlier Canvas Digest Bridge 0.2.1 was submitted to Chrome Web Store; 0.4.1 is being prepared for review. Google OAuth is currently in testing mode. Do not assume public store availability or unrestricted Calendar sign-in.

## Features

- Opt-in read-only Canvas monitoring and session alerts.
- Short course names, course selection, upcoming/48-hour/7-day/overdue/submitted filters.
- Separate indicators for Canvas session, fresh assignments, and Calendar sync.
- Forest, Midnight, Light, Desert, and sampled Canvas color themes.
- Accessible dropdowns, button feedback, progress indicators, and reduced-motion support.
- Optional Google Calendar sync into dedicated course calendars, with stable assignment IDs and updates for moved deadlines; no event deletion.
- Full local JSON export and optional Pushover notifications.

A grade alone does not prove completion. Submitted work requires explicit submission evidence; check Canvas for revisions, external-tool completion, and late policies. Missing records do not prove cancellation.

## Development installation

Download the repository ZIP, extract it, and load the folder containing manifest.json through Chrome Developer mode → Load unpacked. Sign in to canvas.asu.edu in the same Chrome profile, enable monitoring in Settings, and refresh assignments. Chrome must be running and an ASU Canvas tab available.

The included OAuth client belongs to the store extension ID. An unpacked build needs its own matching Chrome-extension OAuth client and approved testing account. See CALENDAR-SETUP.md. Canvas reading and themes work without Calendar connection. Existing older calendar imports are not automatically merged; clearing local mappings can create additional calendars on reconnect.

## Privacy and support

[Privacy and support](https://canvas-digest-bridge-privacy.mkhaled26.chatgpt.site). Data stays local unless exported or optionally sent to Google Calendar/Pushover. No developer data server, analytics, credential collection, cookie export, remote code, or Canvas submissions. Never post coursework snapshots, keys, or account details in public issues.

## Validation

Run node tests.mjs with Node.js. Automated filter and Calendar mock tests pass. Local UI fixture checks pass; Mohamad reported successful live Canvas/Calendar operation on October 6, 2026. Live provider event counts were not independently captured. See VALIDATION.md.

## License

No open-source license has been granted. Public source availability does not itself grant reuse rights; contact the publisher.
