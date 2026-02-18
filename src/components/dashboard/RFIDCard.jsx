import React,  { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase/config';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import Chip from '@mui/material/Chip';
import { format } from 'date-fns';

// Dynamic import for QR code (optional)
const QRCode = React.lazy(() => import('react-qr-code'));

const RFIDCard = ({ rfidData, currentUserId }) => {
  const [ownershipVerified, setOwnershipVerified] = useState(false);

  useEffect(() => {
    const verifyOwnership = async () => {
      if (rfidData.uid) {
        const registryRef = ref(database, `rfidRegistry/${rfidData.uid}`);
        const snapshot = await get(registryRef);
        setOwnershipVerified(snapshot.val() === currentUserId);
      }
    };
    verifyOwnership();
  }, [rfidData.uid, currentUserId]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CreditCardIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h6" component="div">
            Your RFID Card
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Card UID
            </Typography>
            <Chip 
              label={rfidData.uid} 
              variant="outlined" 
              sx={{ fontWeight: 'bold', fontSize: '1rem' }} 
            />
          </Box>
          
          
        </Box>
        
        {rfidData.uid && (
          <Box sx={{ textAlign: 'center', mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Scan this QR at the bin
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <React.Suspense fallback={<div>Loading QR...</div>}>
                <QRCode 
                  value={rfidData.uid} 
                  size={128} 
                  bgColor="#ffffff" 
                  fgColor="#000000" 
                  level="L" 
                />
              </React.Suspense>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RFIDCard;