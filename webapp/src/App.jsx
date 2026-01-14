
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

function App() {
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  // Dark Mode Toggle
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const [currentUser, setCurrentUser] = useState(null);

  // Check for session (simulated)
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  const handleLogin = (roll) => {
    // In a real app we'd verify token here.
    localStorage.setItem('currentUser', roll);
    setCurrentUser(roll);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/dashboard" element={<Dashboard toggleTheme={toggleTheme} isDark={isDark} currentUser={currentUser} onLogout={handleLogout} />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

export default App;
