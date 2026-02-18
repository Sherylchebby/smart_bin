import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  CircularProgress,
  Alert 
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const PhoneVerification = ({ confirmation }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyOTP, clearError, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      clearError();
      await verifyOTP(confirmation.verificationId, code);
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 3, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Verify Your Phone Number
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        We've sent a 6-digit code to your phone. Please enter it below.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Verification Code"
          variant="outlined"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          sx={{ mb: 2 }}
        />
        
        <div id="recaptcha-container" style={{ marginBottom: '16px' }} />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading || code.length < 6}
        >
          {loading ? <CircularProgress size={24} /> : 'Verify Phone'}
        </Button>
      </Box>
    </Box>
  );
};

export default PhoneVerification;