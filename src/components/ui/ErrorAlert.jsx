import React from 'react';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const ErrorAlert = ({ error, onClose }) => {
  if (!error) return null;
  
  return (
    <Collapse in={Boolean(error)}>
      <Alert 
        severity="error"
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={onClose}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
        sx={{ mb: 2 }}
      >
        {error}
      </Alert>
    </Collapse>
  );
};

export default ErrorAlert;