import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushRecall } from '../../brush/BrushRecall';
import { isBuiltInBrush } from '../../overmind/brush/state';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { BrushTransformToolId } from '../../overmind/toolbox/actions';
import { Gadget, GadgetCluster, GadgetOpen } from './MenuGadgets';
import { BrushSlotStrip } from './BrushSlotStrip';
import { PreviousBrushSlot } from './PreviousBrushSlot';
import { icons, PixelIcon } from './pixelIcons';
import {
  FlipHIcon,
  FlipVIcon,
  Rotate90Icon,
  RotateAnyIcon,
  HalveIcon,
  DoubleIcon,
  StretchIcon,
  ShearIcon,
  BendHIcon,
  BendVIcon,
  RestoreIcon,
} from './transformIcons';
import { saveCanvasAsPng } from './saveAsPng';
import './BrushMenu.css';

// Only captured or loaded brushes can be saved — the pixel brush has no
// bitmap and the built-in brushes are not the user's work.
function isSaveableBrush(brush: unknown): boolean {
  return brush instanceof CustomBrush && !isBuiltInBrush(brush);
}

// A one-line "what's active" readout next to the drawer's own head. Safe to
// read brushRecall.current directly with no extra reactive plumbing: every
// action that changes it (transform, capture, load, slot/Previous recall,
// Restore) also closes the menu, so BrushMenu always remounts fresh the
// next time it's opened rather than needing to track a live change while
// mounted.
function describeCurrentBrush(usingBuiltInBrush: boolean): string {
  const brush = brushRecall.current;
  const kind = usingBuiltInBrush ? 'Built-in' : 'Custom';
  // the pixel brush (built-in 1, DPaint's default dot) has no bitmap/size of
  // its own — it always draws a single pixel
  const size = brush instanceof CustomBrush ? `${brush.width}×${brush.heigth}` : '1×1';
  return `${kind} ${size}`;
}

