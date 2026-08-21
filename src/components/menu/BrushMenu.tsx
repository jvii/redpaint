import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { shortcutCap } from '../ui/shortcutCap';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushRecall } from '../../brush/BrushRecall';
import { isBuiltInBrush } from '../../overmind/brush/state';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { BrushTransformToolId } from '../../overmind/toolbox/actions';
import { Gadget, GadgetCluster, GadgetGroup } from './MenuGadgets';
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
  HandleIcon,
} from './transformIcons';
import { saveFileAs } from './saveAsPng';
import { beginSaveAsPrompt } from './pendingSaveAs';
import { brushBlobMakerFor, BrushSaveFormat, brushSaveFormats } from './brushSaveFormats';
import './DrawerMenu.css';

// Only captured or loaded brushes can be saved. The pixel brush has no bitmap
// and the built-in brushes are not the user's work.
// A brush is not a document and has no name of its own; this is only what the
// requester offers, the way displayName is for a picture.
const BRUSH_BASE_NAME = 'brush';

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
  // its own. It always draws a single pixel
  const size = brush instanceof CustomBrush ? `${brush.width}×${brush.heigth}` : '1×1';
  return `${kind} ${size}`;
}

// The brush drawer: brush disk I/O plus the brush transforms
// (docs/brush-transforms.md), custom brushes only, like DPaint, grouped as its
// Size/Flip/Rotate/Bend submenus. Double Horiz/Vert exist too but are
// keyboard-only (Shift-X/Y), matching the original. Instant transforms and the
// modal drags close the menu on selection so the reshaped brush cursor (or the
// armed drag) shows at once.
export function BrushMenu({ onOpenFile }: { onOpenFile: () => void }): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  // transforms are custom-brush-only
  const usingBuiltInBrush = state.brush.usingBuiltInBrush;
  // swaps the keyboard-shortcut title for an explanation while a built-in
  // brush makes the gadget a no-op, instead of leaving a disabled button
  // with a tooltip that doesn't say why
  const transformTitle = (enabledTitle: string): string =>
    usingBuiltInBrush ? 'Cannot transform a built-in brush' : enabledTitle;

  // Always through the requester, unlike a picture's Save: a brush has no file
  // it came from, so there is never an answer to repeat (docs/brush-save.md).
  const handleBrushSave = (): void => {
    const brush = brushRecall.current;
    if (!isSaveableBrush(brush) || !(brush instanceof CustomBrush)) {
      return;
    }
    actions.app.closeMenu();
    actions.app.openSaveAsPrompt(BRUSH_BASE_NAME);
    void (async (): Promise<void> => {
      const choice = await beginSaveAsPrompt('brush');
      if (!choice) {
        return; // cancelled
      }
      const format = choice.format as BrushSaveFormat;
      const makeBlob = brushBlobMakerFor(brush, format, Object.values(state.palette.palette));
      if (!makeBlob) {
        return; // the format cannot hold this brush; brushBlobMakerFor said so
      }
      const { fileType } = brushSaveFormats[format];
      await saveFileAs(
        makeBlob,
        `${BRUSH_BASE_NAME}${fileType.extension}`,
        fileType,
        choice.name === null ? undefined : async (): Promise<string> => choice.name as string
      );
      actions.app.setBrushSaveFormat(format);
    })();
  };

  // gadget click helpers: an instant transform applies and closes the menu; a
  // drag transform arms its modal tool and closes so the drag can start. Both
  // need the same brush-cursor refresh (see armTransform's comment): an instant
  // transform changes the bitmap under a cursor that otherwise won't repaint
  // until the mouse actually moves.
  const instant = (action: () => void) => (): void => {
    action();
    actions.app.closeMenu();
    setTimeout(refreshBrushPreview, 150);
  };
  const armTransform = (tool: BrushTransformToolId) => (): void => {
    actions.toolbox.toggleBrushTransformMode(tool);
    actions.app.closeMenu();
    // the pointer is over the gadget that was just clicked, not the canvas.
    // Once the menu's close transition (Menu.css, 0.12s) finishes uncovering
    // it, replay a mousemove there so the armed tool's cursor preview shows up
    // without waiting for the mouse to actually move
    setTimeout(refreshBrushPreview, 150);
  };

  return (
    <div className="drawer-menu">
      <div className="wb-cluster__head drawer-menu__head">
        Brush
        <span className="brush-menu__current">{describeCurrentBrush(usingBuiltInBrush)}</span>
      </div>
      <div className="drawer-menu__row">
        {/* Open and Save sit in their own unheaded groups, as in the Picture
            drawer - see the comment there on why reading and writing don't
            share a seam, and why "File" over them was redundant. Here the
            split also keeps Save's disabled state (built-in brushes cannot be
            saved) from reading as if it dimmed the pair. */}
        <GadgetGroup>
          <Gadget
            icon={<PixelIcon map={icons.diskLoad} scale={2} />}
            label="Open"
            title="Open brush..."
            onClick={onOpenFile}
          />
        </GadgetGroup>
        <GadgetGroup>
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save"
            title={usingBuiltInBrush ? 'Cannot save a built-in brush' : 'Save brush...'}
            onClick={handleBrushSave}
            disabled={!isSaveableBrush(brushRecall.current)}
          />
        </GadgetGroup>
      </div>
      {/* every transform gets its own row, separate from the file
          gadgets above — it's a distinct kind of action */}
      <div className="drawer-menu__row">
        <GadgetCluster head="Size">
          <Gadget
            icon={<StretchIcon />}
            label="Stretch"
            stacked
            title={transformTitle('Stretch (drag on canvas) — Z')}
            shortcut={shortcutCap('Z')}
            disabled={usingBuiltInBrush}
            on={state.toolbox.selectedSelectorToolId === 'brushStretchTool'}
            onClick={armTransform('brushStretchTool')}
          />
          <Gadget
            icon={<HalveIcon />}
            label="Halve"
            stacked
            title={transformTitle('Halve — h')}
            shortcut={shortcutCap('h')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.halveBrush)}
          />
          <Gadget
            icon={<DoubleIcon />}
            label="Double"
            stacked
            title={transformTitle('Double — H')}
            shortcut={shortcutCap('H')}
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
            shortcut={shortcutCap('x')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.flipBrushHorizontal)}
          />
          <Gadget
            icon={<FlipVIcon />}
            label="Vertical"
            stacked
            title={transformTitle('Flip vertically — y')}
            shortcut={shortcutCap('y')}
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
            shortcut={shortcutCap('z')}
            disabled={usingBuiltInBrush}
            onClick={instant(actions.brush.rotateBrush90)}
          />
          <Gadget
            icon={<RotateAnyIcon />}
            label="Any Angle"
            stacked
            // No keycap: 'R' is the toolbox's Filled Rectangle, DPaint's own
            // (GlobalHotkeyManager). DPaint has this transform (its ROTATE,
            // dragged about the brush's corner), but gave it no keyboard
            // equivalent, so there is none to show.
            title={transformTitle('Rotate any angle (drag on canvas)')}
            disabled={usingBuiltInBrush}
            on={state.toolbox.selectedSelectorToolId === 'brushRotateTool'}
            onClick={armTransform('brushRotateTool')}
          />
          <Gadget
            icon={<ShearIcon />}
            label="Shear"
            stacked
            title={transformTitle('Shear (drag on canvas) — S')}
            shortcut={shortcutCap('S')}
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
        {/* strictly "undo a transform" — disabled on a built-in (nothing to
            undo there; getting back to a custom brush is Previous's job) */}
        <GadgetCluster>
          <Gadget
            icon={<RestoreIcon />}
            label="Restore"
            stacked
            title={
              usingBuiltInBrush ? 'Cannot restore a built-in brush' : 'Restore original brush — B'
            }
            shortcut={shortcutCap('B')}
            disabled={usingBuiltInBrush || !state.brush.hasOriginalBrush}
            onClick={instant(actions.brush.restoreOriginalBrush)}
          />
        </GadgetCluster>
        {/* a mode rather than an action, and the only one in this row — it
            changes where the brush sits under the cursor, not what the brush
            is. Never disabled: it is app-wide, so it can be set with a
            built-in in hand and takes effect at the next pickup, which is
            where DPaint kept it too (a Prefs item there). */}
        <GadgetCluster>
          <Gadget
            icon={<HandleIcon />}
            label="Handle"
            stacked
            title={
              usingBuiltInBrush
                ? 'Hold a brush by its corner (built-in brushes are always held by the centre)'
                : 'Hold the brush by the corner its pickup ended at, not its centre'
            }
            on={state.brush.cornerHandle}
            onClick={instant(actions.brush.toggleBrushHandle)}
          />
        </GadgetCluster>
      </div>
      {/* the deliberate stash (docs/brush-slots.md), its own row below the
          transforms — recall isn't a transform, and a click here should
          never trigger the instant-transform's "close the menu" behavior */}
      <div className="drawer-menu__row">
        <BrushSlotStrip />
        <PreviousBrushSlot />
      </div>
      <div className="drawer-menu__spacer" />
    </div>
  );
}
