import * as React from 'react';
import Button from './toolbarButtons/Button';
import ButtonFreehand from './toolbarButtons/ButtonFreehand';
import './Toolbar.css';


export interface Props {
  name: string;
}

export interface State {
  buttonFreehandActive: Boolean;
}

class Toolbar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      buttonFreehandActive: false
    };
  }

  handleClick() {
    this.setState(
      {buttonFreehandActive: !this.state.buttonFreehandActive}
      );
  }

  render() {
    console.log(`render Toolbar, state.buttonFreehandActive = ${this.state.buttonFreehandActive}`);
    return (
    <div className='ToolbarArea'>
      <ButtonFreehand onClick={() => this.handleClick()} />
      <Button name = 'B' ></Button>
      <Button name = 'C' ></Button>
      <Button name = 'D' ></Button>
    </div>
    );
  }
}

export default Toolbar;
