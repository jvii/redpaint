import React, { useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import { Tool } from '../types';
import { FreehandTool } from '../tools/FreehandTool';
import './App.css';

function App(): JSX.Element {
  const [selectedTool, setSelectedTool] = useState(new FreehandTool());

  function handleToolSet(tool: Tool): void {
    setSelectedTool(tool);
  }

  return (
    <div className="App">
      <Canvas selectedTool={selectedTool} />
      <Toolbar setSelectedTool={handleToolSet} />
    </div>
  );
}

export default App;
