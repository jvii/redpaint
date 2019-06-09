import * as React from 'react';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import './App.css';

function App() {
  return (
    <div className="App">
      <Canvas></Canvas>
      <Toolbar></Toolbar>
    </div>
  );
}

export default App;