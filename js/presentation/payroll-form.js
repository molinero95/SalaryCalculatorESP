// Form adapter: translates browser controls into annual payroll input values.
import { grossAnnualOf } from '../calc.js';
import { MONTHS, AMOUNT_FIELDS, PERIOD_OF_AMOUNT, NUMERIC_INPUTS } from '../domain/payroll-input.js';

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
    form.elements.salary.step = state.input.period === 'perPayment' ? 10 : 100;
  }

  form.addEventListener('input', ({ target }) => {
    const { name, type, value, checked } = target;
    if (!(name in state.input)) return;

    const previousGross = grossAnnualOf(state.input);

    if (type === 'checkbox') state.input[name] = checked;
    else if (NUMERIC_INPUTS.has(name)) state.input[name] = Math.max(0, parseFloat(value) || 0);
    else state.input[name] = value;

    // Amounts are always stored per year
    if (name in PERIOD_OF_AMOUNT) state.input[name] *= amountDivisor(name);
    if (name in AMOUNT_FIELDS) render();

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
