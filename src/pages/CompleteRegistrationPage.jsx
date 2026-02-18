import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress, Paper, Alert } from '@mui/material';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import VerifiedIcon from '@mui/icons-material/Verified';

const CompleteRegistrationPage = () => {
  const navigate = useNavigate();
  const [tempUser, setTempUser] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: null,
    completed: false
  });

  // Fetch the most recent temporary user
  useEffect(() => {
    const fetchTempUser = async () => {
      try {
        setStatus(prev => ({ ...prev, loading: true, error: null }));
        
        const tempUsersRef = ref(database, 'tempUsers');
        const snapshot = await get(tempUsersRef);
        
        if (!snapshot.exists()) {
          throw new Error('No pending registrations found');
        }

        // Convert to array and sort by createdAt (newest first)
        const tempUsers = [];
        snapshot.forEach((child) => {
          tempUsers.push({
            ...child.val(),
            tempId: child.key
          });
        });

        const newestTempUser = tempUsers.sort((a, b) => b.createdAt - a.createdAt)[0];
        setTempUser(newestTempUser);
        setStatus(prev => ({ ...prev, loading: false }));

      } catch (error) {
        console.error('Error fetching temp user:', error);
        setStatus({
          loading: false,
          error: error.message,
          completed: false
        });
      }
    };

    fetchTempUser();
  }, []);

  const handleConfirmRegistration = async () => {
    if (!tempUser) return;

    try {
      setStatus(prev => ({ ...prev, loading: true }));

      // 1. Find the corresponding user in the users table
      const rfidRegistryRef = ref(database, `rfidRegistry/${tempUser.rfid}`);
      const rfidSnapshot = await get(rfidRegistryRef);
      
      if (!rfidSnapshot.exists()) {
        throw new Error('User not found in registry');
      }

      const userId = rfidSnapshot.val();

      // 2. Update user status to verified and active
      const updates = {
        [`users/${userId}/basicInfo/verified`]: true,
        [`users/${userId}/userData/status`]: "active"
      };

      // 3. Remove from tempUsers
      updates[`tempUsers/${tempUser.tempId}`] = null;

      // 4. Execute all updates atomically
      await update(ref(database), updates);

      // 5. Redirect to login
      setStatus(prev => ({ ...prev, completed: true }));
      setTimeout(() => navigate('/login'), 2000);

    } catch (error) {
      console.error('Confirmation failed:', error);
      setStatus({
        loading: false,
        error: error.message || 'Failed to confirm registration',
        completed: false
      });
    }
  };

  if (status.loading) {
    return (
      <Box sx={styles.container}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Loading registration details...
        </Typography>
      </Box>
    );
  }

  if (status.error) {
    return (
      <Box sx={styles.container}>
        <Alert severity="error" sx={styles.alert}>
          {status.error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/register')}
          sx={styles.button}
        >
          Back to Registration
        </Button>
      </Box>
    );
  }

  if (status.completed) {
    return (
      <Box sx={styles.container}>
        <VerifiedIcon color="success" sx={styles.icon} />
        <Typography variant="h4" gutterBottom>
          Registration Confirmed!
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Your account is now active. Redirecting to login...
        </Typography>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={styles.container}>
      <Paper elevation={3} sx={styles.paper}>
        <Typography variant="h4" gutterBottom>
          Confirm Registration Details
        </Typography>
        
        <Typography variant="body1" sx={styles.detailItem}>
          <strong>Name:</strong> {tempUser.name}
        </Typography>
        
        <Typography variant="body1" sx={styles.detailItem}>
          <strong>Email:</strong> {tempUser.email}
        </Typography>

        {tempUser.phone && (
          <Typography variant="body1" sx={styles.detailItem}>
            <strong>Phone:</strong> {tempUser.phone}
          </Typography>
        )}

        <Typography variant="body1" sx={styles.detailItem}>
          <strong>RFID:</strong> {tempUser.rfid}
        </Typography>

        <Button
          variant="contained"
          onClick={handleConfirmRegistration}
          disabled={status.loading}
          sx={styles.button}
        >
          {status.loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Confirm Registration'
          )}
        </Button>
      </Paper>
    </Box>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    p: 3,
    backgroundColor: '#f5f5f5'
  },
  paper: {
    p: 4,
    maxWidth: 500,
    width: '100%',
    textAlign: 'center'
  },
  alert: {
    mb: 3,
    width: '100%'
  },
  button: {
    mt: 3,
    py: 1.5,
    px: 4,
    fontSize: '1rem'
  },
  icon: {
    fontSize: 60,
    mb: 2
  },
  detailItem: {
    mb: 2,
    textAlign: 'left',
    paddingLeft: '20%'
  }
};

export default CompleteRegistrationPage;