/**
 * Main App Component
 * Sets up routing and role-aware authentication with Material UI
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
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/AuthContextValue';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationDisplay } from './components/NotificationDisplay';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { ServiceBrowsePage } from './pages/ServiceBrowsePage';
import { EnhancedServiceRequestPage } from './pages/EnhancedServiceRequestPage';
import { PaymentPage } from './pages/PaymentPage';
import { AdminPage } from './pages/AdminPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ApprovalPage } from './pages/ApprovalPage';
import { DeliveryTrackingPage } from './pages/DeliveryTrackingPage';
import { canSubmitRequests, canUseAdminTools, canViewRequestList } from './utils/permissions';
import './App.css';

const getDefaultRouteForRole = (role?: string) => {
  if (role === 'requester') return '/services';
  if (role === 'orchestrator') return '/requests/new';
  return '/dashboard';
};

const LoadingGate: React.FC = () => (
  <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress />
  </Box>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const auth = React.useContext(AuthContext);

  if (auth?.isAuthLoading) {
    return <LoadingGate />;
  }

  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.user?.role || '')) {
    return <Navigate to={getDefaultRouteForRole(auth.user?.role)} replace />;
  }

  return <>{children}</>;
};

const RoleRedirect: React.FC = () => {
  const auth = React.useContext(AuthContext);

  if (auth?.isAuthLoading) {
    return <LoadingGate />;
  }

  return <Navigate to={auth?.isAuthenticated ? getDefaultRouteForRole(auth.user?.role) : '/login'} replace />;
};

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

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const role = auth?.user?.role;

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
      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Service Envelope
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, mr: 3 }}>
            {canViewRequestList(role) && (
              <NavLink icon={<DashboardIcon fontSize="small" />} label="Requests" href="/dashboard" />
            )}
            {canSubmitRequests(role) && (
              <NavLink icon={<BuildIcon fontSize="small" />} label="Services" href="/services" />
            )}
            {canUseAdminTools(role) && (
              <NavLink icon={<SettingsIcon fontSize="small" />} label="Admin" href="/admin" />
            )}
            {canUseAdminTools(role) && (
              <NavLink icon={<HelpIcon fontSize="small" />} label="Documentation" href="/documentation" />
            )}
          </Box>

          <IconButton onClick={handleMenuOpen} sx={{ ml: 2 }}>
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
              <Box>
                <Typography variant="caption" sx={{ display: 'block' }}>{auth.user?.email}</Typography>
                <Typography variant="caption" color="text.secondary">{role}</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, py: 3 }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
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

function AppInner() {
  const location = useLocation();
  const isApprovalPage = location.pathname.startsWith('/approvals/');
  const isFeedbackPage = location.pathname.startsWith('/feedback/');

  return (
    <>
      {!isApprovalPage && !isFeedbackPage ? (
        <Layout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/:requestId"
              element={
                <ProtectedRoute allowedRoles={['requester', 'admin', 'super_admin']}>
                  <RequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/new"
              element={
                <ProtectedRoute allowedRoles={['requester', 'admin', 'super_admin']}>
                  <EnhancedServiceRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute allowedRoles={['requester', 'admin', 'super_admin']}>
                  <ServiceBrowsePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documentation"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <DocumentationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery/:requestId/tracking"
              element={
                <ProtectedRoute allowedRoles={['requester', 'admin', 'super_admin']}>
                  <DeliveryTrackingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute allowedRoles={['requester', 'admin', 'super_admin']}>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </Layout>
      ) : (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 3 }}>
          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
            <Routes>
              <Route path="/approvals/:token" element={<ApprovalPage />} />
              <Route path="/feedback/:token" element={<FeedbackPage />} />
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
