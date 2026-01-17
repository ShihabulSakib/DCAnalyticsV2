import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ResultsView from './components/ResultsView';
import AdminDashboard from './components/AdminDashboard';
import CompareView from './components/CompareView';
import LoginPage from './components/LoginPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ResultsView />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="compare" element={<CompareView />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
