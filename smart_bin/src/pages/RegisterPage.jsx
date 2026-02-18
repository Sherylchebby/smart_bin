import React, { useState, useEffect } from 'react';
import { 
  ref, 
  get, 
  query,
  orderByChild,
  equalTo 
} from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { 
  Container,
  Grid,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import RegisterForm from '../components/auth/RegisterForm';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { registerUserWithRfid } from '../services/firebaseService';

const RegisterPage = () => {
  const { register: authRegister, loading: authLoading } = useAuth();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [unregisteredRfids, setUnregisteredRfids] = useState([]);
  const [rfidError, setRfidError] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [loading, setLoading] = useState({
    rfids: true,
    registration: false
  });
  const navigate = useNavigate();

  const fetchUnregisteredRfids = async () => {
    try {
      setLoading(prev => ({ ...prev, rfids: true }));
      setRfidError('');
      
      const unregisteredQuery = query(
        ref(database, 'unregisteredRfids'),
        orderByChild('uid')
      );
      const snapshot = await get(unregisteredQuery);
      
      if (snapshot.exists()) {
        const rfids = [];
        snapshot.forEach((child) => {
          rfids.push({
            uid: child.val().uid,
            key: child.key,
            timestamp: child.val().timestamp
          });
        });
        setUnregisteredRfids(rfids);
      } else {
        setUnregisteredRfids([]);
      }
    } catch (err) {
      setRfidError('Failed to load available RFIDs');
      console.error('RFID fetch error:', err);
    } finally {
      setLoading(prev => ({ ...prev, rfids: false }));
    }
  };

  useEffect(() => {
    fetchUnregisteredRfids();
  }, []);

  const handleRegister = async (formData) => {
    try {
      setRegistrationError('');
      setLoading(prev => ({ ...prev, registration: true }));
      setRegistrationSuccess(false);

      const rfid = formData.rfid?.trim();
      if (!rfid) throw new Error('Please select an RFID');

      const unregisteredQuery = query(
        ref(database, 'unregisteredRfids'),
        orderByChild('uid'),
        equalTo(rfid)
      );
      const unregisteredSnapshot = await get(unregisteredQuery);
      
      const registrySnapshot = await get(ref(database, `rfidRegistry/${rfid}`));

      if (!unregisteredSnapshot.exists()) throw new Error('RFID not scanned at bin yet');
      if (registrySnapshot.exists()) throw new Error('RFID already registered to another user');

      const userCredential = await authRegister({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        rfid: rfid
      });

      await registerUserWithRfid(
        userCredential.user.uid,
        {
          name: formData.name,
          email: formData.email,
          ...(formData.phone && { phone: formData.phone })
        },
        rfid
      );

      
      setUnregisteredRfids(prev => 
        prev.filter(item => item.uid.toLowerCase() !== rfid.toLowerCase())
      );
      setRegistrationSuccess(true);
      // Redirect after 3 seconds
      setTimeout(() => navigate('/login'), 1000);

    } catch (error) {
      console.error('Registration failed:', error);
      
      const userMessage = error.message.includes('already registered') ? 
        'This RFID is already assigned to another user' :
        error.message.includes('not scanned') ?
        'RFID not scanned at bin yet' :
        'Registration failed. Please try again.';

      setRegistrationError(userMessage);
      await fetchUnregisteredRfids();
    } finally {
      setLoading(prev => ({ ...prev, registration: false }));
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ 
        mt: 8, 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}>
        <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
          Create Your Account
        </Typography>
        
        {registrationSuccess ? (
          <>
            <Alert severity="success" sx={{ mb: 3, width: '100%' }}>
              Registration successful! Login to continue ...
            </Alert>
            <CircularProgress />
          </>
        ) : (
          <>
            <Typography variant="body1" align="center" sx={{ mb: 3, maxWidth: '600px' }}>
              Before registering, please scan your RFID card at the smart bin.
            </Typography>

            {loading.rfids ? (
              <CircularProgress sx={{ mb: 3 }} />
            ) : rfidError ? (
              <Alert severity="error" sx={{ mb: 3 }}>{rfidError}</Alert>
            ) : unregisteredRfids.length === 0 ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                No unregistered RFIDs found. Please scan your card first.
              </Alert>
            ) : null}

            <RegisterForm 
              onSubmit={handleRegister} 
              loading={loading.registration || authLoading}
              rfidOptions={unregisteredRfids
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(rfid => ({
                  uid: rfid.uid,
                  key: rfid.key,
                  timestamp: rfid.timestamp,
                  label: `${rfid.uid} (scanned at ${new Date(rfid.timestamp).toLocaleTimeString()})`
                }))
              }
              onRefreshRfids={fetchUnregisteredRfids}
              error={registrationError}
              success={registrationSuccess}
            />
          </>
        )}
        
        <Grid container justifyContent="flex-end" sx={{ mt: 2, width: '100%' }}>
          <Grid item>
            <Link component={RouterLink} to="/login" variant="body2" underline="hover">
              Already have an account? Sign in
            </Link>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default RegisterPage;