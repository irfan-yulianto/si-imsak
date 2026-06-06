## 2024-06-06 - Accessible Clear Buttons in Search Inputs
**Learning:** Search inputs that dynamically filter data and display dropdowns significantly benefit from an absolute positioned, icon-only clear button. It saves users from repeatedly pressing backspace. Providing `aria-label="Hapus pencarian"` handles localization, and immediately refocusing the input after clearing keeps keyboard navigation uninterrupted.
**Action:** Always include a localized, keyboard-accessible clear button inside search inputs with sufficient padding right (e.g., `pr-9`) to prevent text overlap.
