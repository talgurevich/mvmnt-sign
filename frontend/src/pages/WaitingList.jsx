import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Badge
} from '@mui/material';
import Layout from '../components/Layout';
import RecentNotifications from '../components/RecentNotifications';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import WarningIcon from '@mui/icons-material/Warning';

const API_URL = import.meta.env.VITE_API_URL;

const WaitingList = () => {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();

      const response = await axios.get(`${API_URL}/api/waitlist?days=3`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(response.data);

      // Auto-expand first session with available spot, or first session
      if (response.data.sessions?.length > 0) {
        const firstWithSpot = response.data.sessions.findIndex(s => s.hasAvailableSpot);
        setExpandedSession(firstWithSpot >= 0 ? firstWithSpot : 0);
      }
    } catch (err) {
      console.error('Failed to fetch waitlist:', err);
      setError('שגיאה בטעינת רשימת ההמתנה');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone, name, eventName, date, time, hasSpot) => {
    const cleanPhone = phone?.replace(/\D/g, '');
    if (cleanPhone) {
      const israelPhone = cleanPhone.startsWith('0')
        ? '972' + cleanPhone.substring(1)
        : cleanPhone;

      // Different message based on whether there's a spot available
      const message = hasSpot
        ? encodeURIComponent(
            `היי ${name}! התפנה מקום בשיעור ${eventName} ב-${date} בשעה ${time}. האם תרצה להירשם?`
          )
        : encodeURIComponent(
            `היי ${name}! אנחנו רואים שאתה ברשימת ההמתנה לשיעור ${eventName} ב-${date} בשעה ${time}. נעדכן אותך כשיתפנה מקום!`
          );

      window.open(`https://wa.me/${israelPhone}?text=${message}`, '_blank');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    // Check if it's today or tomorrow
    if (date.toDateString() === today.toDateString()) {
      return 'היום';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'מחר';
    }

    // Return formatted date
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric'
    });
  };

  const getEventColor = (eventName) => {
    const name = eventName?.toLowerCase() || '';
    if (name.includes('lift') || name.includes('move')) return '#e91e63';
    if (name.includes('pilates')) return '#9c27b0';
    if (name.includes('yoga')) return '#4caf50';
    if (name.includes('open gym')) return '#ff9800';
    return '#2196f3';
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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              רשימת המתנה
            </Typography>
            <Typography variant="body2" color="text.secondary">
              3 הימים הקרובים
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            רענן
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Alert for sessions with available spots */}
        {data && data.sessionsWithAvailableSpots > 0 && (
          <Alert
            severity="success"
            icon={<EventAvailableIcon />}
            sx={{ mb: 3 }}
          >
            <Typography fontWeight="bold">
              יש {data.sessionsWithAvailableSpots} שיעורים עם מקום פנוי ורשימת המתנה!
            </Typography>
            <Typography variant="body2">
              ניתן ליצור קשר עם הממתינים ולהציע להם להירשם
            </Typography>
          </Alert>
        )}

        {/* Summary Cards */}
        {data && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <HourglassEmptyIcon sx={{ color: 'warning.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="warning.dark">
                      {data.totalWaiting}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="warning.dark">
                    ממתינים ברשימה
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FitnessCenterIcon sx={{ color: 'info.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="info.dark">
                      {data.sessionsWithWaitlist}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="info.dark">
                    שיעורים עם רשימת המתנה
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: data.sessionsWithAvailableSpots > 0 ? 'success.light' : 'grey.200' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircleIcon sx={{ color: data.sessionsWithAvailableSpots > 0 ? 'success.dark' : 'grey.500' }} />
                    <Typography variant="h4" fontWeight="bold" color={data.sessionsWithAvailableSpots > 0 ? 'success.dark' : 'grey.500'}>
                      {data.sessionsWithAvailableSpots}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={data.sessionsWithAvailableSpots > 0 ? 'success.dark' : 'grey.500'}>
                    עם מקומות פנויים
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EventIcon sx={{ color: 'primary.dark' }} />
                    <Typography variant="body1" fontWeight="bold" color="primary.dark">
                      {data.dateRange?.from}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="primary.dark">
                    עד {data.dateRange?.to}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* No Data */}
        {data && data.sessions?.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <HourglassEmptyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              אין ממתינים ברשימת ההמתנה
            </Typography>
            <Typography variant="body2" color="text.secondary">
              כל השיעורים ב-3 הימים הקרובים זמינים
            </Typography>
          </Paper>
        )}

        {/* Sessions with Waitlist */}
        {data && data.sessions?.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              שיעורים עם רשימת המתנה
            </Typography>

            {data.sessions.map((session, index) => (
              <Accordion
                key={`${session.date}-${session.time}-${session.event_name}`}
                expanded={expandedSession === index}
                onChange={() => setExpandedSession(expandedSession === index ? null : index)}
                sx={{
                  mb: 1,
                  borderRight: `4px solid ${session.hasAvailableSpot ? '#4caf50' : getEventColor(session.event_name)}`,
                  bgcolor: session.hasAvailableSpot ? 'success.50' : 'inherit',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    {/* Date/Time */}
                    <Box sx={{ minWidth: 100 }}>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {formatDate(session.date)}
                      </Typography>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon fontSize="small" />
                        {session.time}
                      </Typography>
                    </Box>

                    {/* Event Name */}
                    <Box sx={{ flexGrow: 1 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight="bold">
                          {session.event_name}
                        </Typography>
                        {session.hasAvailableSpot && (
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon />}
                            label={`${session.availableSpots} מקומות פנויים`}
                            color="success"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {session.coach}
                        {session.maxMembers && (
                          <span> | {session.currentBookings}/{session.maxMembers} רשומים</span>
                        )}
                      </Typography>
                    </Box>

                    {/* Waitlist Count Badge */}
                    <Badge
                      badgeContent={session.waitlist.length}
                      color={session.hasAvailableSpot ? 'success' : 'warning'}
                      sx={{ mr: 2 }}
                    >
                      <Avatar sx={{ bgcolor: session.hasAvailableSpot ? '#4caf50' : getEventColor(session.event_name) }}>
                        <PersonIcon />
                      </Avatar>
                    </Badge>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  {/* Available spot alert */}
                  {session.hasAvailableSpot && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography fontWeight="bold">
                        יש {session.availableSpots} מקומות פנויים!
                      </Typography>
                      <Typography variant="body2">
                        ניתן ליצור קשר עם הראשון ברשימה ולהציע לו להירשם
                      </Typography>
                    </Alert>
                  )}

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>שם</TableCell>
                          <TableCell>טלפון</TableCell>
                          <TableCell>זמן הצטרפות</TableCell>
                          <TableCell>פעולות</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {session.waitlist.map((person, idx) => (
                          <TableRow
                            key={person.id}
                            hover
                            sx={{
                              bgcolor: session.hasAvailableSpot && idx < session.availableSpots
                                ? 'success.50'
                                : 'inherit'
                            }}
                          >
                            <TableCell>
                              <Chip
                                size="small"
                                label={idx + 1}
                                color={session.hasAvailableSpot && idx < session.availableSpots ? 'success' : (idx === 0 ? 'warning' : 'default')}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={idx === 0 ? 'bold' : 'normal'}>
                                {person.name}
                                {session.hasAvailableSpot && idx < session.availableSpots && (
                                  <Chip
                                    size="small"
                                    label="יש מקום!"
                                    color="success"
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Typography>
                            </TableCell>
                            <TableCell>{person.phone || '-'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {person.entry_time}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                {person.phone && (
                                  <>
                                    <Tooltip title="התקשר">
                                      <IconButton size="small" href={`tel:${person.phone}`}>
                                        <PhoneIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title={session.hasAvailableSpot ? "הודע על מקום פנוי" : "שלח הודעת WhatsApp"}>
                                      <IconButton
                                        size="small"
                                        onClick={() => openWhatsApp(
                                          person.phone,
                                          person.name,
                                          session.event_name,
                                          session.date,
                                          session.time,
                                          session.hasAvailableSpot
                                        )}
                                        sx={{
                                          color: session.hasAvailableSpot ? '#4caf50' : '#25D366',
                                          bgcolor: session.hasAvailableSpot ? 'success.100' : 'inherit'
                                        }}
                                      >
                                        <WhatsAppIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Info text */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    {session.hasAvailableSpot ? (
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        יש מקום פנוי! לחץ על כפתור ה-WhatsApp ליד שם המתאמן כדי לשלוח לו הודעה
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        כשמתפנה מקום, תוכל לפנות קודם למי שמספר 1 ברשימה
                      </Typography>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        )}

        {/* Recent Notifications */}
        <RecentNotifications eventType="waitlist_capacity" limit={5} />
      </Container>
    </Layout>
  );
};

export default WaitingList;
