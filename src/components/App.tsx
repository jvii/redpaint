import React, { useState, useReducer } from 'react';
import Canvas from './Canvas';
import Toolbar from './toolbar/Toolbar';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { Tool } from '../tools/Tool';
import { FreehandTool } from '../tools/FreehandTool';
import { PaletteState, paletteStateReducer } from './palette/PaletteState';
import './App.css';

const initialTool = new FreehandTool(); //TODO ToolbarState?
const initialPaletteState = new PaletteState();

function App(): JSX.Element {
  const [selectedTool, setSelectedTool] = useState(initialTool);
  const [paletteState, paletteDispatch] = useReducer(paletteStateReducer, initialPaletteState);

  function handleToolSet(tool: Tool): void {
    setSelectedTool(tool);
  }

  return (
    <div className="App">
      <Canvas selectedTool={selectedTool} selectedColor={paletteState.foregroundColor} />
      <Toolbar setSelectedTool={handleToolSet} />
      <ColorIndicator paletteState={paletteState} />
      <Palette state={paletteState} dispatch={paletteDispatch} />
    </div>
  );
}

export default App;
