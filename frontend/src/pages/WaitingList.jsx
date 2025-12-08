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

      // Auto-expand first session if there are any
      if (response.data.sessions?.length > 0) {
        setExpandedSession(0);
      }
    } catch (err) {
      console.error('Failed to fetch waitlist:', err);
      setError('שגיאה בטעינת רשימת ההמתנה');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone, name, eventName, date, time) => {
    const cleanPhone = phone?.replace(/\D/g, '');
    if (cleanPhone) {
      const israelPhone = cleanPhone.startsWith('0')
        ? '972' + cleanPhone.substring(1)
        : cleanPhone;

      // Pre-filled message
      const message = encodeURIComponent(
        `היי ${name}! התפנה מקום בשיעור ${eventName} ב-${date} בשעה ${time}. האם תרצה להירשם?`
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

        {/* Summary Cards */}
        {data && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={4}>
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
            <Grid item xs={6} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EventIcon sx={{ color: 'success.dark' }} />
                    <Typography variant="h6" fontWeight="bold" color="success.dark">
                      {data.dateRange?.from} - {data.dateRange?.to}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="success.dark">
                    טווח תאריכים
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
                  borderRight: `4px solid ${getEventColor(session.event_name)}`,
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
                      <Typography variant="h6" fontWeight="bold">
                        {session.event_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {session.coach}
                      </Typography>
                    </Box>

                    {/* Waitlist Count Badge */}
                    <Badge
                      badgeContent={session.waitlist.length}
                      color="warning"
                      sx={{ mr: 2 }}
                    >
                      <Avatar sx={{ bgcolor: getEventColor(session.event_name) }}>
                        <PersonIcon />
                      </Avatar>
                    </Badge>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
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
                          <TableRow key={person.id} hover>
                            <TableCell>
                              <Chip
                                size="small"
                                label={idx + 1}
                                color={idx === 0 ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={idx === 0 ? 'bold' : 'normal'}>
                                {person.name}
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
                                    <Tooltip title="שלח הודעת WhatsApp">
                                      <IconButton
                                        size="small"
                                        onClick={() => openWhatsApp(
                                          person.phone,
                                          person.name,
                                          session.event_name,
                                          session.date,
                                          session.time
                                        )}
                                        sx={{ color: '#25D366' }}
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

                  {/* Quick action to message all */}
                  {session.waitlist.length > 1 && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary">
                        כשמתפנה מקום, תוכל לפנות קודם למי שמספר 1 ברשימה
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        )}
      </Container>
    </Layout>
  );
};

export default WaitingList;
