import React, { useEffect, useState } from 'react';
import './Header.css';

const Header = ({ onLogout }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`header d-flex justify-content-between align-items-center px-4 py-3 bg-light shadow-sm ${scrolled ? 'scrolled' : ''}`}>
      <h2 className="header-title m-0">Attendance Management</h2>
      <button className="logout-btn btn btn-danger" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
};

export default Header;
