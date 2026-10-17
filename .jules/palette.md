## 2026-10-17 - Fix React Testing Library warning
**Learning:** `CityCombobox.test.tsx` throws an "An update to CityCombobox inside a test was not wrapped in act(...)" warning.
**Action:** When updating React state in tests with `@testing-library/react`, wrap `fireEvent` inside `act(...)`.
