import { quoteFamily } from '../algorithm/glyphRaster';

// Which font families this browser can offer the text tool.
//
// Rendering with an installed family by name works everywhere; *enumerating*
// what is installed is queryLocalFonts(), Chrome and Edge only and
// permission-gated. So there are two lists: the machine's real one, or a probe
// of names guessed in advance, which cannot find a family not in CANDIDATES.
// See docs/text-tool.md.

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

// A candidate not installed falls back to one of these and measures
// identically. Three rather than one, since a candidate can coincidentally
// match a single fallback's metrics.
const FALLBACKS = ['monospace', 'serif', 'sans-serif'];

// Long and mixed enough that two genuinely different faces will not agree on
// its width by accident.
const PROBE_TEXT = 'mmmmmmmmmmlliWWMMwi0O@';
const PROBE_SIZE = 72;

// Quoted, or a digit-leading name is silently dropped and this measures the
// previous candidate again.
function probeWidths(ctx: CanvasRenderingContext2D, family: string): number[] {
  return FALLBACKS.map((fallback): number => {
    ctx.font = `${PROBE_SIZE}px ${quoteFamily(family)}, ${fallback}`;
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

export async function availableFontFamilies(): Promise<FontList> {
  const query = (window as WindowWithLocalFonts).queryLocalFonts;
  if (query) {
    try {
      const fonts = await query.call(window);
      const families = Array.from(new Set<string>(fonts.map((font): string => font.family))).sort(
        (a, b): number => a.localeCompare(b)
      );
      if (families.length > 0) {
        return { families, source: 'enumerated' };
      }
    } catch {
      // Denied or unavailable: the probe below is what every other browser
      // gets anyway.
    }
  }
  return { families: probeInstalledFamilies(), source: 'probed' };
}
