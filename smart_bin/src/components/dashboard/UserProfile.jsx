import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import PersonIcon from '@mui/icons-material/Person';

const UserProfile = ({ userData }) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mr: 2 }}>
            <PersonIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" component="div">
              {userData.basicInfo.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {userData.basicInfo.email}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Member Since
            </Typography>
            <Typography variant="body1">
              {new Date(userData.userData.joinedAt).toLocaleDateString()}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Points
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {userData.userData.points}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserProfile;