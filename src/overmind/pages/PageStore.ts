import { Color, Point } from '../../types';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import {
  createUndoEntry,
  releaseBudget,
  shareBudget,
  toCanvasColorIndex,
  UndoBuffer,
} from '../undo/UndoBuffer';

// The document's pages: DPaint's spare page, which is not a second document but
// a scratch surface belonging to this one (docs/local/spare-page.md).
//
// "Spare" is a position, not an identity — the DPaint II manual defines it as
// "always 'the other page,' the one that is not currently displayed", and
// SPARE.C swaps the two bitmaps, so after one swap the variable named sparebm
// holds the page you started on. Hence an array and an index rather than a
// current/spare pair: every operation here is "the current page" and "the next
// one", and Copy To Spare from page two overwriting page one falls out of that
// rather than needing a case of its own.
//
// A page is its undo history plus a cursor into it: every committed change goes
// through setUndoPoint, so the current entry *is* that page's raster, already
// packed to a byte a pixel and carrying its own palette. Nothing else holds the
// pixels of a page that is not on screen.
export type Page = {
  history: UndoBuffer;
  // Index into `history`; the entry it names is this page's raster.
  currentIndex: number | null;
  // The page size, which is per page (canvas.resolution). The screen format is
  // not: that belongs to the document.
  size: { width: number; height: number };
  // Per page by decree of the manual, and it decides what a matte brush treats
  // as transparent, so it has to travel with the page rather than the document.
  backgroundColorId: string;
  scrollFocusPoint: Point | null;
};

// What park() writes back: everything in a Page except its history, which the
// store owns and the swap never replaces.
export type ParkedPageState = Omit<Page, 'history'>;

// Page 0's fields are placeholders until the first park: while a page is the
// current one its real values live in Overmind and in the GL texture, and they
// are only written here on the way out.
const pages: Page[] = [
  {
    history: new UndoBuffer(),
    currentIndex: null,
    size: { width: 0, height: 0 },
    backgroundColorId: '0',
    scrollFocusPoint: null,
  },
];
shareBudget(pages[0].history);

let currentIndex = 0;

export function pageCount(): number {
  return pages.length;
}

export function currentPageIndex(): number {
  return currentIndex;
}

// The history undo, redo and setUndoPoint work on. Every page has one; this is
// the one belonging to the page on screen.
export function currentHistory(): UndoBuffer {
  return pages[currentIndex].history;
}

// Writes the live values of the page being left back into its slot. Called on
// the way out of a page and nowhere else.
export function parkCurrentPage(parked: ParkedPageState): void {
  pages[currentIndex] = { history: currentHistory(), ...parked };
}

// The page a swap would move to, without moving. Null until a second page has
// been created, which happens on the first swap (DPaint allocated its spare
// lazily too, and an unused page here costs one blank entry).
export function nextPage(): Page | null {
  const next = (currentIndex + 1) % Math.max(pages.length, 1);
  return next === currentIndex ? null : pages[next];
}

// Appends a page and puts its history on the shared byte budget. The caller
// builds it, so this module needs to know nothing about palettes or rasters.
export function addPage(page: Page): void {
  pages.push(page);
  shareBudget(page.history);
}

// Applies a whole-canvas transform to every page that is not on screen, and
// records the palette its pixels now index into.
//
// The pages share one palette, by decree of the DPaint II manual ("the Palette
// you were using in the first page follows you to the second page"), so
// anything that rewrites pixels against a palette — a depth reduction, a
// rebuilt palette, True Color going off — leaves the pages nobody is looking at
// indexing colors that have moved. The page on screen is the caller's to
// conform, since only it has a GL texture; these have only their current entry,
// which is the whole of their raster.
//
// One function rather than a loop at each call site. PyDPainter spreads the
// same job over four `for i in range(len(self.proj))` loops with subtly
// different handling of the current page in each, which is four chances to
// forget the fifth.
export function conformParkedPages(
  conform: (colorIndex: CanvasColorIndex) => CanvasColorIndex,
  palette: Color[]
): void {
  pages.forEach((page, index): void => {
    if (index === currentIndex) {
      return;
    }
    const entry = page.history.getItem(page.currentIndex);
    if (!entry) {
      return;
    }
    page.history.replaceItem(
      page.currentIndex,
      createUndoEntry(conform(toCanvasColorIndex(entry)), palette)
    );
  });
}

// The raster of every page that is not on screen, materialised from each one's
// current entry. For deciding what a shared palette should hold: the pages all
// index into it, so they all get a say in what goes in it.
export function parkedPageRasters(): CanvasColorIndex[] {
  const rasters: CanvasColorIndex[] = [];
  pages.forEach((page, index): void => {
    if (index === currentIndex) {
      return;
    }
    const entry = page.history.getItem(page.currentIndex);
    if (entry) {
      rasters.push(toCanvasColorIndex(entry));
    }
  });
  return rasters;
}

// Discards every page but the one on screen, which keeps its history and its
// index. The document is back to a single page, so nothing about pages shows in
// the UI again until the next swap creates one.
//
// Not undoable, and deliberately so: it happens only where the user has just
// answered a question about the document as a whole (a screen format change
// that does not keep the picture, the new-page half of CLR). The histories go
// with the pages, which is the whole of what a page's memory is.
export function dropParkedPages(): void {
  const kept = pages[currentIndex];
  pages.forEach((page): void => {
    if (page !== kept) {
      releaseBudget(page.history);
    }
  });
  pages.length = 0;
  pages.push(kept);
  currentIndex = 0;
}

// Discards the page on screen and hands back the one to show instead, which is
// the same page a swap would have gone to. Null when there is only one page:
// a document always has a page, so the caller offers this only when there is
// another to fall back to.
//
// No park: the page is going, so its live values are not worth writing back.
export function removeCurrentPage(): Page | null {
  if (pages.length < 2) {
    return null;
  }
  const doomed = pages[currentIndex];
  const target = pages[(currentIndex + 1) % pages.length];
  releaseBudget(doomed.history);
  pages.splice(currentIndex, 1);
  currentIndex = pages.indexOf(target);
  return target;
}

// Moves to the next page, and returns it. Separate from nextPage so a swap can
// look at where it is going before committing to going there.
export function activateNextPage(): Page {
  currentIndex = (currentIndex + 1) % pages.length;
  return pages[currentIndex];
}
