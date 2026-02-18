import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, update, push, set } from 'firebase/database';
import { database } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  PointOfSale as PointOfSaleIcon,
  People as PeopleIcon,
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const VendorDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [isVendor, setIsVendor] = useState(false);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const convertToCSV = (data) => {
    const { vendorData, transactions, allUsers, binData } = data;
    
    const userIds = [...new Set(transactions.map(t => t.userId))];
    const userTransactions = [];
    
    for (const userId of userIds) {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        const userTx = transactions.filter(t => t.userId === userId);
        const totalRedeemed = userTx.reduce((sum, t) => sum + Math.abs(t.points), 0);
        
        userTransactions.push({
          name: user.name,
          email: user.email,
          points: totalRedeemed,
          lastTransaction: new Date(Math.max(...userTx.map(t => t.timestamp))).toLocaleDateString()
        });
      }
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Vendor Information
    csvContent += "Vendor Information\n";
    csvContent += `Vendor Name,${vendorData.name || 'N/A'}\n`;
    csvContent += `Vendor RFID,${vendorData.rfid || 'Not assigned'}\n`;
    csvContent += `Report Date,${new Date().toLocaleDateString()}\n\n`;
    
    // Bin Status
    csvContent += "Bin Status\n";
    csvContent += `Last Connection,${binData.lastConnected}\n`;
    csvContent += `Bin Capacity,${binData.capacity} kg\n\n`;
    
    // User Transactions
    csvContent += "User Transactions\n";
    csvContent += "Name,Email,Points Redeemed,Last Transaction\n";
    userTransactions.forEach(user => {
      csvContent += `${user.name},${user.email},${user.points},${user.lastTransaction}\n`;
    });
    
    // Summary
    csvContent += "\nSummary\n";
    csvContent += `Total Points Redeemed,${transactions.reduce((sum, t) => sum + Math.abs(t.points), 0)}\n`;
    csvContent += `Total Users,${userIds.length}\n`;
    csvContent += `Total Transactions,${transactions.length}\n`;
    
    return csvContent;
  };

  const generateCSVReport = useCallback(async () => {
    try {
      setLoading(true);
      
      const vendorRef = ref(database, `users/${currentUser.uid}`);
      const vendorSnapshot = await get(vendorRef);
      
      if (!vendorSnapshot.exists()) {
        throw new Error('Vendor data not found');
      }
      
      const vendorData = {
        id: vendorSnapshot.key,
        ...vendorSnapshot.val().basicInfo,
        ...vendorSnapshot.val().userData
      };

      const transactionsRef = ref(database, 'transactions');
      const transactionsSnapshot = await get(transactionsRef);
      const vendorTransactions = [];
      
      if (transactionsSnapshot.exists()) {
        transactionsSnapshot.forEach((child) => {
          const transaction = child.val();
          if (transaction.vendorId === currentUser.uid) {
            vendorTransactions.push({
              id: child.key,
              ...transaction
            });
          }
        });
      }

      const testConnectionRef = ref(database, 'testConnection');
      const testConnectionSnapshot = await get(testConnectionRef);
      const testConnectionData = testConnectionSnapshot.exists() ? 
        Object.values(testConnectionSnapshot.val()) : [];
      
      const binData = {
        lastConnected: testConnectionData.sort((a, b) => 
          (b.timestamp || 0) - (a.timestamp || 0)
        )[0]?.testMessage || 'No connection data',
        capacity: 30
      };

      const reportData = {
        vendorData,
        transactions: vendorTransactions,
        allUsers,
        binData
      };

      const csvContent = convertToCSV(reportData);
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "vendor_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Report preparation failed:', error);
      setError('Failed to prepare report: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, allUsers]);

  useEffect(() => {
    const checkVendorStatus = async () => {
      if (currentUser) {
        const vendorRef = ref(database, `users/${currentUser.uid}/userData/isVendor`);
        const snapshot = await get(vendorRef);
        setIsVendor(snapshot.exists() && snapshot.val() === true);
        
        if (snapshot.exists() && snapshot.val() === true) {
          loadAllUsers();
        }
      }
    };

    checkVendorStatus();
  }, [currentUser]);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const usersData = [];
      
      usersSnapshot.forEach((child) => {
        const userData = child.val();
        usersData.push({
          id: child.key,
          ...userData.basicInfo,
          ...userData.userData,
          points: userData.userData?.points || 0
        });
      });

      usersData.sort((a, b) => (b.points || 0) - (a.points || 0));
      setAllUsers(usersData);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const rfidRef = ref(database, `rfidRegistry/${searchTerm.trim()}`);
      const rfidSnapshot = await get(rfidRef);
      
      let userIds = [];
      
      if (rfidSnapshot.exists()) {
        userIds.push(rfidSnapshot.val());
      } else {
        userIds = allUsers
          .filter(user => 
            user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(user => user.id);
      }

      const filteredUsers = allUsers.filter(user => 
        userIds.includes(user.id)
      );

      setUsers(filteredUsers);
    } catch (err) {
      setError('Failed to search users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!selectedUser || pointsToRedeem <= 0) return;
    
    try {
      setLoading(true);
      
      const userRef = ref(database, `users/${selectedUser.id}/userData`);
      const snapshot = await get(userRef);
      const currentData = snapshot.val() || {};
      const currentPoints = currentData.points || 0;

      if (pointsToRedeem > currentPoints) {
        throw new Error('User does not have enough points');
      }
      
      await update(userRef, {
        points: currentPoints - pointsToRedeem
      });
      
      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        userId: selectedUser.id,
        vendorId: currentUser.uid,
        points: -pointsToRedeem,
        timestamp: Date.now(),
        type: 'redemption',
        vendorName: currentUser.displayName || 'Vendor'
      });
      
      setSuccess(`${pointsToRedeem} points redeemed successfully!`);
      setSelectedUser(null);
      setPointsToRedeem(0);
      loadAllUsers();
      if (searchTerm.trim()) searchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isVendor) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          You don't have vendor privileges to access this dashboard.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" gutterBottom sx={{ flexGrow: 1 }}>
          <PointOfSaleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Vendor Dashboard
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={generateCSVReport}
          disabled={loading}
          startIcon={<FileDownloadIcon />}
        >
          {loading ? 'Generating Report...' : 'Download Vendor Report (CSV)'}
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Search Users" />
        <Tab label="All Users" icon={<PeopleIcon />} />
      </Tabs>

      {tabValue === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <TextField
              fullWidth
              label="Search by RFID or Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button
              variant="contained"
              onClick={searchUsers}
              startIcon={<SearchIcon />}
              disabled={loading || !searchTerm.trim()}
            >
              Search
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : users.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>RFID</TableCell>
                    <TableCell>Points</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.rfid || 'Not assigned'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.points || 0} 
                          color={user.points > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          onClick={() => setSelectedUser(user)}
                          disabled={!user.points || user.points <= 0}
                        >
                          Redeem Points
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : searchTerm ? (
            <Typography variant="body1" sx={{ mt: 2 }}>
              No users found matching your search.
            </Typography>
          ) : null}
        </>
      )}

      {tabValue === 1 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Registered Users (Sorted by Points)
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>RFID</TableCell>
                    <TableCell>Points</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.rfid || 'Not assigned'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.points || 0} 
                          color={user.points > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          onClick={() => setSelectedUser(user)}
                          disabled={!user.points || user.points <= 0}
                        >
                          Redeem Points
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Dialog 
        open={Boolean(selectedUser)} 
        onClose={() => {
          setSelectedUser(null);
          setPointsToRedeem(0);
        }}
      >
        <DialogTitle>
          Redeem Points for {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Available Points: <strong>{selectedUser?.points || 0}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Points to Redeem"
            type="number"
            fullWidth
            value={pointsToRedeem === 0 ? '' : pointsToRedeem}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || (!isNaN(value) && parseInt(value) >= 0)) {
                setPointsToRedeem(value === '' ? 0 : parseInt(value));
              }
            }}
            inputProps={{
              min: 1,
              max: selectedUser?.points || 0
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSelectedUser(null);
            setPointsToRedeem(0);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleRedeemPoints}
            disabled={pointsToRedeem <= 0 || 
                      pointsToRedeem > (selectedUser?.points || 0)}
          >
            Confirm Redemption
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VendorDashboard;