## $(date +%Y-%m-%d) - Adding ARIA Labels to Search Inputs
**Learning:** Screen readers cannot reliably rely on `placeholder` attributes for context when an explicit `<label>` element is missing. The `aria-label` attribute serves as a vital fallback to ensure form accessibility.
**Action:** Always provide an explicit `aria-label` attribute for `<input>` fields that lack a visible `<label>`, particularly on search inputs.
