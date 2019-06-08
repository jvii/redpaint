import * as React from 'react';
import Toolbar from './Toolbar';
import Canvas1 from './Canvas1';

export interface Props {
  name: string;
  enthusiasmLevel?: number;
}

function Hello({ name, enthusiasmLevel = 1 }: Props) {
  if (enthusiasmLevel <= 0) {
    throw new Error('You could be a little more enthusiastic. :D');
  }

  return (
    <div className="hello">
      <div className="greeting">
        <Toolbar name={name} ></Toolbar>
        <Canvas1></Canvas1>
        <p id="screen-log"></p>
      </div>
    </div>
  );
}

export default Hello;

document.addEventListener('mousemove', logKey);

function logKey(e: MouseEvent) {
  let screenLog: HTMLElement | null = document.querySelector('#screen-log');
  if (!screenLog) {
    return
  }

  screenLog.innerText = `
    Screen X/Y: ${e.screenX}, ${e.screenY}
    Client X/Y: ${e.clientX}, ${e.clientY}`;
}