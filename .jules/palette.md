## 2026-11-10 - Disable Button Tooltips

**Learning:** Disabled buttons lose their tooltips natively, and users might not know why they are disabled. Adding a title fallback helps explain it, or at least shows it's disabled.
**Action:** Replace the native `disabled` attribute with `aria-disabled="true"` in the core `Button.tsx` and block clicks manually so disabled buttons remain focusable and can show their titles.
