// A stand-in for the sliver of the Web Locks API that tabIdentity.ts uses:
// request(name, { ifAvailable: true }, callback), where the callback receives
// null if a lock is already held and the lock is released when the promise the
// callback returns settles.
//
// That is the entire contract tab identity depends on — "is a live document
// already using this id" — so modelling more would be modelling the browser
// rather than the code. Real locks are released when a *document* is
// destroyed; here a test releases them explicitly, which is how it plays the
// part of a second tab that is still open.
type Held = { name: string; release: () => void };

export function installFakeWebLocks() {
  const held = new Set<string>();

  const request = (
    name: string,
    options: { ifAvailable?: boolean },
    callback: (lock: unknown) => Promise<unknown> | undefined
  ): Promise<unknown> => {
    if (options?.ifAvailable && held.has(name)) {
      return Promise.resolve(callback(null));
    }
    held.add(name);
    const result = callback({ name });
    // The caller holds by returning a promise that never settles; releasing on
    // settle mirrors the real API for the cases that do settle.
    void Promise.resolve(result).then((): void => void held.delete(name));
    return Promise.resolve(result);
  };

  (globalThis.navigator as { locks?: unknown }).locks = { request };

  return {
    // Play another tab that already holds this id's lock.
    hold(name: string): Held {
      held.add(name);
      return { name, release: (): void => void held.delete(name) };
    },
    isHeld(name: string): boolean {
      return held.has(name);
    },
    heldNames(): string[] {
      return [...held].sort();
    },
    uninstall(): void {
      delete (globalThis.navigator as { locks?: unknown }).locks;
    },
  };
}

// For the branch where the API is absent entirely (older browsers), which
// tabIdentity treats as "assume the id is ours".
export function removeWebLocks(): void {
  delete (globalThis.navigator as { locks?: unknown }).locks;
}
