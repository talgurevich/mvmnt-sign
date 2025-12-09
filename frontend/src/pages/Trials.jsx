import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Avatar,
  Button
} from '@mui/material';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RefreshIcon from '@mui/icons-material/Refresh';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TodayIcon from '@mui/icons-material/Today';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';

const API_URL = import.meta.env.VITE_API_URL;

const Trials = () => {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrials();
  }, []);

  const fetchTrials = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();

      const response = await axios.get(`${API_URL}/api/trials?days=7`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch trials:', err);
      setError('שגיאה בטעינת אימוני ניסיון');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone, name, className, date, time) => {
    const cleanPhone = phone?.replace(/\D/g, '');
    if (cleanPhone) {
      const israelPhone = cleanPhone.startsWith('0')
        ? '972' + cleanPhone.substring(1)
        : cleanPhone;

      const formattedDate = new Date(date).toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      const message = encodeURIComponent(
        `היי ${name}! \nרציתי לוודא שאת/ה מגיע/ה לאימון הניסיון שלך:\n${className}\n${formattedDate} בשעה ${time?.substring(0, 5)}\n\nמחכים לך!`
      );

      window.open(`https://wa.me/${israelPhone}?text=${message}`, '_blank');
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const TrialCard = ({ trial, highlight }) => (
    <Card
      sx={{
        mb: 1,
        borderRight: highlight ? '4px solid #10B981' : '4px solid #e5e7eb',
        bgcolor: highlight ? 'rgba(16, 185, 129, 0.05)' : 'inherit',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2
        }
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="flex-start" gap={2} flex={1}>
            <Avatar
              sx={{
                bgcolor: highlight ? '#10B981' : '#6366F1',
                width: 48,
                height: 48
              }}
            >
              <FitnessCenterIcon />
            </Avatar>
            <Box flex={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                {trial.fullName || 'ללא שם'}
              </Typography>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" mb={1}>
                <Chip
                  size="small"
                  icon={<FitnessCenterIcon />}
                  label={trial.className}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  icon={<AccessTimeIcon />}
                  label={formatTime(trial.time)}
                  variant="outlined"
                />
                {trial.isToday && (
                  <Chip
                    size="small"
                    label="היום!"
                    color="success"
                  />
                )}
                {trial.isTomorrow && (
                  <Chip
                    size="small"
                    label="מחר"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {!trial.isToday && !trial.isTomorrow && trial.daysUntil && (
                  <Typography variant="caption" color="text.secondary">
                    בעוד {trial.daysUntil} ימים
                  </Typography>
                )}
              </Box>
              <Box display="flex" gap={2} flexWrap="wrap">
                {trial.coach && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {trial.coach}
                    </Typography>
                  </Box>
                )}
                {trial.source && (
                  <Typography variant="caption" color="text.secondary">
                    מקור: {trial.source}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Box display="flex" gap={1}>
            {trial.phone && (
              <>
                <Tooltip title="התקשר">
                  <IconButton size="small" href={`tel:${trial.phone}`}>
                    <PhoneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="שלח הודעה בוואטסאפ">
                  <IconButton
                    size="small"
                    onClick={() => openWhatsApp(
                      trial.phone,
                      trial.firstName,
                      trial.className,
                      trial.date,
                      trial.time
                    )}
                    sx={{ color: '#25D366' }}
                  >
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box display="flex" alignItems="center" gap={2}>
            <FitnessCenterIcon sx={{ fontSize: 40, color: '#10B981' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                אימוני ניסיון
              </Typography>
              <Typography variant="body2" color="text.secondary">
                7 הימים הקרובים
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTrials}
          >
            רענן
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        {data && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: data.summary.today > 0 ? 'success.light' : 'grey.200' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TodayIcon sx={{ color: data.summary.today > 0 ? 'success.dark' : 'grey.500' }} />
                    <Typography variant="h4" fontWeight="bold" color={data.summary.today > 0 ? 'success.dark' : 'grey.500'}>
                      {data.summary.today}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={data.summary.today > 0 ? 'success.dark' : 'grey.500'}>
                    היום
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TodayIcon sx={{ color: 'warning.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="warning.dark">
                      {data.summary.tomorrow}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="warning.dark">
                    מחר
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EventIcon sx={{ color: 'info.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="info.dark">
                      {data.summary.later}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="info.dark">
                    השבוע
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'secondary.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FitnessCenterIcon sx={{ color: 'secondary.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="secondary.dark">
                      {data.summary.total}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="secondary.dark">
                    סה"כ
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Today's Trials */}
        {data?.data?.today?.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(16, 185, 129, 0.05)', borderRight: '4px solid #10B981' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TodayIcon sx={{ color: '#10B981', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#10B981' }}>
                אימוני ניסיון היום
              </Typography>
            </Box>
            {data.data.today.map(trial => (
              <TrialCard key={trial.id} trial={trial} highlight />
            ))}
          </Paper>
        )}

        {/* Tomorrow's Trials */}
        {data?.data?.tomorrow?.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TodayIcon sx={{ color: 'warning.main', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                מחר
              </Typography>
            </Box>
            {data.data.tomorrow.map(trial => (
              <TrialCard key={trial.id} trial={trial} />
            ))}
          </Paper>
        )}

        {/* Later This Week */}
        {data?.data?.later?.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <EventIcon sx={{ color: 'info.main', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                השבוע
              </Typography>
            </Box>
            {data.data.later.map(trial => (
              <TrialCard key={trial.id} trial={trial} />
            ))}
          </Paper>
        )}

        {/* No Trials */}
        {data && data.summary.total === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <FitnessCenterIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              אין אימוני ניסיון ב-7 הימים הקרובים
            </Typography>
          </Paper>
        )}
      </Container>
    </Layout>
  );
};

export default Trials;
