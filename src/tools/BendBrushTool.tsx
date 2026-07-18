import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushHistory } from '../brush/BrushHistory';
import { CustomBrush } from '../brush/CustomBrush';
import {
  BendControls,
  bendHorizontal,
  bendVertical,
  bendOffsets,
} from '../algorithm/brushTransform';
import { Point } from '../types';

// DPaint's Bend Horiz/Vert (docs/brush-transforms.md, BEND.C), on the shared
// interactive-transform rails: press plants the brush; the pointer's region
// then steers one control of a quadratic bend curve — beyond the near end it
// bends that end, beyond the far end the other, in between it drags the
// middle bulge (and where along the edge the pointer sits places the bulge).
// The preview is the actual bent bitmap plus its curved outline (DPaint
// showed only the XOR outline). Release commits; same no-mutation contract
// as the other drag transforms.
export class BendBrushTool implements Tool {
  private horizontal: boolean;

  public constructor(horizontal: boolean) {
    this.horizontal = horizontal;
  }

  public onInit(): void {
    overmind.actions.tool.brushBendStart(null);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (brushHistory.current instanceof CustomBrush) {
      overmind.actions.tool.brushBendStart(getMousePos(event));
    }
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const origin = overmind.state.tool.brushBendTool.origin;
    const brush = brushHistory.current;
    if (!origin || !(brush instanceof CustomBrush)) {
      return;
    }
    const controls = this.bendControls(origin, getMousePos(event), brush);
    overmind.actions.tool.brushBendStart(null);
    overmind.actions.brush.bendBrushBy({ horizontal: this.horizontal, controls });
    overmind.actions.toolbox.toggleBrushTransformMode(
      this.horizontal ? 'brushBendHorizontalTool' : 'brushBendVerticalTool'
    );
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushHistory.current;
    if (!(brush instanceof CustomBrush)) {
      return;
    }
    const mousePos = getMousePos(event);
    const origin = overmind.state.tool.brushBendTool.origin;
    overlayCanvasController.clear();
    if (!origin) {
      // the grip is the middle of the edge that will bend (DPaint's handle),
      // so both bend-the-end regions stay reachable once pressed
      const center = this.horizontal
        ? { x: mousePos.x - brush.width / 2, y: mousePos.y }
        : { x: mousePos.x, y: mousePos.y - brush.heigth / 2 };
      brush.drawPoints([center], overlayCanvasController);
      overlayCanvasController.selectionBox(
        { x: center.x - brush.width / 2, y: center.y - brush.heigth / 2 },
        { x: center.x + brush.width / 2 - 1, y: center.y + brush.heigth / 2 - 1 }
      );
      return;
    }
    const controls = this.bendControls(origin, mousePos, brush);
    const preview = brush.transform((b) =>
      this.horizontal ? bendHorizontal(b, controls) : bendVertical(b, controls)
    );
    preview.applyMode(overmind.state.brush.mode);
    const topLeft = this.bentTopLeft(origin, brush, controls);
    preview.drawPoints(
      [{ x: topLeft.x + preview.width / 2, y: topLeft.y + preview.heigth / 2 }],
      overlayCanvasController
    );
    overlayCanvasController.selectionPolygon(this.bentOutline(origin, brush, controls));
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onExitOverlay(): void {
    overlayCanvasController.clear();
  }

  // The planted brush's top-left corner (the press point held the bending
  // edge's middle).
  private plantedTopLeft(origin: Point, brush: CustomBrush): Point {
    return this.horizontal
      ? { x: origin.x - brush.width, y: origin.y - Math.floor(brush.heigth / 2) }
      : { x: origin.x - Math.floor(brush.width / 2), y: origin.y - brush.heigth };
  }

  // DPaint's region rule: past the near end bends that end, past the far end
  // the other, between them the middle bulge rides the pointer.
  private bendControls(origin: Point, mousePos: Point, brush: CustomBrush): BendControls {
    const planted = this.plantedTopLeft(origin, brush);
    if (this.horizontal) {
      const dx = mousePos.x - origin.x;
      const along = mousePos.y - planted.y;
      if (along < 0) {
        return { start: dx, middle: 0, middleAt: Math.floor(brush.heigth / 2), end: 0 };
      }
      if (along >= brush.heigth) {
        return { start: 0, middle: 0, middleAt: Math.floor(brush.heigth / 2), end: dx };
      }
      return { start: 0, middle: dx, middleAt: along, end: 0 };
    }
    const dy = mousePos.y - origin.y;
    const along = mousePos.x - planted.x;
    if (along < 0) {
      return { start: dy, middle: 0, middleAt: Math.floor(brush.width / 2), end: 0 };
    }
    if (along >= brush.width) {
      return { start: 0, middle: 0, middleAt: Math.floor(brush.width / 2), end: dy };
    }
    return { start: 0, middle: dy, middleAt: along, end: 0 };
  }

  // Where the bent bitmap sits: rows/columns on offset 0 stay planted, so the
  // bitmap's origin shifts by the most negative offset.
  private bentTopLeft(origin: Point, brush: CustomBrush, controls: BendControls): Point {
    const planted = this.plantedTopLeft(origin, brush);
    const offsets = bendOffsets(this.horizontal ? brush.heigth : brush.width, controls);
    const minOffset = Math.min(0, ...offsets);
    return this.horizontal
      ? { x: planted.x + minOffset, y: planted.y }
      : { x: planted.x, y: planted.y + minOffset };
  }

  // The bent rectangle's outline: both bent edges sampled along the curve,
  // joined into one closed polygon (DPaint's XOR curves).
  private bentOutline(origin: Point, brush: CustomBrush, controls: BendControls): Point[] {
    const planted = this.plantedTopLeft(origin, brush);
    const length = this.horizontal ? brush.heigth : brush.width;
    const offsets = bendOffsets(length, controls);
    const step = Math.max(1, Math.floor(length / 24));
    const cells: number[] = [];
    for (let i = 0; i < length; i += step) {
      cells.push(i);
    }
    if (cells[cells.length - 1] !== length - 1) {
      cells.push(length - 1);
    }
    if (this.horizontal) {
      const right = cells.map((v) => ({
        x: planted.x + brush.width - 1 + offsets[v],
        y: planted.y + v,
      }));
      const left = cells.map((v) => ({ x: planted.x + offsets[v], y: planted.y + v })).reverse();
      return [...right, ...left];
    }
    const bottom = cells.map((v) => ({
      x: planted.x + v,
      y: planted.y + brush.heigth - 1 + offsets[v],
    }));
    const top = cells.map((v) => ({ x: planted.x + v, y: planted.y + offsets[v] })).reverse();
    return [...bottom, ...top];
  }
}
