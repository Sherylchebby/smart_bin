import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyWaitingPage from './pages/VerifyWaitingPage';
import CompleteRegistrationPage from './pages/CompleteRegistrationPage'
import AdminPage from './pages/AdminPage';
import VendorDashboard from './pages/VendorDashboard';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// theme to match ui on all pages
const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Green
    },
    secondary: {
      main: '#ff8f00', // Amber
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'sans-serif'
    ].join(','),
  },
});

const routes = [
  { path: '/dashboard', element: <DashboardPage />, protected: true },
];

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={route.protected ? <PrivateRoute>{route.element}</PrivateRoute> : route.element}
        />
          ))}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<PrivateRoute> <ProfilePage />
            </PrivateRoute>
             } 
           />
            <Route path="/dashboard" element={<PrivateRoute> <DashboardPage />
            </PrivateRoute>
              } 
            />
            <Route path="/admin" element={<PrivateRoute> <AdminPage />
            </PrivateRoute>
              } 
           />
           <Route path="/verify-email" element={<VerifyEmailPage />} />
           <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
           <Route path="/verify-waiting" element={<VerifyWaitingPage />} />
           <Route path="/vendor" element={<PrivateRoute> <VendorDashboard />
            </PrivateRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;