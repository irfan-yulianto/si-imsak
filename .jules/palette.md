## 2024-08-24 - Missing aria-label for non-icon buttons
**Learning:** Some buttons with visible text like "Coba Lagi" or "Hari Ini" can benefit from more descriptive `aria-label` attributes to provide better context to screen reader users (e.g., "Coba lagi memuat jadwal" instead of just "Coba Lagi").
**Action:** When inspecting buttons, verify if the visible text is sufficient for screen readers out of context. Add descriptive `aria-label` where needed.
