// Form adapter: translates browser controls into annual payroll input values.
import { grossAnnualOf } from '../calc.js';
import { MONTHS, AMOUNT_FIELDS, PERIOD_OF_AMOUNT, NUMERIC_INPUTS } from '../domain/payroll-input.js';
import { selectResidence } from '../domain/residence.js';
import { renderResidenceOptions } from './residence.js';

export function bindPayrollForm(form, state, onChange) {
  /** Divisor to show a stored annual amount in the period chosen in the form. */
  const amountDivisor = (field) => (state.input[PERIOD_OF_AMOUNT[field]] === 'monthly' ? MONTHS : 1);

  function render() {
    for (const [name, value] of Object.entries(state.input)) {
      const control = form.elements[name];
      if (!control) continue;
      if (control.type === 'checkbox') control.checked = value;
      else if (name in PERIOD_OF_AMOUNT) control.value = String(Math.round((value / amountDivisor(name)) * 100) / 100);
      else control.value = String(value);
    }
    renderResidenceOptions(form, state.input);
    form.elements.salary.step = state.input.period === 'perPayment' ? 10 : 100;
  }

  form.addEventListener('input', ({ target }) => {
    const { name, type, value, checked } = target;
    if (['residence', 'residenceTerritory', 'residenceCity'].includes(name)) {
      const residence = selectResidence(state.input, name, value);
      if (!residence) return;
      if (residence.region !== state.input.region) {
        state.input.foralChildrenConfirmed = false;
        state.input.foralAscendantsConfirmed = false;
        state.input.foralAnnualConfirmed = false;
      }
      Object.assign(state.input, residence);
      render();
      onChange();
      return;
    }
    if (!(name in state.input)) return;

    const previousGross = grossAnnualOf(state.input);
    if (['dependents65', 'dependents75', 'foralAscendantsUnder65', 'foralAscendantClaimants'].includes(name))
      state.input.foralAscendantsConfirmed = false;
    if (
      name.startsWith('foralRental') ||
      [
        'foralExemptIncome',
        'foralActivityIncome',
        'foralSavingsIncome',
        'foralOtherWithholding',
        'foralRentPaid',
        'foralRentEnhanced',
      ].includes(name)
    )
      state.input.foralAnnualConfirmed = false;
    if (name === 'children') state.input.foralChildrenConfirmed = false;

    if (type === 'checkbox') state.input[name] = checked;
    else if (NUMERIC_INPUTS.has(name)) state.input[name] = Math.max(0, parseFloat(value) || 0);
    else state.input[name] = value;

    // Amounts are always stored per year
    if (name in PERIOD_OF_AMOUNT) state.input[name] *= amountDivisor(name);
    if (name in AMOUNT_FIELDS || name === 'children') render();

    // Switching period or number of payments keeps the same gross annual salary
    if (name === 'period' || name === 'payments') {
      const { period, payments } = state.input;
      state.input.salary = period === 'perPayment' ? Math.round((previousGross / payments) * 100) / 100 : previousGross;
      render();
    }

    onChange();
  });

  return render;
}
