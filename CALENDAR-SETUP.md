# Publisher Google Calendar setup

Version 0.4.0 is a development candidate. Calendar sync is implemented but cannot connect until the publisher registers an OAuth client. Users of the finished store build should just click Connect Google; they should not create their own Cloud projects.

1. Create a Google Cloud project at https://console.cloud.google.com/ and enable Google Calendar API.
2. Configure Google Auth Platform branding, public privacy-policy URL, support email and audience. Start with Testing and add your test Google account.
3. In Data Access, add only `https://www.googleapis.com/auth/calendar.app.created`. The extension manages calendars it creates; it does not read the user's existing schedule or modify unrelated calendars.
4. Create an OAuth client of type **Chrome Extension**, using the extension ID for the build you test. The store item ID is `abmjeefnafmbogajjaigncakbgdfheai`; a separately loaded unpacked extension may have a different ID. Use the ID displayed in chrome://extensions. Never supply a client secret.
5. From this source folder run `node configure-calendar.mjs YOUR_PUBLIC_CLIENT_ID.apps.googleusercontent.com`. Reload the extension.
6. Enable Canvas monitoring and refresh assignments; Settings → Google Calendar → Connect Google. Review Google's consent and account before granting access, then Sync now. Chrome identity uses the Google account available to that Chrome profile; use a profile with the intended calendar account. Verify exact due times, submission labels and one separate calendar per selected course.
7. Repeat sync: no duplicates should appear. Change a test deadline, refresh and sync: the same event should move, retaining reminders. Turn on automatic syncing only after that check.
8. Before public release, satisfy Google's OAuth production/verification requirements as shown in your console, update the public privacy page and Chrome Web Store permission/data disclosures, and test the store-ID build. Do not publish this development package as production-ready without those steps.

Automatic sync runs after successful Canvas refreshes while Chrome is running and authentication works. It is not a hosted calendar subscription or a promise of background delivery when Chrome is closed. Completed/excused work is marked ✓ Completed, retaining its original deadline. Undated work is skipped. Partial courses are skipped without deleting their events. Stable assignment/user/course IDs prevent duplicate inserts. Old manually imported calendars are not silently migrated.

Disconnect stops automatic sync and clears the cached access token; it does not revoke the Google account grant or remove existing calendars. Revoke the account grant through your Google account permissions if desired. Clear local data removes calendar mappings; reconnecting afterward may create fresh course calendars, so remove or retain previous calendars deliberately. If calendar creation was interrupted, provisioning stays paused: inspect Google Calendar and repair the local mapping before retrying. There is no automatic retry of uncertain calendar creation.

Official references: https://developer.chrome.com/docs/extensions/reference/api/identity and https://developers.google.com/workspace/calendar/api/auth
