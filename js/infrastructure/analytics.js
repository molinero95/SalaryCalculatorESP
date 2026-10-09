// Anonymous event adapter. A bounded queue covers an asynchronously loaded counter.
export function createEventTracker(getCounter, { maxQueued = 20 } = {}) {
  const pending = [];
  function flush() {
    const counter = getCounter();
    if (typeof counter?.count !== 'function') return;
    while (pending.length) {
      const name = pending.shift();
      try {
        counter.count({ path: name, title: name, event: true });
      } catch {
        // Analytics failures must never interrupt calculation or user actions.
      }
    }
  }
  return {
    track(name) {
      if (typeof name !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(name)) return;
      pending.push(name);
      if (pending.length > maxQueued) pending.shift();
      flush();
    },
    flush,
  };
}
