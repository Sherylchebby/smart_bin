import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/config';

const VerifyWaitingPage = () => {
  const { currentUser, loading, verificationPending } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
  const checkForTempId = () => {
    const params = new URLSearchParams(window.location.search);
    const tempId = params.get('tempId');
    
    if (tempId) {
      navigate(`/complete-registration?tempId=${tempId}`, { 
        replace: true,
        state: { tempId }
      });
    }
  };
}, [navigate, location]);

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tempId = params.get('tempId');
  const verifyFlag = params.get('verify');
  
  if (verifyFlag && tempId) {
    navigate(`/complete-registration?tempId=${tempId}`, { 
      replace: true,
      state: { 
        email: location.state?.email,
        tempId: tempId 
      }
    });
  }
}, [navigate, location]);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  useEffect(() => {
    if (currentUser?.emailVerified) {
      navigate('/complete-registration');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        if (newTime >= 30) setShowResend(true);
        return newTime;
      });
      
      // Check verification status periodically
      if (currentUser && !currentUser.emailVerified) {
        currentUser.reload().then(() => {
          if (currentUser.emailVerified) {
            navigate('/complete-registration');
          }
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser, navigate]);

  const handleResend = async () => {
  try {
    const actionCodeSettings = {
      url: window.location.hostname === 'localhost' 
        ? `http://${window.location.host}/complete-registration`
        : `https://${window.location.host}/complete-registration`,
      handleCodeInApp: true
    };

    await sendEmailVerification(currentUser, actionCodeSettings);
    setShowResend(false);
    setTimeElapsed(0);
    alert('New verification link sent!');
  } catch (error) {
    console.error("Resend failed:", error);
    alert(`Error: ${error.message}`);
  }
};

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '70vh',
      textAlign: 'center',
      p: 3
    }}>
      <Typography variant="h4" gutterBottom>
        Verify Your Email
      </Typography>
      
      <CircularProgress size={60} sx={{ my: 4 }} />
      
      <Typography variant="body1" sx={{ mb: 2, maxWidth: 500 }}>
        We've sent a verification email to <strong>{email}</strong>.
        Please check your inbox and click the verification link to continue.
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Haven't received the email? Check your spam folder.
      </Typography>
      
      {showResend && (
        <Button 
          variant="outlined" 
          onClick={handleResend}
          disabled={loading}
        >
          Resend Verification Email
        </Button>
      )}
    </Box>
  );
};

export default VerifyWaitingPage;