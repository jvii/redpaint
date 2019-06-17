import React from 'react';
import { Button, ButtonFreehand, ButtonLine } from './toolbarButtons/Button';
import { FreehandTool } from '../tools/FreehandTool';
import { LineTool } from '../tools/LineTool';
import { Tool } from '../types';
import './Toolbar.css';

export interface Props {
  setSelectedTool: (tool: Tool) => void;
}

function Toolbar({ setSelectedTool }: Props): JSX.Element {
  return (
    <div className="ToolbarArea">
      <ButtonFreehand
        onClick={(): void => setSelectedTool(new FreehandTool())}
      />
      <ButtonLine onClick={(): void => setSelectedTool(new LineTool())} />
      <Button className="C"></Button>
      <Button className="D"></Button>
    </div>
  );
}

export default Toolbar;
