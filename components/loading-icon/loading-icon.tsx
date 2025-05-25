import React, { ReactElement } from 'react';
import styles from './style.module.css';

export default function LoadingIcon(): ReactElement {
  return (
    <div className={`${styles.loading}`}></div>
  )
}
