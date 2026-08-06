import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { installFakeIndexedDb } from '../fakeIndexedDb';
import { installFakeWebLocks } from '../fakeWebLocks';

// Both the tab id and the IndexedDB connection are settled once per page load
// and cached in module variables, so every test takes a fresh module graph.
async function freshModule(): Promise<typeof import('../../src/persistence/documentAutosave')> {
  vi.resetModules();
  return import('../../src/persistence/documentAutosave');
}

const TAB_KEY = 'redpaint.tabId';
const TAB = 'tab-under-test';

// A record the validator will accept: packed, so one byte per pixel.
function record(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    version: 1,
    width: 4,
    height: 3,
    pixels: new Uint8Array(12),
    packed: true,
    palette: [{ r: 0, g: 0, b: 0 }],
    ranges: [],
    screenFormatId: null,
    videoStandard: 'PAL',
    trueColorEnabled: false,
    documentName: '',
    modified: false,
    savedAt: Date.now(),
    ...over,
  };
}

describe('document autosave', () => {
  let idb: ReturnType<typeof installFakeIndexedDb>;
  let locks: ReturnType<typeof installFakeWebLocks>;

  beforeEach((): void => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(TAB_KEY, TAB); // a settled tab, as a reload has
    idb = installFakeIndexedDb();
    locks = installFakeWebLocks();
  });
  afterEach((): void => {
    idb.uninstall();
    locks.uninstall();
  });

  describe('round trip', () => {
    test('a saved document comes back to the tab that saved it', async () => {
      const { saveDocument, loadDocument } = await freshModule();
      await saveDocument(record({ documentName: 'seascape' }) as never);

      const back = await loadDocument();
      expect(back?.documentName).toBe('seascape');
      expect(back?.width).toBe(4);
    });

    test('savedAt is stamped by the writer, not the caller', async () => {
      const { saveDocument } = await freshModule();
      const before = Date.now();
      await saveDocument({ ...record(), savedAt: 1 } as never);

      const stored = idb.get(`doc:${TAB}`) as { savedAt: number };
      expect(stored.savedAt).toBeGreaterThanOrEqual(before);
    });

    test('another tab s record is not restored', async () => {
      const { loadDocument } = await freshModule();
      idb.seed('doc:some-other-tab', record({ documentName: 'theirs' }));

      expect(await loadDocument()).toBeNull();
    });
  });

  // Anything read back is untrusted: an older build's, or a half-written one.
  describe('validation', () => {
    const rejects = async (over: Partial<Record<string, unknown>>): Promise<void> => {
      const { loadDocument } = await freshModule();
      idb.seed(`doc:${TAB}`, record(over));
      expect(await loadDocument()).toBeNull();
    };

    test('a record from another version', () => rejects({ version: 2 }));
    test('a zero dimension', () => rejects({ width: 0 }));
    test('a non-integer dimension', () => rejects({ height: 2.5 }));
    test('an empty palette', () => rejects({ palette: [] }));
    test('pixels that are not a Uint8Array', () => rejects({ pixels: [1, 2, 3] }));

    // The check that catches a truncated write, which is otherwise a
    // plausible-looking record that paints garbage.
    test('a packed raster of the wrong length', () => rejects({ pixels: new Uint8Array(11) }));
    test('an unpacked raster measured as if packed', () =>
      rejects({ packed: false, pixels: new Uint8Array(12) }));

    test('an unpacked raster of the right length is accepted', async () => {
      const { loadDocument } = await freshModule();
      idb.seed(`doc:${TAB}`, record({ packed: false, pixels: new Uint8Array(4 * 3 * 4) }));
      expect(await loadDocument()).not.toBeNull();
    });

    test('an unusable record of ours is dropped, not left to be retried', async () => {
      const { loadDocument } = await freshModule();
      idb.seed(`doc:${TAB}`, record({ version: 99 }));

      await loadDocument();
      expect(idb.keys()).not.toContain(`doc:${TAB}`);
    });
  });

  describe('the restore marker', () => {
    test('is set before the record is handed over, and cleared on success', async () => {
      const { saveDocument, loadDocument, finishRestore } = await freshModule();
      await saveDocument(record() as never);

      expect(await loadDocument()).not.toBeNull();
      expect(idb.get(`guard:${TAB}`)).toBe(`doc:${TAB}`); // still set while applying

      await finishRestore();
      expect(idb.keys()).not.toContain(`guard:${TAB}`);
    });

    test('is not set when there is nothing to restore', async () => {
      const { loadDocument } = await freshModule();
      expect(await loadDocument()).toBeNull();
      expect(idb.keys()).not.toContain(`guard:${TAB}`);
    });

    // A restore that killed the tab must not be retried forever.
    test('found already set, the record it names is dropped and nothing restored', async () => {
      const { loadDocument } = await freshModule();
      idb.seed(`doc:${TAB}`, record());
      idb.seed(`guard:${TAB}`, `doc:${TAB}`);

      expect(await loadDocument()).toBeNull();
      expect(idb.keys()).not.toContain(`doc:${TAB}`);
      expect(idb.keys()).not.toContain(`guard:${TAB}`);
    });

    test('and the next start is an ordinary blank one, not a loop', async () => {
      const first = await freshModule();
      idb.seed(`doc:${TAB}`, record());
      idb.seed(`guard:${TAB}`, `doc:${TAB}`);
      await first.loadDocument();

      const second = await freshModule();
      expect(await second.loadDocument()).toBeNull();
      expect(idb.keys().filter((k) => k.startsWith('guard:'))).toEqual([]);
    });

    // The ambiguity the shared localStorage key had, and the reason it needed a
    // staleness window: another tab restoring right now is not our dead attempt.
    test('another tab s marker is not mistaken for ours', async () => {
      const { saveDocument, loadDocument } = await freshModule();
      await saveDocument(record() as never);
      // A coherent live neighbour: a recent record and the marker of the
      // restore it is in the middle of.
      idb.seed('doc:another-tab', record({ savedAt: Date.now() }));
      idb.seed('guard:another-tab', 'doc:another-tab');

      // Ours restores normally — their marker says nothing about us, which is
      // the whole point of keying it by tab. The shared key this replaced could
      // not tell their live restore from our dead one, and a staleness window
      // had to guess.
      expect(await loadDocument()).not.toBeNull();
      expect(idb.get(`guard:${TAB}`)).toBe(`doc:${TAB}`);
      expect(idb.keys()).toContain('guard:another-tab'); // theirs left alone
      expect(idb.keys()).toContain('doc:another-tab');
    });
  });

  describe('pruning', () => {
    const week = 7 * 24 * 60 * 60 * 1000;

    test('drops records past their week, keeps recent ones', async () => {
      const { loadDocument } = await freshModule();
      idb.seed('doc:ancient', record({ savedAt: Date.now() - week - 1000 }));
      idb.seed('doc:recent', record({ savedAt: Date.now() }));

      await loadDocument();
      await vi.waitFor((): void => {
        expect(idb.keys()).not.toContain('doc:ancient');
      });
      expect(idb.keys()).toContain('doc:recent');
    });

    test('keeps only the newest few', async () => {
      const { loadDocument } = await freshModule();
      for (let i = 0; i < 8; i++) {
        idb.seed(`doc:other-${i}`, record({ savedAt: Date.now() - i * 1000 }));
      }

      await loadDocument();
      await vi.waitFor((): void => {
        expect(idb.keys().filter((k) => k.startsWith('doc:')).length).toBeLessThanOrEqual(4);
      });
      // the newest survive, the oldest go
      expect(idb.keys()).toContain('doc:other-0');
      expect(idb.keys()).not.toContain('doc:other-7');
    });

    test('never drops this tab s own record, however idle', async () => {
      const { loadDocument } = await freshModule();
      idb.seed(`doc:${TAB}`, record({ savedAt: Date.now() - week * 4 }));

      await loadDocument();
      await vi.waitFor((): void => {
        expect(idb.keys().length).toBeGreaterThan(0);
      });
      expect(idb.keys()).toContain(`doc:${TAB}`);
    });

    // The bug the design's own note missed: taking every key treats a marker as
    // a record, and a marker has no savedAt, so it dates as ancient and is swept
    // — including this tab's own, written moments earlier by the restore that
    // prune runs alongside.
    test('does not sweep the marker of the restore it runs alongside', async () => {
      const { saveDocument, loadDocument } = await freshModule();
      await saveDocument(record() as never);

      expect(await loadDocument()).not.toBeNull();
      await vi.waitFor((): void => {
        expect(idb.keys().length).toBeGreaterThan(0);
      });
      expect(idb.get(`guard:${TAB}`)).toBe(`doc:${TAB}`);
    });

    test('drops a dead tab s marker along with its record', async () => {
      const { loadDocument } = await freshModule();
      idb.seed('doc:dead', record({ savedAt: Date.now() - week - 1000 }));
      idb.seed('guard:dead', 'doc:dead');

      await loadDocument();
      await vi.waitFor((): void => {
        expect(idb.keys()).not.toContain('doc:dead');
      });
      expect(idb.keys()).not.toContain('guard:dead');
    });

    test('drops a marker that never had a record', async () => {
      const { loadDocument } = await freshModule();
      idb.seed('guard:ghost', 'doc:ghost');

      await loadDocument();
      await vi.waitFor((): void => {
        expect(idb.keys()).not.toContain('guard:ghost');
      });
    });

    // The one that pins the prefix filter. A marker has no savedAt, so a prune
    // that treats every key as a record dates it as ancient and sweeps it —
    // here, out from under a neighbour that is mid-restore.
    //
    // An expired record is the completion signal, and it has to be one that
    // dies in prune's *final* delete batch — the same batch a wrongly-swept
    // marker would die in. The legacy key is no good for this: prune deletes it
    // before it has even read the key list, so waiting on it proves only that
    // prune started.
    test('a live neighbour s marker survives the sweep', async () => {
      const { loadDocument } = await freshModule();
      idb.seed('doc:expired', record({ savedAt: Date.now() - week - 1000 }));
      idb.seed('doc:neighbour', record({ savedAt: Date.now() }));
      idb.seed('guard:neighbour', 'doc:neighbour');

      await loadDocument();
      await vi.waitFor((): void => {
        expect(idb.keys()).not.toContain('doc:expired'); // the sweep has run
      });

      expect(idb.keys()).toContain('doc:neighbour');
      expect(idb.keys()).toContain('guard:neighbour');
    });

    test('clears the single key everything shared before records were per tab', async () => {
      const { loadDocument } = await freshModule();
      idb.seed('document', record());

      await loadDocument();
      await vi.waitFor((): void => {
        expect(idb.keys()).not.toContain('document');
      });
    });
  });

  test('clearDocument removes only this tab s record', async () => {
    const { saveDocument, clearDocument } = await freshModule();
    await saveDocument(record() as never);
    idb.seed('doc:someone-else', record());

    await clearDocument();
    expect(idb.keys()).not.toContain(`doc:${TAB}`);
    expect(idb.keys()).toContain('doc:someone-else');
  });
});
