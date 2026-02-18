import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  Edit as EditIcon,
  Store as StoreIcon,
  ArrowBack as ArrowBackIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';

const AdminPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [rfidRegistry, setRfidRegistry] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [testConnections, setTestConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditUser, setCurrentEditUser] = useState(null);
  const [newRfid, setNewRfid] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}/userData/isAdmin`);
        const snapshot = await get(userRef);
        setIsAdmin(snapshot.exists() && snapshot.val() === true);
      }
    };

    checkAdminStatus();
  }, [currentUser]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [
          usersSnapshot, 
          rfidSnapshot, 
          transactionsSnapshot,
          testConnectionsSnapshot
        ] = await Promise.all([
          get(ref(database, 'users')),
          get(ref(database, 'rfidRegistry')),
          get(ref(database, 'transactions')),
          get(ref(database, 'testConnection'))
        ]);

        // Process users
        const usersData = [];
        usersSnapshot.forEach((child) => {
          const userData = child.val();
          usersData.push({
            id: child.key,
            ...userData.basicInfo,
            ...userData.userData
          });
        });
        setUsers(usersData);

        // Process RFID registry
        const rfidData = [];
        rfidSnapshot.forEach((child) => {
          rfidData.push({
            rfid: child.key,
            userId: child.val()
          });
        });
        setRfidRegistry(rfidData);

        // Process transactions
        const transactionsData = [];
        transactionsSnapshot.forEach((child) => {
          transactionsData.push({
            id: child.key,
            ...child.val()
          });
        });
        setTransactions(transactionsData);

        // Process test connections
        const testConnectionsData = [];
        testConnectionsSnapshot.forEach((child) => {
          testConnectionsData.push({
            id: child.key,
            ...child.val()
          });
        });
        setTestConnections(testConnectionsData);

      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const generateAdminReport = async () => {
    try {
      setReportLoading(true);
      setError('');
      
      // Get admin data
      const adminRef = ref(database, `users/${currentUser.uid}`);
      const adminSnapshot = await get(adminRef);
      const adminData = adminSnapshot.exists() ? {
        ...adminSnapshot.val().basicInfo,
        ...adminSnapshot.val().userData
      } : null;

      // Process users with redeemed points
      const usersWithRedeemed = users.map(user => {
        const userTransactions = transactions.filter(t => t.userId === user.id);
        const redeemedPoints = userTransactions
          .filter(t => t.points < 0)
          .reduce((sum, t) => sum + Math.abs(t.points), 0);
        
        return {
          ...user,
          redeemedPoints
        };
      });

      // Process vendors with points redeemed
      const vendors = users.filter(user => user.isVendor);
      const vendorsWithRedemptions = vendors.map(vendor => {
        const vendorTransactions = transactions.filter(t => t.vendorId === vendor.id);
        const pointsRedeemed = vendorTransactions
          .filter(t => t.points < 0)
          .reduce((sum, t) => sum + Math.abs(t.points), 0);
        
        return {
          ...vendor,
          pointsRedeemed
        };
      });

      // Get admins
      const admins = users.filter(user => user.isAdmin);

      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Admin Information
      csvContent += "Admin Information\n";
      csvContent += `Name,${adminData?.name || 'N/A'}\n`;
      csvContent += `Email,${adminData?.email || 'N/A'}\n`;
      csvContent += `RFID,${adminData?.rfid || 'Not assigned'}\n`;
      csvContent += `Report Date,${new Date().toLocaleDateString()}\n\n`;
      
      // System Information
      csvContent += "System Information\n";
      const lastConnection = testConnections.length > 0 
        ? testConnections[testConnections.length - 1].testMessage 
        : 'No connection data';
      csvContent += `Last Connection,${lastConnection}\n`;
      csvContent += `Total Users,${users.length}\n`;
      csvContent += `Total Transactions,${transactions.length}\n\n`;
      
      // Registered Users
      csvContent += "Registered Users\n";
      csvContent += "Name,Email,Phone,RFID,Total Points,Points Redeemed\n";
      usersWithRedeemed.forEach(user => {
        csvContent += `${user.name},${user.email},${user.phone || 'N/A'},${user.rfid || 'Not assigned'},${user.points || 0},${user.redeemedPoints}\n`;
      });
      csvContent += `Total Users,${usersWithRedeemed.length}\n\n`;
      
      // Administrators
      csvContent += "Administrators\n";
      csvContent += "Name,Email,RFID\n";
      admins.forEach(admin => {
        csvContent += `${admin.name},${admin.email},${admin.rfid || 'Not assigned'}\n`;
      });
      csvContent += `Total Admins,${admins.length}\n\n`;
      
      // Vendors
      csvContent += "Vendors\n";
      csvContent += "Name,Email,RFID,Points Redeemed for Users\n";
      vendorsWithRedemptions.forEach(vendor => {
        csvContent += `${vendor.name},${vendor.email},${vendor.rfid || 'Not assigned'},${vendor.pointsRedeemed}\n`;
      });
      csvContent += `Total Vendors,${vendorsWithRedemptions.length}\n\n`;
      
      // Recent Transactions
      csvContent += "Recent Transactions (Last 10)\n";
      csvContent += "Date,User,Vendor,Points,Type\n";
      const recentTransactions = [...transactions]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
      recentTransactions.forEach(tx => {
        const user = users.find(u => u.id === tx.userId);
        const vendor = users.find(u => u.id === tx.vendorId);
        csvContent += `${new Date(tx.timestamp).toLocaleString()},${user?.name || 'Unknown'},${vendor?.name || 'Unknown'},${Math.abs(tx.points)},${tx.type}\n`;
      });

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `admin_report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      setError('Failed to generate report: ' + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setCurrentEditUser(user);
    setNewRfid(getRfidForUser(user.id));
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setCurrentEditUser(null);
    setNewRfid('');
  };

  const getRfidForUser = (userId) => {
    const rfidEntry = rfidRegistry.find(item => item.userId === userId);
    return rfidEntry ? rfidEntry.rfid : '';
  };

  const handleUpdateRfid = async () => {
    if (!currentEditUser || !newRfid) return;

    try {
      setLoading(true);
      
      // Remove old RFID if exists
      const oldRfid = getRfidForUser(currentEditUser.id);
      if (oldRfid) {
        await remove(ref(database, `rfidRegistry/${oldRfid}`));
      }

      // Add new RFID
      await update(ref(database, `rfidRegistry/${newRfid}`), currentEditUser.id);
      
      // Update user's RFID in their profile
      await update(ref(database, `users/${currentEditUser.id}/userData`), {
        rfid: newRfid
      });

      // Refresh RFID registry
      const rfidRef = ref(database, 'rfidRegistry');
      const rfidSnapshot = await get(rfidRef);
      const rfidData = [];
      rfidSnapshot.forEach((child) => {
        rfidData.push({
          rfid: child.key,
          userId: child.val()
        });
      });
      setRfidRegistry(rfidData);

      setEditModalOpen(false);
    } catch (err) {
      setError('Failed to update RFID: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      await update(ref(database, `users/${userId}/userData`), {
        isAdmin: true
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isAdmin: true } : user
      ));
    } catch (err) {
      setError('Failed to make user admin: ' + err.message);
    }
  };

  const handleMakeVendor = async (userId) => {
    try {
      await update(ref(database, `users/${userId}/userData`), {
        isVendor: true
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isVendor: true } : user
      ));
    } catch (err) {
      setError('Failed to make user vendor: ' + err.message);
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          You don't have permission to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<FileDownloadIcon />}
          onClick={generateAdminReport}
          disabled={reportLoading || loading}
          sx={{ ml: 2 }}
        >
          {reportLoading ? 'Generating Report...' : 'Download Report'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        <AdminPanelSettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Admin Dashboard
      </Typography>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Users" />
        <Tab label="RFID Registry" />
        <Tab label="Recent Connections" />
        <Tab label="Transactions" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tabValue === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>RFID</TableCell>
                    <TableCell>Points</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell>{getRfidForUser(user.id) || 'None'}</TableCell>
                      <TableCell>{user.points || 0}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Chip label="Admin" color="primary" size="small" />
                        ) : user.isVendor ? (
                          <Chip label="Vendor" color="secondary" size="small" />
                        ) : (
                          <Chip label="User" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEditModal(user)}
                          sx={{ mr: 1 }}
                        >
                          Edit RFID
                        </Button>
                        {!user.isAdmin && (
                          <Button
                            size="small"
                            startIcon={<AdminPanelSettingsIcon />}
                            onClick={() => handleMakeAdmin(user.id)}
                            color="primary"
                            sx={{ mr: 1 }}
                          >
                            Make Admin
                          </Button>
                        )}
                        {!user.isVendor && !user.isAdmin && (
                          <Button
                            size="small"
                            startIcon={<StoreIcon />}
                            onClick={() => handleMakeVendor(user.id)}
                            color="secondary"
                          >
                            Make Vendor
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 1 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>RFID UID</TableCell>
                    <TableCell>Assigned User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rfidRegistry.map((item) => {
                    const user = users.find(u => u.id === item.userId);
                    return (
                      <TableRow key={item.rfid}>
                        <TableCell>{item.rfid}</TableCell>
                        <TableCell>
                          {user ? `${user.name} (${user.email})` : 'Unknown User'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Connection Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testConnections.slice().reverse().map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell>
                        {connection.timestamp 
                          ? new Date(connection.timestamp).toLocaleString() 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{connection.testMessage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 3 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Points</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.slice().reverse().map((tx) => {
                    const user = users.find(u => u.id === tx.userId);
                    const vendor = users.find(u => u.id === tx.vendorId);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{user?.name || 'Unknown'}</TableCell>
                        <TableCell>{vendor?.name || 'Unknown'}</TableCell>
                        <TableCell>{Math.abs(tx.points)}</TableCell>
                        <TableCell>{tx.type}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Edit RFID Modal */}
      <Dialog open={editModalOpen} onClose={handleCloseEditModal}>
        <DialogTitle>Edit RFID for {currentEditUser?.name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New RFID UID"
            fullWidth
            value={newRfid}
            onChange={(e) => setNewRfid(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button onClick={handleUpdateRfid} color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPage;