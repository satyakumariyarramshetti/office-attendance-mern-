import React, { useState } from 'react';
import './LPDashboard.css';

const PASSWORD = '123';

const LPDashboard = () => {
  const [enteredPassword, setEnteredPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (enteredPassword === PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="lp-dashboard-bg">
      {!authenticated ? (
        <div className="lp-dashboard-container">
          <h2 className="lp-dashboard-heading">LP Dashboard Login</h2>
          <form onSubmit={handleSubmit} className="lp-password-form">
            <input
              type="password"
              placeholder="Enter password"
              value={enteredPassword}
              className="lp-password-input"
              onChange={e => setEnteredPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="lp-btn">Login</button>
          </form>
          {error && <div className="lp-error">{error}</div>}
        </div>
      ) : (
        <div className="lp-dashboard-container">
          <h2 className="lp-dashboard-heading">Leave Plan Dashboard</h2>
          <div className="lp-dashboard-buttons">
            <button className="lp-btn pending">Pending Leaves</button>
            <button className="lp-btn approved">Approved Leaves</button>
            <button className="lp-btn rejected">Rejected Leaves</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LPDashboard;
