import { Point } from '../../types';
import { Derive } from 'overmind';

type ToolFillStyle = {
  effective: string;
  stored: string;
};

export type State = {
  dottedFreehandTool: {
    fillStyle: ToolFillStyle;
  };
  freehandTool: {
    previous: Point | null;
    fillStyle: ToolFillStyle;
  };
  lineTool: {
    start: Point | null;
    fillStyle: ToolFillStyle;
  };
  curveTool: {
    start: Point | null;
    end: Point | null;
    fillStyle: ToolFillStyle;
  };
  airbrushTool: {
    position: Point | null;
    fillStyle: ToolFillStyle;
  };
  rectangleTool: {
    start: Point | null;
    fillStyle: ToolFillStyle;
  };
  circleTool: {
    origin: Point | null;
    fillStyle: ToolFillStyle;
  };
  ellipseTool: {
    origin: Point | null;
    radiusX: number | null;
    radiusY: number | null;
    angle: number;
    fillStyle: ToolFillStyle;
  };
  polygonTool: {
    vertices: Point[];
    fillStyle: ToolFillStyle;
  };
  textTool: {
    text: string;
    start: Point | null;
    fillStyle: ToolFillStyle;
  };
  brushSelectorTool: { start: Point | null };
  activeToolFillStyle: Derive<State, ToolFillStyle | null>;
  activeColorIndex: number;
};

export const state: State = {
  dottedFreehandTool: { fillStyle: { effective: '', stored: '' } },
  freehandTool: { previous: null, fillStyle: { effective: '', stored: '' } },
  lineTool: { start: null, fillStyle: { effective: '', stored: '' } },
  curveTool: { start: null, end: null, fillStyle: { effective: '', stored: '' } },
  airbrushTool: { position: null, fillStyle: { effective: '', stored: '' } },
  rectangleTool: { start: null, fillStyle: { effective: '', stored: '' } },
  circleTool: { origin: null, fillStyle: { effective: '', stored: '' } },
  ellipseTool: {
    origin: null,
    radiusX: null,
    radiusY: null,
    angle: 0,
    fillStyle: { effective: '', stored: '' },
  },
  polygonTool: { vertices: [], fillStyle: { effective: '', stored: '' } },
  textTool: { text: '', start: null, fillStyle: { effective: '', stored: '' } },
  brushSelectorTool: { start: null },
  activeToolFillStyle: (state, rootState): ToolFillStyle | null => {
    if (rootState.toolbox.selectedDrawingToolId === 'dottedFreehand') {
      return rootState.tool.freehandTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'freeHand') {
      return rootState.tool.freehandTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'line') {
      return rootState.tool.lineTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'curve') {
      return rootState.tool.curveTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'airbrush') {
      return rootState.tool.airbrushTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'rectangleNoFill') {
      return rootState.tool.rectangleTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'rectangleFilled') {
      return rootState.tool.rectangleTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'circleNoFill') {
      return rootState.tool.circleTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'circleFilled') {
      return rootState.tool.circleTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'ellipseNoFill') {
      return rootState.tool.ellipseTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'ellipseFilled') {
      return rootState.tool.ellipseTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'polygonNoFill') {
      return rootState.tool.polygonTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'polygonFilled') {
      return rootState.tool.polygonTool.fillStyle;
    }
    if (rootState.toolbox.selectedDrawingToolId === 'textFilled') {
      return rootState.tool.textTool.fillStyle;
    }
    return null;
  },
  activeColorIndex: 0,
};
