import { paintingCanvasController } from '../paintingCanvas/PaintingCanvasController';
import { CustomBrush } from '../../brush/CustomBrush';
import { Point } from '../../types';

// Dev-only benchmark for the brush-stamp hot path. Run from the devtools
// console:
//
//   __redpaintBench()              // 300 stamps with a 100x100 brush
//   __redpaintBench(500, 200)      // 500 stamps with a 200x200 brush
//
// Each iteration stamps the brush at one point through the full per-mouse-move
// pipeline (indexer draw + main canvas render + zoom canvas copy), which is
// what freehand painting with a custom brush does per event. The color index
// is read back at the end to flush the GL queue so GPU time is included.
function benchmarkBrushStamps(stamps = 300, brushSize = 100, reps = 5): void {
  const { width, height } = paintingCanvasController.mainCanvas;
  if (width < brushSize || height < brushSize) {
    alert(`canvas smaller than ${brushSize}x${brushSize}, use a smaller brush size`);
    return;
  }

  const brush = CustomBrush.fromCanvasArea({ x: 0, y: 0 }, brushSize, brushSize);

  // spread the stamp positions around so the work resembles a stroke
  const points: Point[] = [];
  for (let i = 0; i < stamps; i++) {
    points.push({
      x: (i * 7) % Math.max(1, width - brushSize),
      y: (i * 13) % Math.max(1, height - brushSize),
    });
  }

  const runOnce = (count: number): number => {
    const start = performance.now();
    for (let i = 0; i < count; i++) {
      paintingCanvasController.drawImage([points[i % points.length]], brush);
    }
    // force the GL queue to finish so the measurement includes GPU work
    paintingCanvasController.getCanvasColorIndex();
    return performance.now() - start;
  };

  // warm up shaders, textures and JIT before measuring
  runOnce(50);

  const times: number[] = [];
  for (let r = 0; r < reps; r++) {
    times.push(runOnce(stamps));
  }
  times.sort((a, b): number => a - b);
  const min = times[0];
  const median = times[Math.floor(times.length / 2)];

  const result =
    `${stamps} stamps of ${brushSize}x${brushSize} brush, ${reps} reps:\n` +
    `min ${min.toFixed(1)} ms (${(min / stamps).toFixed(3)} ms/stamp)\n` +
    `median ${median.toFixed(1)} ms (${(median / stamps).toFixed(3)} ms/stamp)\n` +
    `all: ${times.map((t): string => t.toFixed(0)).join(', ')} ms`;
  console.log(result);
  showResultOverlay(result);
}

// Shows the result as selectable text on the page (readable and copyable with
// devtools closed; run via setTimeout(() => __redpaintBench(), 3000) and close
// devtools first).
function showResultOverlay(text: string): void {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:9999;' +
    'background:white;color:black;border:2px solid black;padding:16px 20px;' +
    'font-family:monospace;font-size:14px;box-shadow:4px 4px 0 0 black;';

  const pre = document.createElement('pre');
  pre.textContent = text;
  pre.style.cssText = 'margin:0;user-select:text;cursor:text;';

  const close = document.createElement('button');
  close.textContent = 'close';
  close.style.cssText =
    'display:block;margin:12px auto 0;font-family:monospace;font-size:14px;' +
    'border:2px solid black;background:white;cursor:pointer;padding:2px 10px;';
  close.addEventListener('click', (): void => overlay.remove());

  overlay.appendChild(pre);
  overlay.appendChild(close);
  document.body.appendChild(overlay);
}

declare global {
  interface Window {
    __redpaintBench: typeof benchmarkBrushStamps;
  }
}

window.__redpaintBench = benchmarkBrushStamps;
