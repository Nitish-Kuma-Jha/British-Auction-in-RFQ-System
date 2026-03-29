import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/common/Navbar';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import RFQPage from './pages/RFQPage';
import RFQDetailPage from './pages/RFQDetailPage';
import AdminPage from './pages/AdminPage';
import ResultsPage from './pages/ResultsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--gold)', letterSpacing: 4, marginBottom: 16 }}>BARS</div>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/home" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <AuthPage />} />
      <Route path="/home" element={
        <ProtectedRoute><AppLayout><HomePage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/room/:id" element={
        <ProtectedRoute><RoomPage /></ProtectedRoute>
      } />
      <Route path="/room/:id/results" element={
        <ProtectedRoute><ResultsPage /></ProtectedRoute>
      } />
      <Route path="/rfq" element={
        <ProtectedRoute><AppLayout><RFQPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/rfq/:id" element={
        <ProtectedRoute><AppLayout><RFQDetailPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><AppLayout><AdminPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#000' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
