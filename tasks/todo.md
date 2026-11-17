# Permanently Remove English (Thai Only)

- [x] 1. Disable / remove LanguageToggle component (`web/src/components/layout/LanguageToggle.tsx`)
- [x] 2. Lock i18n to Thai only (`web/src/i18n/index.ts`)
- [x] 3. Update tests expecting English language toggle:
  - [x] `web/tests/pages.test.tsx` (remove EN landing page test, expect 0 buttons on landing)
  - [x] `web/tests/frontal.test.tsx` (remove language switch tests)
  - [x] `web/tests/profile.test.tsx` (remove language switch tests)
  - [x] `web/tests/report.test.tsx` (remove language switch tests)
- [x] 4. Verified code diffs and strict Thai-only configuration
