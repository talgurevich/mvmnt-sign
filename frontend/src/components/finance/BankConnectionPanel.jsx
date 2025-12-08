import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SyncIcon from '@mui/icons-material/Sync';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const BankConnectionPanel = ({ onSyncComplete }) => {
  const { getAccessToken } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [disconnectDialog, setDisconnectDialog] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Check for callback params in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('bank_connected')) {
      setError(null);
      fetchStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('bank_error')) {
      setError(decodeURIComponent(params.get('bank_error')));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const response = await axios.get(`${API_URL}/api/bank/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch bank status:', err);
      // Don't show error for status check - just means not configured
      setStatus({ configured: false, connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const token = await getAccessToken();
      const response = await axios.get(`${API_URL}/api/bank/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Redirect to bank authorization page
      window.location.href = response.data.authUrl;
    } catch (err) {
      console.error('Failed to start bank connection:', err);
      setError(err.response?.data?.error || 'שגיאה בהתחלת החיבור לבנק');
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const token = await getAccessToken();
      const response = await axios.post(`${API_URL}/api/bank/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh status and notify parent
      await fetchStatus();
      if (onSyncComplete) {
        onSyncComplete(response.data);
      }
    } catch (err) {
      console.error('Failed to sync transactions:', err);
      setError(err.response?.data?.error || 'שגיאה בסנכרון התנועות');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const token = await getAccessToken();
      await axios.delete(`${API_URL}/api/bank/disconnect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDisconnectDialog(false);
      await fetchStatus();
    } catch (err) {
      console.error('Failed to disconnect bank:', err);
      setError(err.response?.data?.error || 'שגיאה בניתוק הבנק');
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="center" py={2}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography>בודק חיבור לבנק...</Typography>
        </Box>
      </Paper>
    );
  }

  // Don't show if bank API not configured
  if (!status?.configured) {
    return (
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'grey.50' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <AccountBalanceIcon sx={{ color: 'grey.400', fontSize: 32 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.600' }}>
              חיבור לבנק הפועלים
            </Typography>
            <Typography variant="body2" color="text.secondary">
              חיבור API לא הוגדר. צור קשר עם מנהל המערכת להגדרת פרטי החיבור.
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <AccountBalanceIcon sx={{ color: status.connected ? 'success.main' : 'grey.400', fontSize: 32 }} />
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                בנק הפועלים
              </Typography>
              {status.connected ? (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="מחובר"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<ErrorIcon />}
                  label="לא מחובר"
                  size="small"
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>
            {status.connected && (
              <Typography variant="body2" color="text.secondary">
                {status.accountCount} חשבונות מחוברים
                {status.lastSyncAt && ` | סנכרון אחרון: ${new Date(status.lastSyncAt).toLocaleString('he-IL')}`}
              </Typography>
            )}
          </Box>
        </Box>

        <Box display="flex" gap={1}>
          {status.connected ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'מסנכרן...' : 'סנכרן תנועות'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={() => setDisconnectDialog(true)}
              >
                נתק
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceIcon />}
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? 'מתחבר...' : 'התחבר לבנק'}
            </Button>
          )}
        </Box>
      </Box>

      {status.connected && status.expiresAt && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            ההרשאה תפוג ב: {new Date(status.expiresAt).toLocaleDateString('he-IL')}
          </Typography>
        </>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialog} onClose={() => setDisconnectDialog(false)}>
        <DialogTitle>ניתוק חשבון הבנק</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך לנתק את חשבון הבנק? התנועות שכבר יובאו ישמרו, אך לא יתאפשר סנכרון חדש עד לחיבור מחדש.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialog(false)}>ביטול</Button>
          <Button onClick={handleDisconnect} color="error" variant="contained">
            נתק
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BankConnectionPanel;
