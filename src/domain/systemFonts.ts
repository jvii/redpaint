// Which font families this browser can actually offer the text tool.
//
// Three capabilities get conflated here and only the first is portable:
// *rendering* with an installed family by name works everywhere and needs no
// permission, which is why the text tool works in every browser; *enumerating*
// what is installed is queryLocalFonts(), which is Chrome and Edge only (not
// other Chromium browsers, not Baseline, opposed by Safari and Firefox on
// fingerprinting grounds) and permission-gated where it exists; reading a
// font's raw bytes is gated the same way.
//
// So there are two lists, and they are not the same thing. Where enumeration
// works, this is the machine's real font list. Where it does not, it is a probe
// of names guessed in advance — a family whose name is not in CANDIDATES cannot
// be found at all, however well installed it is. The requester says which one
// it is showing rather than implying the short list is everything installed.

// How the list was obtained, so the requester can be honest about it.
export type FontListSource = 'enumerated' | 'probed';

export type FontList = {
  families: string[];
  source: FontListSource;
};

// Web-safe families to probe where enumeration is unavailable. Sans faces
// first: they survive thresholding best, which is what this tool does to them.
const CANDIDATES = [
  'Arial',
  'Helvetica',
  'Helvetica Neue',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Geneva',
  'Gill Sans',
  'Futura',
  'Impact',
  'Arial Black',
  'Georgia',
  'Times New Roman',
  'Palatino',
  'Garamond',
  'Courier New',
  'Menlo',
  'Monaco',
  'Consolas',
  'Lucida Console',
  'Comic Sans MS',
];

// The generic families a probe measures against. A candidate that is not
// installed falls back to one of these and measures identically to it; one that
// differs from all three is present. Three rather than one because a candidate
// can coincidentally match a single fallback's metrics.
const FALLBACKS = ['monospace', 'serif', 'sans-serif'];

// Long and mixed enough that two genuinely different faces will not agree on
// its width by accident.
const PROBE_TEXT = 'mmmmmmmmmmlliWWMMwi0O@';
const PROBE_SIZE = 72;

function probeWidths(ctx: CanvasRenderingContext2D, family: string): number[] {
  return FALLBACKS.map((fallback): number => {
    ctx.font = `${PROBE_SIZE}px ${family}, ${fallback}`;
    return ctx.measureText(PROBE_TEXT).width;
  });
}

function probeInstalledFamilies(): string[] {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) {
    return [];
  }
  const baselines = FALLBACKS.map((fallback): number => {
    ctx.font = `${PROBE_SIZE}px ${fallback}`;
    return ctx.measureText(PROBE_TEXT).width;
  });
  return CANDIDATES.filter((family): boolean =>
    // present if it displaced *any* of the fallbacks: a face that matches one
    // by coincidence will not match all three
    probeWidths(ctx, family).some((width, i): boolean => width !== baselines[i])
  );
}

type FontData = { family: string };
type WindowWithLocalFonts = Window & {
  queryLocalFonts?: () => Promise<FontData[]>;
};

// Latin-capable faces only. A text tool that can type printable ASCII has
// nothing to do with a CJK or symbol face, and on a machine with many of them
// installed they would swamp the list.
function isUsableFamily(family: string): boolean {
  return /^[\x20-\x7e]+$/.test(family);
}

export async function availableFontFamilies(): Promise<FontList> {
  const query = (window as WindowWithLocalFonts).queryLocalFonts;
  if (query) {
    try {
      const fonts = await query.call(window);
      const families = Array.from(new Set<string>(fonts.map((font): string => font.family)))
        .filter(isUsableFamily)
        .sort((a, b): number => a.localeCompare(b));
      if (families.length > 0) {
        return { families, source: 'enumerated' };
      }
    } catch {
      // Denied, dismissed, or unavailable in this context. The probe below is
      // the same answer every other browser gets, so there is nothing to
      // report — falling through is the whole handling.
    }
  }
  return { families: probeInstalledFamilies(), source: 'probed' };
}
