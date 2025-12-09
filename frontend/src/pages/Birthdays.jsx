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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button
} from '@mui/material';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import CakeIcon from '@mui/icons-material/Cake';
import RefreshIcon from '@mui/icons-material/Refresh';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CelebrationIcon from '@mui/icons-material/Celebration';
import TodayIcon from '@mui/icons-material/Today';
import EventIcon from '@mui/icons-material/Event';

const API_URL = import.meta.env.VITE_API_URL;

const Birthdays = () => {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();

      const response = await axios.get(`${API_URL}/api/birthdays?days=7`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch birthdays:', err);
      setError('שגיאה בטעינת ימי הולדת');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone, name, age) => {
    const cleanPhone = phone?.replace(/\D/g, '');
    if (cleanPhone) {
      const israelPhone = cleanPhone.startsWith('0')
        ? '972' + cleanPhone.substring(1)
        : cleanPhone;

      const message = encodeURIComponent(
        `היי ${name}! 🎂\nיום הולדת שמח! מאחלים לך שנה מדהימה מלאה בבריאות, אושר והצלחות! 🎉`
      );

      window.open(`https://wa.me/${israelPhone}?text=${message}`, '_blank');
    }
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

  const BirthdayCard = ({ person, highlight }) => (
    <Card
      sx={{
        mb: 1,
        borderRight: highlight ? '4px solid #EC4899' : '4px solid #e5e7eb',
        bgcolor: highlight ? 'rgba(236, 72, 153, 0.05)' : 'inherit',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2
        }
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                bgcolor: highlight ? '#EC4899' : '#9333EA',
                width: 48,
                height: 48
              }}
            >
              <CakeIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {person.fullName}
              </Typography>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Chip
                  size="small"
                  label={`${person.turningAge} שנים`}
                  color="secondary"
                  variant="outlined"
                />
                {person.isToday && (
                  <Chip
                    size="small"
                    icon={<CelebrationIcon />}
                    label="היום!"
                    color="error"
                  />
                )}
                {person.isTomorrow && (
                  <Chip
                    size="small"
                    label="מחר"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {!person.isToday && !person.isTomorrow && (
                  <Typography variant="caption" color="text.secondary">
                    בעוד {person.daysUntil} ימים
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Box display="flex" gap={1}>
            {person.phone && (
              <>
                <Tooltip title="התקשר">
                  <IconButton size="small" href={`tel:${person.phone}`}>
                    <PhoneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="שלח ברכה בוואטסאפ">
                  <IconButton
                    size="small"
                    onClick={() => openWhatsApp(person.phone, person.firstName, person.turningAge)}
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
            <CakeIcon sx={{ fontSize: 40, color: '#EC4899' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                ימי הולדת
              </Typography>
              <Typography variant="body2" color="text.secondary">
                7 הימים הקרובים
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchBirthdays}
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
              <Card sx={{ bgcolor: data.summary.today > 0 ? 'error.light' : 'grey.200' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CelebrationIcon sx={{ color: data.summary.today > 0 ? 'error.dark' : 'grey.500' }} />
                    <Typography variant="h4" fontWeight="bold" color={data.summary.today > 0 ? 'error.dark' : 'grey.500'}>
                      {data.summary.today}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={data.summary.today > 0 ? 'error.dark' : 'grey.500'}>
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
                    <CakeIcon sx={{ color: 'secondary.dark' }} />
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

        {/* Today's Birthdays */}
        {data?.data?.today?.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(236, 72, 153, 0.05)', borderRight: '4px solid #EC4899' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <CelebrationIcon sx={{ color: '#EC4899', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#EC4899' }}>
                חוגגים היום! 🎉
              </Typography>
            </Box>
            {data.data.today.map(person => (
              <BirthdayCard key={person.id} person={person} highlight />
            ))}
          </Paper>
        )}

        {/* Tomorrow's Birthdays */}
        {data?.data?.tomorrow?.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TodayIcon sx={{ color: 'warning.main', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                מחר
              </Typography>
            </Box>
            {data.data.tomorrow.map(person => (
              <BirthdayCard key={person.id} person={person} />
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
            {data.data.later.map(person => (
              <BirthdayCard key={person.id} person={person} />
            ))}
          </Paper>
        )}

        {/* No Birthdays */}
        {data && data.summary.total === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CakeIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              אין ימי הולדת ב-7 הימים הקרובים
            </Typography>
          </Paper>
        )}
      </Container>
    </Layout>
  );
};

export default Birthdays;
