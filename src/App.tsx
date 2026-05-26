/**
 * Main App Component
 * Sets up routing and authentication with Material UI
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationDisplay } from './components/NotificationDisplay';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { ServiceBuilderPage } from './pages/ServiceBuilderPage';
import { ApprovalPage } from './pages/ApprovalPage';
import { PaymentPage } from './pages/PaymentPage';
import { AdminPage } from './pages/AdminPage';
import './App.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = React.useContext(AuthContext);
  
  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// Navigation Links Component
const NavLink: React.FC<{ icon: React.ReactNode; label: string; href: string }> = ({
  icon,
  label,
  href,
}) => (
  <Box
    component="a"
    href={href}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      color: 'rgba(255, 255, 255, 0.7)',
      textDecoration: 'none',
      transition: 'color 0.2s',
      '&:hover': { color: 'white' },
    }}
  >
    {icon}
    <Typography variant="body2">{label}</Typography>
  </Box>
);

// Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!auth?.isAuthenticated) {
    return <>{children}</>;
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
    handleMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* AppBar */}
      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Service Envelope
          </Typography>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', gap: 3, mr: 3 }}>
            <NavLink icon={<DashboardIcon fontSize="small" />} label="Requests" href="/dashboard" />
            <NavLink icon={<BuildIcon fontSize="small" />} label="Services" href="/services" />
            <NavLink icon={<SettingsIcon fontSize="small" />} label="Admin" href="/admin" />
          </Box>

          {/* User Menu */}
          <IconButton
            onClick={handleMenuOpen}
            sx={{ ml: 2 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#1565c0',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {auth.user?.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <Typography variant="caption">{auth.user?.email}</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box component="main" sx={{ flex: 1, py: 3 }}>
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppInner />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

// App Inner Component (wrapped with notifications and route handling)
function AppInner() {
  const location = useLocation();
  const isApprovalPage = location.pathname.startsWith('/approvals/');
  const isPaymentPage = location.pathname.startsWith('/payment');

  return (
    <>
      {!isApprovalPage && !isPaymentPage ? (
        <Layout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/requests/:requestId"
              element={
                <ProtectedRoute>
                  <RequestDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/services"
              element={
                <ProtectedRoute>
                  <ServiceBuilderPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Layout>
      ) : (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 3 }}>
          <Container maxWidth="lg">
            <Routes>
              {/* Public approval page - no layout, no authentication required */}
              <Route path="/approvals/:token" element={<ApprovalPage />} />
              {/* Public payment page - no layout, no authentication required */}
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </Container>
        </Box>
      )}
      
      <NotificationDisplay />
    </>
  );
}

export default App;
