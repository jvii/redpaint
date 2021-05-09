import React, { useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export function ToolboxButtonContainer(props: Props): JSX.Element {
  const [isHovered, setHovered] = useState(false);

  return (
    <div
      className="toolbox_button_container"
      onMouseOver={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={'toolbox_button_color' + (isHovered ? ' toolbox_button_color_hover' : '')}
      ></div>
      {props.children}
    </div>
  );
}
