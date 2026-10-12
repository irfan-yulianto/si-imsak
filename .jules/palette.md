## 2024-10-12 - Added tooltip for disabled month navigation buttons
**Learning:** Found month navigation buttons (`Bulan sebelumnya`, `Bulan berikutnya`) that can be disabled. Disabled interactive elements suppress pointer events and prevent tooltips from appearing on hover if not handled.
**Action:** Wrap disabled interactive elements like navigation buttons in a `span` with an explanatory `title` (or an `aria-description`) so users know *why* the button is disabled (e.g. "Jadwal tahun lalu tidak tersedia"). This improves accessibility and UX.
