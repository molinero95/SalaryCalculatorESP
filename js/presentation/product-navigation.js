// Navigation is presentation state; all sections share the same payroll session.
export function bindProductNavigation(root, onChange, initial = 'salary') {
  const tabs = [...root.querySelectorAll('[data-view]')];
  let view = initial;
  const select = (next, { focus = false } = {}) => {
    if (!tabs.some((tab) => tab.dataset.view === next)) return;
    view = next;
    for (const tab of tabs) {
      const selected = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
    document.body.dataset.view = view;
    onChange(view);
  };
  root.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-view]');
    if (tab && root.contains(tab)) select(tab.dataset.view);
  });
  root.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    select(tabs[next].dataset.view, { focus: true });
  });
  // The caller initializes after rendering the shared form and results.
  return {
    select,
    get view() {
      return view;
    },
  };
}
