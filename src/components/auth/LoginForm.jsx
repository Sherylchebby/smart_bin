import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Box, 
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Visibility, VisibilityOff, Email } from '@mui/icons-material';
import ErrorAlert from '../ui/ErrorAlert';
import { useAuth } from '../../context/AuthContext';

const LoginForm = ({ onEmailLogin, onPhoneLogin, onResetPassword, loading, resetLoading, loginError }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, watch, clearErrors } = useForm();
  const [error, setError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Update form errors when loginError changes
  useEffect(() => {
    if (loginError) {
      setError(loginError);
    } else {
      setError('');
    }
  }, [loginError]);

  // Redirect if user is already logged in
  React.useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    clearErrors();
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleEmailSubmit = async (data) => {
    try {
      setError('');
      clearErrors();
      await onEmailLogin(data.email, data.password);
      setLoginSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
    }
  };

  const handlePhoneSubmit = async (data) => {
    try {
      setError('');
      clearErrors();
      await onPhoneLogin(data.phone, data.password);
      setLoginSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
    }
  };

  const handleOpenResetDialog = () => {
    // Pre-fill with email if available
    if (activeTab === 0) {
      const emailValue = watch('email');
      setResetEmail(emailValue || '');
    }
    setResetDialogOpen(true);
  };

  const handleCloseResetDialog = () => {
    setResetDialogOpen(false);
  };

  const handleResetPassword = () => {
    onResetPassword(resetEmail);
    handleCloseResetDialog();
  };

  return (
    <Box sx={{ mt: 3, maxWidth: 400, mx: 'auto' }}>
      {error && <ErrorAlert error={error} onClose={() => setError('')} />}

      {loginSuccess ? (
        <Box sx={{ textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Login successful! Redirecting...
          </Alert>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab label="Email Login" />
            <Tab label="Phone Login" />
          </Tabs>

          {activeTab === 0 && (
            <Box component="form" onSubmit={handleSubmit(handleEmailSubmit)}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                autoComplete="email"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email', { 
                  required: 'Email required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email'
                  }
                })}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('password', { 
                  required: 'Password required',
                  minLength: {
                    value: 6,
                    message: 'Minimum 6 characters'
                  }
                })}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button 
                  color="secondary" 
                  onClick={handleOpenResetDialog}
                  startIcon={<Email />}
                >
                  Forgot Password?
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box component="form" onSubmit={handleSubmit(handlePhoneSubmit)}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Phone Number"
                placeholder="+1234567890"
                autoComplete="tel"
                autoFocus
                error={!!errors.phone}
                helperText={errors.phone?.message || "Include country code (e.g., +1 for US)"}
                {...register('phone', { 
                  required: 'Phone number required',
                  validate: {
                    validPhone: (value) => {
                      const digits = value.replace(/\D/g, '');
                      const hasPlus = value.startsWith('+');
                      return (hasPlus && digits.length >= 10) || 'Valid phone number with country code required';
                    }
                  }
                })}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('password', { 
                  required: 'Password required',
                  minLength: {
                    value: 6,
                    message: 'Minimum 8 characters'
                  }
                })}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Box>
          )}

          {/* Password Reset Dialog */}
          <Dialog open={resetDialogOpen} onClose={handleCloseResetDialog}>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                variant="standard"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                helperText="Enter your email to receive a password reset link"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseResetDialog}>Cancel</Button>
              <Button 
                onClick={handleResetPassword} 
                disabled={resetLoading || !resetEmail}
                startIcon={resetLoading ? <CircularProgress size={16} /> : null}
              >
                Send Reset Link
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default LoginForm;