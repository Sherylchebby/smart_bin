import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { 
  Autocomplete, 
  TextField, 
  Button, 
  Box, 
  CircularProgress,
  Typography,
  IconButton,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorAlert from '../ui/ErrorAlert';
import { useAuth } from '../../context/AuthContext';

const RegisterForm = ({ 
  rfidOptions, 
  onRefreshRfids
}) => {
  const { 
    control, 
    handleSubmit, 
    formState: { errors },
    watch
  } = useForm();

  const { 
    register: registerUser,
    loading: authLoading,
    error: authError,
    clearError
  } = useAuth();

  const navigate = useNavigate();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationOption, setVerificationOption] = useState('email');
  const password = watch('password');
  
const handleRegisterSubmit = async (data) => {
  try {
    setLocalLoading(true);
    setError(null);
    clearError();

    const { userId, email } = await registerUser({
      ...data,
      verificationMethod: verificationOption
    });

    // Redirect to waiting page with userId
    navigate('/verify-waiting', { 
      state: { 
        email,
        userId 
      } 
    });

  } catch (err) {
    setError(err.message || 'Registration failed.');
  } finally {
    setLocalLoading(false);
  }
};
  const loading = authLoading || localLoading;

  return (
    <Box component="form" onSubmit={handleSubmit(handleRegisterSubmit)} sx={{ mt: 2 }}>
      {authError && (
        <ErrorAlert error={authError} onClose={clearError} sx={{ mb: 3 }} />
      )}

      {error && (
        <ErrorAlert error={error} onClose={() => setError(null)} sx={{ mb: 3 }} />
      )}

      {/* Name Field */}
      <Controller
        name="name"
        control={control}
        defaultValue=""
        rules={{ required: 'Full name is required' }}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            label="Full Name"
            autoComplete="name"
            autoFocus
            error={!!errors.name}
            helperText={errors.name?.message}
            disabled={loading}
          />
        )}
      />

      {/* Email Field */}
      <Controller
        name="email"
        control={control}
        defaultValue=""
        rules={{ 
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        }}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            label="Email Address"
            autoComplete="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={loading}
          />
        )}
      />

      {/* Phone Field (Required if phone verification selected) */}
      <Controller
        name="phone"
        control={control}
        defaultValue=""
        rules={{
          validate: (value) => {
            if (verificationOption === 'phone' && !value) {
              return 'Phone number is required for phone verification';
            }
            if (value && !/^\+[1-9]\d{1,14}$/.test(value)) {
              return 'Enter with country code (e.g., +1234567890)';
            }
            return true;
          }
        }}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            fullWidth
            label={`Phone Number ${verificationOption === 'phone' ? '(Required)' : '(Optional)'}`}
            placeholder="+1234567890"
            autoComplete="tel"
            error={!!errors.phone}
            helperText={errors.phone?.message}
            disabled={loading}
          />
        )}
      />

      {/* Password Field */}
      <Controller
        name="password"
        control={control}
        defaultValue=""
        rules={{ 
          required: 'Password is required',
          minLength: {
            value: 6,
            message: 'Password must be at least 6 characters'
          }
        }}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            autoComplete="new-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={loading}
          />
        )}
      />

      {/* Confirm Password Field */}
      <Controller
        name="confirmPassword"
        control={control}
        defaultValue=""
        rules={{ 
          required: 'Please confirm your password',
          validate: value => 
            value === password || 'Passwords do not match'
        }}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            disabled={loading}
          />
        )}
      />

      {/* Verification Method Selection */}
      <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
        <FormLabel component="legend">Verification Method</FormLabel>
        <RadioGroup
          row
          value={verificationOption}
          onChange={(e) => setVerificationOption(e.target.value)}
        >
          <FormControlLabel 
            value="email" 
            control={<Radio />} 
            label="Email Verification" 
            disabled={loading}
          />
          <FormControlLabel 
            value="phone" 
            control={<Radio />} 
            label="Phone Verification" 
            disabled={loading}
          />
        </RadioGroup>
      </FormControl>

      {/* RFID Selection Field */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">Available RFIDs</Typography>
          <IconButton 
            onClick={onRefreshRfids} 
            size="small"
            disabled={loading}
            sx={{ ml: 1 }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>

        <Controller
          name="rfid"
          control={control}
          rules={{ required: 'RFID selection is required' }}
          render={({ field }) => (
            <Autocomplete
              options={rfidOptions}
              getOptionLabel={(option) => 
                `${option.uid} (scanned at ${new Date(option.timestamp).toLocaleTimeString()})`
              }
              isOptionEqualToValue={(option, value) => option.uid === value}
              onChange={(_, newValue) => {
                field.onChange(newValue?.uid || '');
              }}
              value={rfidOptions.find(option => option.uid === field.value) || null}
              disabled={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select RFID Card"
                  error={!!errors.rfid}
                  helperText={errors.rfid?.message}
                  required
                />
              )}
            />
          )}
        />
      </Box>

      <Button 
        type="submit" 
        variant="contained" 
        fullWidth
        disabled={loading}
        sx={{ mt: 3, mb: 2 }}
      >
        {loading ? (
          <>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            Registering...
          </>
        ) : 'Register'}
      </Button>
    </Box>
  );
};

export default RegisterForm;