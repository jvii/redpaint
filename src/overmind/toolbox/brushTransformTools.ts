// Its own module rather than part of toolbox/actions: CustomBrush reads this to
// centre the handle mid-drag, and toolbox/actions already imports CustomBrush.
export const BRUSH_TRANSFORM_TOOL_IDS = [
  'brushStretchTool',
  'brushShearTool',
  'brushRotateTool',
  'brushBendHorizontalTool',
  'brushBendVerticalTool',
] as const;

export type BrushTransformToolId = (typeof BRUSH_TRANSFORM_TOOL_IDS)[number];

export function isBrushTransformTool(toolId: string | null): boolean {
  return toolId !== null && (BRUSH_TRANSFORM_TOOL_IDS as readonly string[]).includes(toolId);
}
