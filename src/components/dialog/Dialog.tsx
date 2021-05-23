import React from 'react';
import './Dialog.css';
import '../modal/Modal.css';
import { Modal } from '../modal/Modal';

interface Props {
  header: string;
  prompt?: string;
  children: React.ReactNode;
}

export function Dialog({ header, prompt, children }: Props): JSX.Element | null {
  return (
    <>
      <Modal header={header}>
        <p className="dialog-text">{prompt}</p>
        {children}
      </Modal>
    </>
  );
}
