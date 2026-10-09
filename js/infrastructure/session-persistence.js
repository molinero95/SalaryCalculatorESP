// Debounced repository writes; page lifecycle registration belongs to the browser shell.
export function createSessionPersistence(
  repository,
  state,
  { delay = 300, schedule = setTimeout, cancel = clearTimeout } = {},
) {
  let timer;
  return {
    schedule() {
      cancel(timer);
      timer = schedule(() => {
        timer = undefined;
        repository.saveState(state);
      }, delay);
    },
    flush() {
      cancel(timer);
      timer = undefined;
      repository.saveState(state);
    },
  };
}
