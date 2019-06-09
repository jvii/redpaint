import * as React from 'react';
import Button from './toolbarButtons/Button';
import ButtonFreehand from './toolbarButtons/ButtonFreehand';
import './Toolbar.css';

function Toolbar() {
  return (
  <div className='ToolbarArea'>
    <ButtonFreehand onClick={() => console.log('ButtonFreeHand')} />
    <Button name = 'B' ></Button>
    <Button name = 'C' ></Button>
    <Button name = 'D' ></Button>
  </div>
  );
}

export default Toolbar;
