import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface ICanvasProps {
  height?: number;
  width?: number;
}

class Canvas extends React.Component<ICanvasProps> {

  private ctx?: (CanvasRenderingContext2D | null);
  private canvas?: HTMLCanvasElement;
  /*
  refs?: {
    canvas: HTMLCanvasElement;
  };

    componentDidMount() {
    this.canvas = (ReactDOM.findDOMNode(this.refs.canvas) as HTMLCanvasElement);
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = this.props.height;
    this.canvas.height = this.props.width;
  }

  render() {
    return (
        <div className='center-children'>
            <canvas ref='canvas' className='render-canvas'></canvas>
        </div>
    );
  } */

  componentDidMount() {
    this.canvas = (ReactDOM.findDOMNode(this.refs.canvas) as HTMLCanvasElement);
    this.ctx = this.canvas.getContext("2d")

}

  render() {
    return(
      <div>
        <canvas ref="canvas" width={640} height={425} />
      </div>
    )
  }
}

export default Canvas;
