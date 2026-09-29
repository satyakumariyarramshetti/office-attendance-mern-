import React from 'react';
import styles from './wishflow.module.css';

const Wishflow = () => {
  return (
    <div className={styles.wishflowContainer}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Welcome to Wish Flow</h1>
        <p className={styles.description}>This is the wishflow website.</p>
      </div>
    </div>
  );
};

export default Wishflow;