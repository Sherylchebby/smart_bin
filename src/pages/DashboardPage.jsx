import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserData } from '../services/firebaseService';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';
import { Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  AccountCircle as AccountCircleIcon,
  Store as StoreIcon,
  PointOfSale as PointOfSaleIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import UserProfile from '../components/dashboard/UserProfile';
import RFIDCard from '../components/dashboard/RFIDCard';
import BinUsageChart from '../components/dashboard/BinUsageChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const DashboardPage = () => {
  const { currentUser, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (currentUser) {
          const data = await getUserData(currentUser.uid);
          setUserData(data);
        }
      } catch (err) {
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const adminRef = ref(database, `users/${currentUser.uid}/userData/isAdmin`);
      get(adminRef).then((snapshot) => {
        setIsAdmin(snapshot.exists() && snapshot.val() === true);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const vendorRef = ref(database, `users/${currentUser.uid}/userData/isVendor`);
      get(vendorRef).then((snapshot) => {
        setIsVendor(snapshot.exists() && snapshot.val() === true);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchUserTransactions = async () => {
      try {
        if (currentUser) {
          const transactionsRef = ref(database, 'transactions');
          const snapshot = await get(transactionsRef);
          
          if (snapshot.exists()) {
            const allTransactions = [];
            snapshot.forEach((child) => {
              const transaction = child.val();
              if (transaction.userId === currentUser.uid) {
                allTransactions.push({
                  id: child.key,
                  ...transaction
                });
              }
            });
            
            const sortedTransactions = allTransactions.sort((a, b) => b.timestamp - a.timestamp);
            setTransactions(sortedTransactions.slice(0, 10));
          }
        }
      } catch (err) {
        setError('Failed to load transactions');
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchUserTransactions();
  }, [currentUser]);

  if (loading) return <LoadingSpinner />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!userData) return <Typography>No user data found</Typography>;

  return (
    <Container maxWidth="lg" sx={{ pt: isMobile ? 0 : 3 }}>
      {/* Responsive App Bar */}
      <AppBar 
        position="static" 
        color="default" 
        elevation={0}
        sx={{ 
          mb: 3,
          borderRadius: 2,
          backgroundColor: 'background.paper'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {isMobile ? (
            <>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={handleMenuClick}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
                Smart Bin
              </Typography>
            </>
          ) : (
            <Typography variant="h6" component="div">
              Smart Bin Dashboard
            </Typography>
          )}

          {isMobile ? (
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
            >
              <MenuItem 
                component={Link} 
                to="/profile" 
                onClick={handleMenuClose}
              >
                <AccountCircleIcon sx={{ mr: 1 }} /> Profile
              </MenuItem>
              {isAdmin && (
                <MenuItem 
                  component={Link} 
                  to="/admin" 
                  onClick={handleMenuClose}
                >
                  <AdminPanelSettingsIcon sx={{ mr: 1 }} /> Admin
                </MenuItem>
              )}
              {isVendor && (
                <MenuItem 
                  component={Link} 
                  to="/vendor" 
                  onClick={handleMenuClose}
                >
                  <StoreIcon sx={{ mr: 1 }} /> Vendor
                </MenuItem>
              )}
              <MenuItem onClick={logout}>
                <LogoutIcon sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                component={Link}
                to="/profile"
                variant="outlined"
                startIcon={<AccountCircleIcon />}
                size={isMobile ? 'small' : 'medium'}
              >
                My Profile
              </Button>
              {isAdmin && (
                <Button
                  component={Link}
                  to="/admin"
                  variant="contained"
                  startIcon={<AdminPanelSettingsIcon />}
                  size={isMobile ? 'small' : 'medium'}
                >
                  Admin
                </Button>
              )}
              {isVendor && (
                <Button
                  component={Link}
                  to="/vendor"
                  variant="contained"
                  startIcon={<StoreIcon />}
                  size={isMobile ? 'small' : 'medium'}
                  color="secondary"
                >
                  Vendor
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={logout}
                startIcon={<LogoutIcon />}
                size={isMobile ? 'small' : 'medium'}
              >
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Dashboard Content */}
      <Box sx={{ mb: 4 }}>
        <UserProfile userData={userData} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <RFIDCard rfidData={{
          uid: userData.userData.rfid,
          lastScanned: userData.userData.lastScanned || null
        }} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your Bin Usage
        </Typography>
        <BinUsageChart usageData={[]} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recent Transactions
        </Typography>
        {transactionsLoading ? (
          <LoadingSpinner />
        ) : transactions.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {new Date(tx.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {tx.type === 'redemption' ? 'Redemption' : 'Earned'}
                    </TableCell>
                    <TableCell>
                      {tx.vendorName || 'Unknown Vendor'}
                    </TableCell>
                    <TableCell>
                      {tx.points > 0 ? `+${tx.points}` : tx.points}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={tx.points > 0 ? 'Added' : 'Deducted'} 
                        color={tx.points > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body1" sx={{ mt: 2 }}>
            No transactions found
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default DashboardPage;