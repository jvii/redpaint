import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { installFakeWebLocks, removeWebLocks } from '../fakeWebLocks';

// tabIdentity settles its id once per page load and caches it in a module
// variable, so each test needs a fresh module — the same way a fresh page load
// would get one.
async function freshModule(): Promise<typeof import('../../src/persistence/tabIdentity')> {
  vi.resetModules();
  return import('../../src/persistence/tabIdentity');
}

const TAB_KEY = 'redpaint.tabId';
const lockNameFor = (id: string): string => `redpaint.tab.${id}`;

describe('tab identity', () => {
  let locks: ReturnType<typeof installFakeWebLocks>;

  beforeEach((): void => {
    window.sessionStorage.clear();
    locks = installFakeWebLocks();
  });
  afterEach((): void => {
    locks.uninstall();
  });

  test('a first visit mints an id and takes its lock', async () => {
    const { ensureTabId } = await freshModule();
    const id = await ensureTabId();

    expect(id).toBeTruthy();
    expect(window.sessionStorage.getItem(TAB_KEY)).toBe(id);
    expect(locks.isHeld(lockNameFor(id))).toBe(true);
  });

  // The case every previous mechanism got wrong: a reload inherits the id from
  // sessionStorage, and nothing else is holding it, so it must be kept.
  test('a reload keeps the inherited id', async () => {
    window.sessionStorage.setItem(TAB_KEY, 'inherited-id');
    const { ensureTabId } = await freshModule();

    expect(await ensureTabId()).toBe('inherited-id');
    expect(window.sessionStorage.getItem(TAB_KEY)).toBe('inherited-id');
  });

  // Duplicate Tab, window.open and links all copy sessionStorage, so the copy
  // arrives holding an id whose lock the original still has.
  test('a duplicate whose id is already held takes a fresh one', async () => {
    window.sessionStorage.setItem(TAB_KEY, 'original-id');
    locks.hold(lockNameFor('original-id')); // the tab we were copied from
    const { ensureTabId } = await freshModule();

    const id = await ensureTabId();
    expect(id).not.toBe('original-id');
    expect(window.sessionStorage.getItem(TAB_KEY)).toBe(id);
    // and it holds its own, so a copy of *this* tab would be caught in turn
    expect(locks.isHeld(lockNameFor(id))).toBe(true);
    // the original's lock is untouched
    expect(locks.isHeld(lockNameFor('original-id'))).toBe(true);
  });

  // How the copy is detected must not depend on how it navigated: the
  // navigation-type heuristic this replaced classified Duplicate Tab as a
  // reload, since duplicating restores the session history, and let the copy
  // keep the id.
  test('detection does not depend on the navigation type', async () => {
    const asReload = { type: 'reload' } as PerformanceNavigationTiming;
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([asReload]);
    window.sessionStorage.setItem(TAB_KEY, 'original-id');
    locks.hold(lockNameFor('original-id'));

    const { ensureTabId } = await freshModule();
    expect(await ensureTabId()).not.toBe('original-id');
    vi.restoreAllMocks();
  });

  test('the id settles once and is stable across calls', async () => {
    const { ensureTabId } = await freshModule();
    const first = await ensureTabId();
    expect(await ensureTabId()).toBe(first);
  });

  test('tabId reports the settled id, and the inherited one before it settles', async () => {
    window.sessionStorage.setItem(TAB_KEY, 'inherited-id');
    const { ensureTabId, tabId } = await freshModule();

    expect(tabId()).toBe('inherited-id'); // best guess, before ensureTabId runs
    const id = await ensureTabId();
    expect(tabId()).toBe(id);
  });

  test('with no id anywhere, tabId falls back rather than throwing', async () => {
    const { tabId } = await freshModule();
    expect(tabId()).toBe('unclaimed');
  });

  // No Web Locks (older browsers): keep the inherited id, since the question
  // cannot be asked and a reload is the overwhelmingly common case.
  test('without the locks API the inherited id is kept', async () => {
    removeWebLocks();
    window.sessionStorage.setItem(TAB_KEY, 'inherited-id');
    const { ensureTabId } = await freshModule();

    expect(await ensureTabId()).toBe('inherited-id');
  });

  // Blocked site data throws on access rather than returning null.
  test('sessionStorage throwing does not stop an id being settled', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((): never => {
      throw new Error('site data blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((): never => {
      throw new Error('site data blocked');
    });

    const { ensureTabId } = await freshModule();
    await expect(ensureTabId()).resolves.toBeTruthy();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