// The brush drawer: brush disk I/O plus the brush transforms
// (docs/brush-transforms.md) — custom brushes only, like DPaint, grouped as
// its Size/Flip/Rotate/Bend submenus. Double Horiz/Vert exist too but are
// keyboard-only (Shift-X/Y), matching the original. Instant transforms and the
// modal drags close the menu on selection so the reshaped brush cursor (or the
// armed drag) shows at once.
export function BrushMenu(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  // transforms are custom-brush-only
  const usingBuiltInBrush = state.brush.selectedBuiltInBrushId !== null;
  // swaps the keyboard-shortcut title for an explanation while a built-in
  // brush makes the gadget a no-op, instead of leaving a disabled button
  // with a tooltip that doesn't say why
  const transformTitle = (enabledTitle: string): string =>
    usingBuiltInBrush ? 'Cannot transform a built-in brush' : enabledTitle;

  const handleBrushFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      // decodes, then opens the load requester (color treatment)
      actions.app.beginBrushLoad(URL.createObjectURL(input.files[0]));
    }
  };

  const handleBrushSave = (): void => {
    const brush = brushRecall.current;
    if (!isSaveableBrush(brush) || !(brush instanceof CustomBrush)) {
      return;
    }
    const imageData = brush.toImageData();
    const brushCanvas = document.createElement('canvas');
    brushCanvas.width = imageData.width;
    brushCanvas.height = imageData.height;
    brushCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
    saveCanvasAsPng(brushCanvas, 'brush.png');
  };

  // gadget click helpers: an instant transform applies and closes the menu;
  // a drag transform arms its modal tool and closes so the drag can start.
  // Both need the same brush-cursor refresh (see armTransform's comment) —
  // an instant transform changes the bitmap under a cursor that otherwise
  // won't repaint until the mouse actually moves.
  const instant = (action: () => void) => (): void => {
    action();
    actions.app.closeMenu();
    setTimeout(refreshBrushPreview, 150);
  };
  const armTransform = (tool: BrushTransformToolId) => (): void => {
    actions.toolbox.toggleBrushTransformMode(tool);
    actions.app.closeMenu();
    // the pointer is over the gadget that was just clicked, not the canvas —
    // once the menu's close transition (Menu.css, 0.12s) finishes
    // uncovering it, replay a mousemove there so the armed tool's cursor
    // preview shows up without waiting for the mouse to actually move
    setTimeout(refreshBrushPreview, 150);
  };

  return (
    <div className="brush-menu">
      <div className="wb-cluster__head brush-menu__head">
        Brush
        <span className="brush-menu__current">{describeCurrentBrush(usingBuiltInBrush)}</span>
      </div>
      <div className="brush-menu__row">
        <GadgetCluster head="File">
          <GadgetOpen
            icon={<PixelIcon map={icons.disk} scale={3} />}
            label="Open"
            title="Open brush..."
            handleFile={handleBrushFileOpen}
          />
          <Gadget
            icon={<PixelIcon map={icons.disk} scale={3} />}
            label="Save"
            title="Save brush..."
            onClick={handleBrushSave}
            disabled={!isSaveableBrush(brushRecall.current)}
          />
        </GadgetCluster>
      </div>
      {/* every transform gets its own row, separate from the file
          gadgets above — it's a distinct kind of action */}
      <div className="brush-menu__row">
        <GadgetCluster head="Size">
          <Gadget
            icon={<StretchIcon />}
            label="Stretch"
            stacked
            title={transformTitle('Stretch (drag on canvas) — Z')}
            disabled={usingBuiltInBrush}
            on={state.toolbox.selectedSelectorToolId === 'brushStretchTool'}
            onClick={armTransform('brushStretchTool')}
          />
          <Gadget
            icon={<HalveIcon />}
            label="Halve"
            stacked
            title={transformTitle('Halve — h')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.halveBrush)}
          />
          <Gadget
            icon={<DoubleIcon />}
            label="Double"
            stacked
            title={transformTitle('Double — H')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.doubleBrush)}
          />
        </GadgetCluster>
        <GadgetCluster head="Flip">
          <Gadget
            icon={<FlipHIcon />}
            label="Horizontal"
            stacked
            title={transformTitle('Flip horizontally — x')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.flipBrushHorizontal)}
          />
          <Gadget
            icon={<FlipVIcon />}
            label="Vertical"
            stacked
            title={transformTitle('Flip vertically — y')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.flipBrushVertical)}
          />
        </GadgetCluster>
        <GadgetCluster head="Rotate">
          <Gadget
            icon={<Rotate90Icon />}
            label="90°"
            stacked
            title={transformTitle('Rotate 90 degrees — z')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.rotateBrush90)}
          />
          <Gadget
            icon={<RotateAnyIcon />}
            label="Any Angle"
            stacked
            title={transformTitle('Rotate any angle (drag on canvas) — R')}
            disabled={usingBuiltInBrush}
            on={state.toolbox.selectedSelectorToolId === 'brushRotateTool'}
            onClick={armTransform('brushRotateTool')}
          />
          <Gadget
            icon={<ShearIcon />}
            label="Shear"
            stacked
            title={transformTitle('Shear (drag on canvas) — S')}
            disabled={usingBuiltInBrush}
            on={state.toolbox.selectedSelectorToolId === 'brushShearTool'}
            onClick={armTransform('brushShearTool')}
          />
        </GadgetCluster>
        <GadgetCluster head="Bend">
          <Gadget
            icon={<BendHIcon />}
            label="Horizontal"
            stacked
            title={transformTitle('Bend horizontally (drag on canvas)')}
            disabled={usingBuiltInBrush}
            on={state.toolbox.selectedSelectorToolId === 'brushBendHorizontalTool'}
            onClick={armTransform('brushBendHorizontalTool')}
          />
          <Gadget
            icon={<BendVIcon />}
            label="Vertical"
            stacked
            title={transformTitle('Bend vertically (drag on canvas)')}
            disabled={usingBuiltInBrush}
            on={state.toolbox.selectedSelectorToolId === 'brushBendVerticalTool'}
            onClick={armTransform('brushBendVerticalTool')}
          />
        </GadgetCluster>
        {/* enabled when the recall chain has a step to take: on a
            built-in it re-activates the last custom brush, on a
            transformed custom brush it undoes the transforms */}
        <GadgetCluster>
          <Gadget
            icon={<RestoreIcon />}
            label="Restore"
            stacked
            title="Restore original brush — B"
            disabled={
              usingBuiltInBrush ? !state.brush.hasLastCustomBrush : !state.brush.hasOriginalBrush
            }
            onClick={instant(actions.brush.restoreOriginalBrush)}
          />
        </GadgetCluster>
      </div>
      {/* the deliberate stash (docs/brush-slots.md), its own row below the
          transforms — recall isn't a transform, and a click here should
          never trigger the instant-transform's "close the menu" behavior */}
      <div className="brush-menu__row">
        <BrushSlotStrip />
        <PreviousBrushSlot />
      </div>
    </div>
  );
}
