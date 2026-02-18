import React, { useState } from 'react';
import { Button, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const EmailVerification = () => {
  const { 
    verificationEmail, 
    resendVerificationEmail,
    clearError,
    error
  } = useAuth();
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    try {
      setLoading(true);
      clearError();
      await resendVerificationEmail();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (error) {
      console.error("Resend error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Verify Your Email Address
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2 }}>
        We've sent a verification email to <strong>{verificationEmail}</strong>.
        Please check your inbox and click the link to verify your account.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Typography variant="body2" sx={{ mb: 3 }}>
        Didn't receive the email? Check your spam folder or resend the verification email.
      </Typography>
      
      <Button
        variant="contained"
        onClick={handleResend}
        disabled={loading || resent}
      >
        {loading ? <CircularProgress size={24} /> : 
         resent ? 'Email Resent!' : 'Resend Verification Email'}
      </Button>
    </Box>
  );
};

export default EmailVerification;