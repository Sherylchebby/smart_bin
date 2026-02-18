import React, { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  const { loginWithEmail, loginWithPhone, resetPassword } = useAuth(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [loginError, setLoginError] = useState('');
  const location = useLocation();
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (location.state?.fromRegistration) {
      setShowRegistrationSuccess(true);
      // Hide after 5 seconds
      const timer = setTimeout(() => setShowRegistrationSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleLogin = async (identifier, password, isPhoneLogin = false) => {
    try {
      setLoading(true);
      setLoginError(''); // Clear any previous errors
      
      if (isPhoneLogin) {
        await loginWithPhone(identifier, password); // Use phone login
      } else {
        await loginWithEmail(identifier, password); // Use email login
      }
      
      // Redirect to dashboard after successful login
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      // Set specific error messages based on error code
      console.log('Login error:', error.code, error.message);
      
      if (error.code === 'auth/invalid-email') {
        setLoginError('Invalid email address format.');
      } else if (error.code === 'auth/user-not-found') {
        setLoginError('No account found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        setLoginError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('Too many failed attempts. Please try again later.');
      } else {
        setLoginError(error.message || 'Login failed. Please check your credentials.');
      }
     
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (email) => {
    try {
      setResetLoading(true);
      setResetError('');
      await resetPassword(email);
      setResetEmailSent(true);
      // Hide success message after 5 seconds
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (error) {
      setResetError(error.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {showRegistrationSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Registration successful! Please log in to continue.
          </Alert>
        )}
        
        {resetEmailSent && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Password reset email sent! Check your inbox.
          </Alert>
        )}
        
        {resetError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setResetError('')}>
            {resetError}
          </Alert>
        )}
        
        {/* Display login error if exists */}
        {loginError && (
          <Alert severity="error" sx={{ mb: 3, width: '100%' }} onClose={() => setLoginError('')}>
            {loginError}
          </Alert>
        )}
        
        <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
          Smart Bin Login
        </Typography>
        
        <LoginForm 
          onEmailLogin={(email, password) => handleLogin(email, password, false)}
          onPhoneLogin={(phone, password) => handleLogin(phone, password, true)}
          onResetPassword={handlePasswordReset}
          loading={loading}
          resetLoading={resetLoading}
          loginError={loginError}
        />
        
        <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
          <Grid item>
            <Link to="/register" variant="body2">
              Don't have an account? Sign Up
            </Link>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default LoginPage;