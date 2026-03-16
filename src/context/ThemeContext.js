import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [notifEnabled, setNotifEnabled] = useState(() => {
    return localStorage.getItem('notifications') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('notifications', notifEnabled ? 'true' : 'false');
  }, [notifEnabled]);

  const toggleTheme = () => setIsDark(prev => !prev);
  const toggleNotif = () => setNotifEnabled(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, notifEnabled, toggleNotif }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);