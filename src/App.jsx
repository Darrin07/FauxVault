import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import TransferPage from './pages/TransferPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

//Check if user is authenticated, else route to login
function ProtectedRoute({children}) {
  const { isAuthenticated } = useAuth()
  if (!isAutenticated) {
    return <Navigate to="/login" rpelace />
  }
  return children
}

function App() {
  return (
   <BrowserRouter>
   <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
        
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>
      {/* Add login page */}
    </Routes>
    </BrowserRouter>
  )
}
export default App;
