## 2024-05-03 - Input Fields Need Aria Labels
**Learning:** Relying solely on `placeholder` attributes for input fields is insufficient for accessibility, as screen readers may not consistently read them, leaving users without context.
**Action:** Always ensure that `<input>` fields have an explicit `aria-label` or an associated `<label>` to properly identify their purpose to assistive technologies.
