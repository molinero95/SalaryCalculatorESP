# Working on SalaryCalculatorESP

Read this file first. It applies to the whole repository. User instructions take precedence; do not infer permission to publish or merge from this document alone.

## Read next

1. [Project context and architecture](docs/AI_CONTEXT.md).
2. [Development and validation](CONTRIBUTING.md).
3. For calculation changes: [fiscal validation and scope](docs/fiscal-validation.md).
4. For proposals or monitoring: [template maintenance](docs/template-maintenance.md).
5. [Decisions and next work](docs/ROADMAP.md).

## Ground rules

- The product is a static Spanish payroll estimator and fiscal proposal simulator. Preserve its offline operation, editable scenarios and five languages.
- Use English identifiers and code comments. UI strings belong in all five dictionaries (`es`, `ca`, `eu`, `gl`, `en`). Communicate with the user in their language.
- Keep calculation code pure and DOM-free. Put fiscal rules in `js/tax.js`, payroll orchestration in `js/calc.js`, defaults/data in their existing modules and UI behaviour in `js/app.js`/rendering modules.
- This is AI-assisted software. Preserve the README warnings about possible inaccuracies. Tests and coverage do not establish fiscal certification.
- Verify fiscal updates against primary sources. Record the applicable year, publication date, rule, eligibility and assumptions. Distinguish enacted law from political proposals and annual assessment from payroll withholding.
- Never fill missing political rates or eligibility conditions with invented facts. Mark incomplete models explicitly. A successful download is not human verification.
- Edit `data/proposals.json`, then run `npm run templates:build`. Do not edit generated `js/data/proposals.js` directly. Review the generated diff and run `npm run templates:check`.
- Preserve import/export compatibility and saved user scenarios. Normalize imported values, escape user text and keep shared URLs free from unrequested personal-data disclosure.
- When changing app-shell modules/assets, review `sw.js` precaching and bump the cache version for changed cached files. Test a full offline reload.
- Do not add frameworks, runtime packages, backend services, paid APIs or credentials without a concrete task requirement. Existing tooling packages are development dependencies.
- Do not regenerate screenshot baselines merely to make tests pass. Existing snapshots use macOS fonts; Linux differences require platform-aware investigation.
- Prefer focused changes. Add independent expected-value regression tests for fiscal fixes; do not derive expected results from the same production constants/function under test.

## Finish a task

Run the checks appropriate to your change from CONTRIBUTING.md. State what changed, validation actually executed, unresolved limitations and any CI failures. Inspect PR review findings and CI before a merge when merging is authorized. Never report skipped, unavailable or pending checks as passing. Keep documentation in sync with changed behaviour; avoid recording transient test counts as a permanent contract.
