import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, update, get } from 'firebase/database';
import { database } from '../firebase/config';
import { 
  Container, 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  TextField, 
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editField, setEditField] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    photoBase64: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [originalData, setOriginalData] = useState({});
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [reauthDialogOpen, setReauthDialogOpen] = useState(false);
  const [reauthField, setReauthField] = useState('');

  useEffect(() => {
    if (currentUser) {
      const userRef = ref(database, `users/${currentUser.uid}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const initialData = {
            name: userData.basicInfo?.name || '',
            email: currentUser.email || '',
            phone: userData.basicInfo?.phone || '',
            photoBase64: userData.basicInfo?.photoBase64 || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
          setProfileData(initialData);
          setOriginalData(initialData);
        }
      });
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50000) {
      setError('Image must be smaller than 50KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData(prev => ({ ...prev, photoBase64: reader.result }));
      handleSave('photoBase64', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (field) => {
    setEditField(field);
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setEditField(null);
    setError('');
    setSuccess('');
  };

  const handleClickShowPassword = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const reauthenticateUser = async (password) => {
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      return true;
    } catch (error) {
      setError('Current password is incorrect');
      return false;
    }
  };

  const handleSave = async (field, value = null) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedValue = value !== null ? value : profileData[field];
      
      // For sensitive operations, require reauthentication
      if (field === 'email' || field === 'newPassword') {
        setReauthField(field);
        setReauthDialogOpen(true);
        setLoading(false);
        return;
      }

      // Update profile in Firebase Auth for relevant fields
      if (field === 'name' || field === 'photoBase64') {
        await updateProfile(currentUser, {
          displayName: field === 'name' ? updatedValue : profileData.name,
          photoURL: field === 'photoBase64' ? updatedValue : profileData.photoBase64
        });
      }

      // Update Realtime Database
      const updates = {};
      if (['name', 'phone', 'photoBase64'].includes(field)) {
        updates[`basicInfo/${field}`] = updatedValue;
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(database, `users/${currentUser.uid}`), updates);
      }

      setOriginalData(prev => ({ ...prev, [field]: updatedValue }));
      setSuccess(`${field === 'photoBase64' ? 'Profile picture' : field} updated successfully!`);
      setEditField(null);
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
      setProfileData(originalData);
    } finally {
      setLoading(false);
    }
  };

  const handleReauthenticateAndSave = async (currentPassword) => {
    setLoading(true);
    setReauthDialogOpen(false);
    
    try {
      // Reauthenticate user
      const isAuthenticated = await reauthenticateUser(currentPassword);
      if (!isAuthenticated) {
        return;
      }

      // Perform the sensitive operation
      if (reauthField === 'email') {
        await updateEmail(currentUser, profileData.email);
        
        // Update Realtime Database
        await update(ref(database, `users/${currentUser.uid}`), {
          'basicInfo/email': profileData.email
        });
        
        setSuccess('Email updated successfully!');
      } else if (reauthField === 'newPassword') {
        if (profileData.newPassword !== profileData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        if (profileData.newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        
        await updatePassword(currentUser, profileData.newPassword);
        setSuccess('Password updated successfully!');
        
        // Clear password fields
        setProfileData(prev => ({ 
          ...prev, 
          currentPassword: '', 
          newPassword: '', 
          confirmPassword: '' 
        }));
      }

      setOriginalData(prev => ({ ...prev, [reauthField]: profileData[reauthField] }));
      setEditField(null);
    } catch (err) {
      setError('Failed to update: ' + err.message);
    } finally {
      setLoading(false);
      setReauthField('');
    }
  };

  const renderEditableField = (field, label, type = 'text', icon = null) => {
    const isEditing = editField === field;
    const isPassword = field.includes('Password');
    const showPwToggle = isPassword && isEditing;

    return (
      <Box sx={{ width: '100%', position: 'relative' }}>
        {isEditing ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              label={label}
              name={field}
              type={showPassword[field] ? 'text' : type}
              value={profileData[field]}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: icon && (
                  <InputAdornment position="start">
                    {icon}
                  </InputAdornment>
                ),
                endAdornment: showPwToggle ? (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleClickShowPassword(field)}
                      edge="end"
                    >
                      {showPassword[field] ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
            <IconButton
              color="primary"
              onClick={() => handleSave(field)}
              disabled={loading}
            >
              <SaveIcon />
            </IconButton>
            <IconButton
              color="error"
              onClick={handleCancel}
              disabled={loading}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              label={label}
              value={
                isPassword 
                  ? profileData[field] 
                    ? '••••••••' 
                    : 'Not set'
                  : profileData[field] || 'Not set'
              }
              InputProps={{
                readOnly: true,
                startAdornment: icon && (
                  <InputAdornment position="start">
                    {icon}
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => handleEdit(field)}
                      disabled={loading}
                    >
                      <EditIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        )}
      </Box>
    );
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md">
        <Typography variant="h6" sx={{ mt: 4 }}>
          Please log in to view your profile
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => navigate('/dashboard')} 
            sx={{ mr: 2 }}
            disabled={loading}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" gutterBottom sx={{ flexGrow: 1 }}>
            My Profile
          </Typography>
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {/* User Data Section */}
        {userData && (
          <Box sx={{ mb: 4, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Account Information</Typography>
            <Typography>Points: {userData.userData?.points || 0}</Typography>
            <Typography>RFID: {userData.userData?.rfid || 'Not assigned'}</Typography>
            <Typography>
              Member since: {new Date(userData.userData?.joinedAt).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 3
        }}>
          {/* Profile Picture */}
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={profileData.photoBase64 || '/default-avatar.png'}
              sx={{ width: 120, height: 120 }}
            />
            <input
              accept="image/*"
              id="profile-picture-upload"
              type="file"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <label htmlFor="profile-picture-upload">
              <IconButton 
                component="span"
                sx={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark'
                  }
                }}
                disabled={loading}
              >
                <EditIcon />
              </IconButton>
            </label>
          </Box>

          {/* Basic Info */}
          {renderEditableField('name', 'Full Name')}
          {renderEditableField('email', 'Email', 'email')}
          {renderEditableField('phone', 'Phone Number', 'tel', <PhoneIphoneIcon />)}

          {/* Password */}
          <Divider sx={{ width: '100%', my: 2 }} />
          <Typography variant="h6">Password</Typography>
          {renderEditableField('newPassword', 'New Password', 'password')}
          {editField === 'newPassword' && (
            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type={showPassword.confirmPassword ? 'text' : 'password'}
              value={profileData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleClickShowPassword('confirmPassword')}
                      edge="end"
                    >
                      {showPassword.confirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          )}
        </Box>
      </Box>

      {/* Reauthentication Dialog */}
      <Dialog open={reauthDialogOpen} onClose={() => setReauthDialogOpen(false)}>
        <DialogTitle>Verify Your Identity</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            For security reasons, please enter your current password to continue.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Current Password"
            type={showPassword.currentPassword ? 'text' : 'password'}
            value={profileData.currentPassword}
            onChange={handleChange}
            name="currentPassword"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleClickShowPassword('currentPassword')}
                    edge="end"
                  >
                    {showPassword.currentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReauthDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => handleReauthenticateAndSave(profileData.currentPassword)}
            disabled={loading || !profileData.currentPassword}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage;