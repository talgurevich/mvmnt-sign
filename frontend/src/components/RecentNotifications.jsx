/**
 * RecentNotifications Component
 * Displays recent notification history for a specific event type
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const RecentNotifications = ({ eventType, limit = 5 }) => {
  const { getAccessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [eventType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();

      const response = await axios.get(
        `${API_URL}/api/notifications/history?event_type=${eventType}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'sent':
        return (
          <Chip
            size="small"
            icon={<CheckCircleIcon />}
            label="נשלח"
            color="success"
            sx={{ fontWeight: 'bold' }}
          />
        );
      case 'failed':
        return (
          <Chip
            size="small"
            icon={<ErrorIcon />}
            label="נכשל"
            color="error"
            sx={{ fontWeight: 'bold' }}
          />
        );
      default:
        return (
          <Chip
            size="small"
            icon={<PendingIcon />}
            label="ממתין"
            color="warning"
            sx={{ fontWeight: 'bold' }}
          />
        );
    }
  };

  const getChannelIcon = (channel) => {
    if (channel === 'whatsapp') {
      return <WhatsAppIcon sx={{ color: '#25D366', fontSize: 20 }} />;
    }
    return <EmailIcon sx={{ color: '#1976d2', fontSize: 20 }} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('he-IL', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecipient = (notification) => {
    if (notification.channel === 'whatsapp') {
      return notification.recipient_phone || '-';
    }
    return notification.recipient_email || '-';
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, mt: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <NotificationsIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          הודעות אחרונות
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {notifications.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
          אין הודעות אחרונות
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {notifications.map((notification) => (
            <Box
              key={notification.id}
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: notification.status === 'sent' ? 'success.light' :
                         notification.status === 'failed' ? 'error.light' : 'warning.light',
                border: '1px solid',
                borderColor: notification.status === 'sent' ? 'success.main' :
                             notification.status === 'failed' ? 'error.main' : 'warning.main',
                opacity: notification.status === 'sent' ? 0.9 : 1
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box display="flex" alignItems="center" gap={1}>
                  {getChannelIcon(notification.channel)}
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {getRecipient(notification)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(notification.sent_at || notification.created_at)}
                    </Typography>
                  </Box>
                </Box>
                {getStatusChip(notification.status)}
              </Box>
              {notification.status === 'failed' && notification.error_message && (
                <Typography variant="caption" color="error.dark" sx={{ mt: 1, display: 'block' }}>
                  {notification.error_message}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default RecentNotifications;
