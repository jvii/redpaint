import React, { useRef } from 'react';
import { useOvermind } from '../../overmind';
import { MenuItem } from './MenuItem';
import { MenuItemSave } from './MenuItemSave';
import { MenuItemOpen } from './MenuItemOpen';
import { CustomBrush } from '../../brush/CustomBrush';
import './Menubar.css';
import { brushHistory } from '../../brush/BrushHistory';

export function Menubar(): JSX.Element {
  const { state, actions } = useOvermind();
  const overlayRef = useRef<HTMLDivElement>(document.createElement('div'));

  const toggle = (): void => {
    if (overlayRef.current.clientHeight === 0) {
      overlayRef.current.style.height = '25%';
    } else {
      overlayRef.current.style.height = '0%';
    }
  };

  const close = (): void => {
    overlayRef.current.style.height = '0%';
  };

  const handleImageFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      actions.canvas.setLoadedImage(URL.createObjectURL(input.files[0]));
    }
  };

  const handleBrushFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      //actions.brush.setBrush(new CustomBrush(URL.createObjectURL(input.files[0])));
      actions.brush.setMode('Matte');
    } else {
      alert('Failed to open file!');
    }
  };

  const getImageObjectURLToSave = (): string => {
    //return state.undo.currentBufferItem ? URL.createObjectURL(state.undo.currentBufferItem) : '#';
    return 'todo';
  };

  const getBrushObjectURLToSave = (): string => {
    const brush = brushHistory.current;
    return brush instanceof CustomBrush ? brush.getObjectURL() : '#';
  };

  const mode = state.brush.mode;

  return (
    <>
      <div className="menubar" onClick={toggle}>
        <p className="menubar__title">ReDPaint</p>
        <p className="menubar__mode-indicator">{mode}</p>
      </div>
      <div className="menu" ref={overlayRef} onMouseLeave={close} onContextMenu={close}>
        <div className="menu__content">
          <div className="menu__image">
            <div className="menu__header">Image</div>
            <MenuItemOpen label="Open..." handleFile={handleImageFileOpen}></MenuItemOpen>
            <MenuItemSave
              label="Save..."
              objectURLToSave={getImageObjectURLToSave()}
            ></MenuItemSave>
          </div>
          <div className="menu__brush">
            <div className="menu__header">Brush</div>
            <MenuItemOpen label="Open..." handleFile={handleBrushFileOpen}></MenuItemOpen>
            <MenuItemSave
              label="Save..."
              objectURLToSave={getBrushObjectURLToSave()}
            ></MenuItemSave>
          </div>
          <div className="menu__mode">
            <div className="menu__header">Mode</div>
            <MenuItem
              label="Matte"
              isSelected={state.brush.mode === 'Matte'}
              onClick={(): void => actions.brush.setMode('Matte')}
            ></MenuItem>
            <MenuItem
              label="Color"
              isSelected={state.brush.mode === 'Color'}
              onClick={(): void => actions.brush.setMode('Color')}
            ></MenuItem>
          </div>
        </div>
        <div className="closeButtonDiv">
          <a href="javascript:void(0)" className="menu__closebtn" onClick={close}>
            &times;
          </a>
        </div>
      </div>
    </>
  );
}
