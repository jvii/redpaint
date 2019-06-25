import React from 'react';
import { ButtonFreehand, ButtonLine } from './toolBarButtons';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { Tool } from '../../tools/Tool';
import './Toolbar.css';

export interface Props {
  setSelectedTool: (tool: Tool) => void;
}

function Toolbar({ setSelectedTool }: Props): JSX.Element {
  return (
    <div className="ToolbarArea">
      <ButtonFreehand onClick={(): void => setSelectedTool(new FreehandTool())} />
      <ButtonLine onClick={(): void => setSelectedTool(new LineTool())} />
    </div>
  );
}

export default Toolbar;
