# Proposal scope review

Reviewed 9 October 2026. Templates are hypothetical partial implementations, not enacted law or predictions of final legislation.

## Vox: bill 122/000084

Primary source: [BOCG series B 98-1, 12 April 2024](https://www.congreso.es/public_oficiales/L15/CONG/BOCG/B/BOCG-15-B-98-1.PDF), printed pages 5–7. The tables are embedded images: plain PDF text extraction omits them. Inspect the rendered pages before interpreting rates.

- Page 5 changes article 57 to a €22,000 taxpayer minimum, retaining age increments.
- Page 6 changes article 63 to **annual state** rates: 15% up to €70,000 and 25% above, with a published €10,500 quota at the threshold, before minimum deduction. Article 63 bis reduces these state rates four percentage points per child, with a zero floor.
- Page 7 changes article 101 to a **separate payroll withholding** scale: 15% up to €70,000, 25% above. Adding a general regional reference to that withholding table was incorrect and has been removed. Article 63 bis relief is not inferred into article 101; child minima still affect withholding.
- Regional rates are not replaced by this bill. The model retains explicitly fixed regional minima and uses the proposed national article 57 minimum for communities without overrides. This is the model's interpretation of the national change alongside existing regional laws; no later regional-law adaptations are assumed. The regional overrides and age-specific Balears value are in `regions.js`/`tax.js`.

The proposed withholding scale still refers to a regulatory procedure. The calculator retains current employment deductions, exemption thresholds, caps, truncation and temporary-contract assumptions; it does not claim to model future implementing regulations. Birth cheques and other measures outside the income-tax engine are excluded. Accordingly Vox is marked `partial`.

For Madrid, base €26,050, taxpayer under 65 with no descendants: state quota is `(26,050 - 22,000) × 15% = €607.50`; regional quota uses the Madrid scale and €5,956.65 regional taxpayer minimum, giving total annual tax €2,742.52. With €30,000 gross and €1,950 employee contributions, the proposed retained regulatory withholding model truncates 2.025% to 2.02%, withholding €606. The annual balance can therefore be a payment, not a refund.

## Sumar: 2023 programme

Primary source: [Un programa para ti](https://movimientosumar.es/wp-content/uploads/2023/07/Un-Programa-para-ti.pdf). The existing partial template represents the 52% combined top marginal rate above €300,000, retaining intervening baseline rates because the programme does not provide a complete replacement scale. It does not specify a new payroll withholding procedure; current withholding is retained rather than deriving one from the annual top rate. Regional adjustments remain those of the common-regime engine. This is a limited scenario, not every fiscal measure in the programme.

## Editing and compatibility

`incomeTax.brackets` remains the editable combined annual reference scale; its general regional reference is subtracted to derive the state share and the selected community's scale is then used annually. Legacy scenarios keep their existing shared annual/withholding behaviour when `useSeparateWithholding` is false or absent. Newly loaded reviewed templates use `useSeparateWithholding: true` plus editable `withholdingBrackets`. Existing saved user scenarios are not silently rewritten; reload the proposal to adopt updated template rules.

Cards show annual payroll net separately from net after the estimated tax return. The regional selection affects annual assessment, not the national payroll withholding procedure. Pension cash contributions and supported filing assumptions still apply as documented in fiscal-validation.md.

Independent quota/threshold and integration tests: `tests/proposal-scope.test.js`; browser persistence/editor/card checks: `e2e/quality.spec.js`. Coverage and passing cases are not proof that a political proposal is complete.
