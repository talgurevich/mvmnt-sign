import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Switch,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CakeIcon from '@mui/icons-material/Cake';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const API_URL = import.meta.env.VITE_API_URL;

const Automations = () => {
  const { getAccessToken } = useAuth();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();

      const response = await axios.get(`${API_URL}/api/automations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAutomations(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
      setError('שגיאה בטעינת האוטומציות');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (automationId) => {
    try {
      setToggling(automationId);
      setError(null);
      setSuccess(null);
      const token = await getAccessToken();

      const response = await axios.patch(
        `${API_URL}/api/automations/${automationId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setAutomations(prev =>
        prev.map(a =>
          a.id === automationId ? response.data.data : a
        )
      );

      setSuccess(response.data.message);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to toggle automation:', err);
      setError('שגיאה בשינוי מצב האוטומציה');
    } finally {
      setToggling(null);
    }
  };

  const formatLastRun = (lastRunAt) => {
    if (!lastRunAt) return 'טרם הופעל';

    const date = new Date(lastRunAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'לפני פחות מדקה';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;

    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAutomationIcon = (automationId) => {
    switch (automationId) {
      case 'waitlist_capacity_notifications':
        return <NotificationsActiveIcon />;
      case 'birthday_notifications':
        return <CakeIcon />;
      case 'new_lead_notifications':
        return <PersonAddIcon />;
      case 'trial_notifications':
        return <FitnessCenterIcon />;
      default:
        return <SmartToyIcon />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box display="flex" alignItems="center" gap={2}>
            <SmartToyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                אוטומציות
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ניהול תהליכים אוטומטיים
              </Typography>
            </Box>
          </Box>
          <Tooltip title="רענן">
            <IconButton onClick={fetchAutomations}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Automations List */}
        {automations.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <SmartToyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              אין אוטומציות מוגדרות
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {automations.map((automation) => (
              <Card
                key={automation.id}
                sx={{
                  borderRight: `4px solid ${automation.is_enabled ? '#4caf50' : '#9e9e9e'}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" gap={2} alignItems="flex-start">
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: automation.is_enabled ? 'success.light' : 'grey.200',
                          color: automation.is_enabled ? 'success.dark' : 'grey.600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getAutomationIcon(automation.id)}
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {automation.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {automation.description}
                        </Typography>

                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                          <Chip
                            size="small"
                            icon={automation.is_enabled ? <CheckCircleIcon /> : <CancelIcon />}
                            label={automation.is_enabled ? 'פעיל' : 'כבוי'}
                            color={automation.is_enabled ? 'success' : 'default'}
                            variant={automation.is_enabled ? 'filled' : 'outlined'}
                          />

                          {automation.config?.check_interval_minutes && (
                            <Chip
                              size="small"
                              icon={<AccessTimeIcon />}
                              label={`כל ${automation.config.check_interval_minutes} דקות`}
                              variant="outlined"
                            />
                          )}

                          {automation.last_run_at && (
                            <Typography variant="caption" color="text.secondary">
                              הפעלה אחרונה: {formatLastRun(automation.last_run_at)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      {toggling === automation.id ? (
                        <CircularProgress size={24} />
                      ) : (
                        <Switch
                          checked={automation.is_enabled}
                          onChange={() => toggleAutomation(automation.id)}
                          color="success"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#4caf50',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#4caf50',
                            },
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Info Section */}
        <Paper sx={{ mt: 4, p: 3, bgcolor: 'info.light' }}>
          <Typography variant="subtitle1" fontWeight="bold" color="info.dark" gutterBottom>
            איך זה עובד?
          </Typography>
          <Typography variant="body2" color="info.dark">
            האוטומציות רצות ברקע ומבצעות פעולות באופן אוטומטי.
            כאשר אוטומציה פעילה, היא תבדוק כל 10 דקות אם יש שינויים ותשלח התראות בהתאם.
            ניתן להפעיל או לכבות כל אוטומציה בכל עת.
          </Typography>
        </Paper>
      </Container>
    </Layout>
  );
};

export default Automations;
