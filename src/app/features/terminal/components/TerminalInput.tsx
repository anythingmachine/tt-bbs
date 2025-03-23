'use client';

import React, { FC } from 'react';
import { TerminalInputProps } from '../types/terminal';
import styles from './Terminal.module.css';

/**
 * Terminal input component that handles user input
 */
export const TerminalInput: FC<TerminalInputProps> = ({
  input,
  onInputChange,
  onSubmit,
  inputRef,
  isWaitingForInput,
}) => (
  <form onSubmit={onSubmit} className={styles.inputForm}>
    <input
      type="text"
      value={input}
      onChange={onInputChange}
      ref={inputRef}
      className={styles.input}
      disabled={!isWaitingForInput}
      autoComplete="off"
      aria-label="Terminal input"
    />
  </form>
);
