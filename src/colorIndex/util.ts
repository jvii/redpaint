export function canvasToWebGLCoordX(gl: WebGLRenderingContext, x: number): number {
  return (x / gl.canvas.width) * 2 - 1;
}

export function canvasToWebGLCoordY(gl: WebGLRenderingContext, y: number): number {
  //return (y / gl.drawingBufferHeight) * -2 + 1; // because GL is 0 at bottom
  return (y / gl.canvas.height) * 2 - 1;
}

export function canvasToWebGLCoordInvert(gl: WebGLRenderingContext, y: number): number {
  return (y / gl.canvas.height) * -2 + 1; // because GL is 0 at bottom
}

export function colorizeTexture(texture: Uint8Array, colorIndex: number): Uint8Array {
  return texture.map((item) => (item !== 0 ? colorIndex : item));
}

// testing, debugging purposes only
export function visualiseTexture(texture: Uint8Array, width: number): void {
  console.log('width: ' + width);
  const indexRedComponent = [];
  for (let i = 0; i < texture.length; i = i + 4) {
    indexRedComponent.push(texture[i]);
  }
  let j = 0;
  let row = '';
  let rowNumber = 1;
  const rows = [];
  for (let i = 0; i < indexRedComponent.length; i++) {
    j++;
    row = row + indexRedComponent[i];
    if (j === width) {
      j = 0;
      rows.unshift(rowNumber + ': ' + row); // unshift as texture y coords start from bottom
      row = '';
      rowNumber++;
    }
  }
  rows.forEach((item, index) => {
    if (index < 100) {
      console.log(item.substring(0, 100));
    }
  });
}
