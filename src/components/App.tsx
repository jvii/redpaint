import React, { useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './toolbar/Toolbar';
import Palette from './palette/Palette';
import { Tool } from '../tools/Tool';
import { FreehandTool } from '../tools/FreehandTool';
import { Color } from '../types';
import './App.css';

function App(): JSX.Element {
  const [selectedTool, setSelectedTool] = useState(new FreehandTool());
  const [selectedColor, setSelectedColor] = useState({ r: 255, g: 0, b: 0 });

  function handleToolSet(tool: Tool): void {
    setSelectedTool(tool);
  }

  function handleColorSet(color: Color): void {
    setSelectedColor(color);
  }

  return (
    <div className="App">
      <Canvas selectedTool={selectedTool} selectedColor={selectedColor} />
      <Toolbar setSelectedTool={handleToolSet} />
      <Palette setSelectedColor={handleColorSet} />
    </div>
  );
}

export default App;
