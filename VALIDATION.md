# Validation

0.2.1 base: live ASU sign-in and assignment refresh tested. Public candidate monitoring was disabled after the test. Exact deadline examples matched the signed-in dashboard. Pushover delivery and clear-data races were not live tested.

0.3.0: meaningful filter/status unit tests and JavaScript syntax checks pass. Browser smoke test with synthetic assignments passed: 48-hour filtering, course exclusion, reset-all, overdue view, and disabled/stale/partial status. Live ASU testing of 0.3.0 remains required before a store update. Tests cover distinct time windows, an empty course selection, a selected course, overdue work, and a graded assignment without submission evidence.

No private coursework snapshots or credentials are included in this repository.

## 0.4.0 development validation
Mock Calendar integration checks: initial inserts, repeated sync without duplicate events, changed due time updates, preserved reminders, partial-course skipping, stale snapshot rejection. Live Google OAuth/calendar tests remain pending publisher client registration. Preset selection and Forest/Midnight/Light layouts checked in a browser with synthetic settings. Live Canvas color matching remains pending. Existing Web Store 0.2.1 submission is unchanged.

October 6 UI polish: custom native-select indicator, button press feedback, busy labels/spinners, reduced-motion support. JS syntax and existing tests passed. Local UI fixture verified sync loading and button recovery; not proof of live Google writes.
