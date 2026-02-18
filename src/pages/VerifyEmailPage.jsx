import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button, 
  Alert,
  TextField  // Added missing import
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { auth, isSignInWithEmailLink } from '../firebase/config';  // Added missing import

const VerifyEmailPage = () => {
  const { 
    currentUser, 
    verificationPending,
    verificationMethod,
    handleEmailLinkSignIn,
    verificationEmail,
    loading: authLoading
  } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailPrompt, setEmailPrompt] = useState(false);
  const [email, setEmail] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setLocalLoading(true);
        try {
          // Check if we have the email in localStorage or prompt user
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            setEmailPrompt(true);
            return;
          }
          
          await handleEmailLinkSignIn();
          window.localStorage.removeItem('emailForSignIn');
          navigate('/dashboard');
        } catch (error) {
          setError(error.message);
        } finally {
          setLocalLoading(false);
        }
      }
    };

    checkEmailLink();
  }, [location, handleEmailLinkSignIn, navigate]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    try {
      setLocalLoading(true);
      setError('');
      await handleEmailLinkSignIn(email);
      window.localStorage.removeItem('emailForSignIn');
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const loading = authLoading || localLoading;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (emailPrompt) {
    return (
      <Box sx={{ mt: 3, maxWidth: 500, mx: 'auto', p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Email Verification
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Please enter your email address to complete the verification process.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleEmailSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify Email'}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3, maxWidth: 500, mx: 'auto', textAlign: 'center', p: 3 }}>
      {verificationPending && verificationMethod === 'email' ? (
        <>
          <Typography variant="h4" gutterBottom>
            Verify Your Email
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            We've sent a verification email to <strong>{verificationEmail}</strong>.
            Please check your inbox and click the link to verify your account.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 3 }}>
            Didn't receive the email? Check your spam folder or try again later.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            Email Verification
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Please check your email inbox and follow the verification link.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </>
      )}
    </Box>
  );
};

export default VerifyEmailPage;