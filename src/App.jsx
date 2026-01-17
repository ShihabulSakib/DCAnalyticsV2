import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ResultsView from './components/ResultsView';
import AdminDashboard from './components/AdminDashboard';
import CompareView from './components/CompareView';
import LoginPage from './components/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ResultsView />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="compare" element={<CompareView />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
