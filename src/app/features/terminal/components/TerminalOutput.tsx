'use client';

import React, { FC } from 'react';
import { TerminalOutputProps } from '../types/terminal';
import styles from './Terminal.module.css';

/**
 * Terminal output component to display text
 */
export const TerminalOutput: FC<TerminalOutputProps> = ({ displayText, outputRef }) => (
  <div className={styles.output} ref={outputRef}>
    <pre>{displayText}</pre>
  </div>
);
