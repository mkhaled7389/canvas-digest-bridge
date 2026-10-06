# Validation

0.2.1 base: live ASU sign-in and assignment refresh tested. Public candidate monitoring was disabled after the test. Exact deadline examples matched the signed-in dashboard. Pushover delivery and clear-data races were not live tested.

0.3.0: meaningful filter/status unit tests and JavaScript syntax checks pass. Browser smoke test with synthetic assignments passed: 48-hour filtering, course exclusion, reset-all, overdue view, and disabled/stale/partial status. Live ASU testing of 0.3.0 remains required before a store update. Tests cover distinct time windows, an empty course selection, a selected course, overdue work, and a graded assignment without submission evidence.

No private coursework snapshots or credentials are included in this repository.
