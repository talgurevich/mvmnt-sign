import React, { useState, useEffect, useMemo } from 'react';
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
  TablePagination,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import { Pie, Bar } from 'react-chartjs-2';
import Layout from '../components/Layout';
import RecentNotifications from '../components/RecentNotifications';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import NewReleasesIcon from '@mui/icons-material/NewReleases';

const API_URL = import.meta.env.VITE_API_URL;

const Leads = () => {
  const { getAccessToken } = useAuth();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();

      const [leadsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/leads`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/leads/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setLeads(leadsRes.data.leads || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError('שגיאה בטעינת הלידים');
    } finally {
      setLoading(false);
    }
  };

  // Filter leads from last 7 days
  const recentLeads = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return leads.filter(lead => {
      if (!lead.created_at) return false;
      const createdDate = new Date(lead.created_at);
      return createdDate >= sevenDaysAgo;
    });
  }, [leads]);

  // Filter leads based on search and filters (from recent leads only)
  const filteredLeads = useMemo(() => {
    return recentLeads.filter(lead => {
      const matchesSearch = !searchQuery ||
        (lead.first_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.last_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.phone?.includes(searchQuery)) ||
        (lead.email?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = !statusFilter || lead.lead_status === statusFilter;
      const matchesSource = !sourceFilter || lead.lead_source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [recentLeads, searchQuery, statusFilter, sourceFilter]);

  // Get unique statuses and sources for filter dropdowns (from recent leads)
  const uniqueStatuses = useMemo(() =>
    [...new Set(recentLeads.map(l => l.lead_status).filter(Boolean))].sort(),
    [recentLeads]
  );

  const uniqueSources = useMemo(() =>
    [...new Set(recentLeads.map(l => l.lead_source).filter(Boolean))].sort(),
    [recentLeads]
  );

  // New/uncontacted leads (from recent leads only)
  const newLeads = useMemo(() =>
    recentLeads.filter(l => l.lead_status === 'Not Contacted' || !l.lead_status),
    [recentLeads]
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Not Contacted': 'warning',
      'Contacted': 'info',
      'Meeting Scheduled': 'primary',
      'Trial': 'secondary',
      'Converted': 'success',
      'Lost': 'error'
    };
    return statusColors[status] || 'default';
  };

  const openWhatsApp = (phone) => {
    const cleanPhone = phone?.replace(/\D/g, '');
    if (cleanPhone) {
      const israelPhone = cleanPhone.startsWith('0')
        ? '972' + cleanPhone.substring(1)
        : cleanPhone;
      window.open(`https://wa.me/${israelPhone}`, '_blank');
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

  // Chart data
  const sourceChartData = stats ? {
    labels: stats.bySource.slice(0, 6).map(s => s.source),
    datasets: [{
      data: stats.bySource.slice(0, 6).map(s => s.count),
      backgroundColor: [
        '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'
      ]
    }]
  } : null;

  const statusChartData = stats ? {
    labels: stats.byStatus.map(s => s.status),
    datasets: [{
      data: stats.byStatus.map(s => s.count),
      backgroundColor: [
        '#f39c12', '#3498db', '#9b59b6', '#2ecc71', '#e74c3c', '#1abc9c'
      ]
    }]
  } : null;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              לידים חדשים
            </Typography>
            <Typography variant="body2" color="text.secondary">
              7 ימים אחרונים ({recentLeads.length} לידים)
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
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonAddIcon sx={{ color: 'primary.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="primary.dark">
                      {stats.totals.activeLeads}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="primary.dark">
                    לידים פעילים
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <NewReleasesIcon sx={{ color: 'warning.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="warning.dark">
                      {newLeads.length}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="warning.dark">
                    לא נוצר קשר
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUpIcon sx={{ color: 'success.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="success.dark">
                      {stats.totals.convertedLeads}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="success.dark">
                    הומרו ללקוחות
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUpIcon sx={{ color: 'info.dark' }} />
                    <Typography variant="h4" fontWeight="bold" color="info.dark">
                      {stats.totals.conversionRate}%
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="info.dark">
                    שיעור המרה
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* New Leads Alert */}
        {newLeads.length > 0 && (
          <Alert
            severity="warning"
            icon={<NewReleasesIcon />}
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => setTabValue(0)}>
                צפה
              </Button>
            }
          >
            יש {newLeads.length} לידים חדשים שממתינים ליצירת קשר!
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`ממתינים לטיפול (${newLeads.length})`} />
            <Tab label={`כל הלידים (${recentLeads.length})`} />
            <Tab label="סטטיסטיקות" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {tabValue === 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              לידים שממתינים ליצירת קשר
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>שם</TableCell>
                    <TableCell>טלפון</TableCell>
                    <TableCell>מקור</TableCell>
                    <TableCell>מיקום</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newLeads.slice(0, 20).map((lead) => (
                    <TableRow key={lead.id} hover>
                      <TableCell>
                        {lead.first_name} {lead.last_name}
                      </TableCell>
                      <TableCell>{lead.phone || '-'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={lead.lead_source || 'Unknown'} variant="outlined" />
                      </TableCell>
                      <TableCell>{lead.location || '-'}</TableCell>
                      <TableCell>{formatDate(lead.created_at)}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {lead.phone && (
                            <>
                              <Tooltip title="התקשר">
                                <IconButton size="small" href={`tel:${lead.phone}`}>
                                  <PhoneIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="WhatsApp">
                                <IconButton
                                  size="small"
                                  onClick={() => openWhatsApp(lead.phone)}
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
            {newLeads.length > 20 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                מציג 20 מתוך {newLeads.length} לידים חדשים
              </Typography>
            )}
          </Paper>
        )}

        {tabValue === 1 && (
          <Paper sx={{ p: 2 }}>
            {/* Filters */}
            <Box display="flex" gap={2} mb={3} flexWrap="wrap">
              <TextField
                size="small"
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  value={statusFilter}
                  label="סטטוס"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">הכל</MenuItem>
                  {uniqueStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>מקור</InputLabel>
                <Select
                  value={sourceFilter}
                  label="מקור"
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  <MenuItem value="">הכל</MenuItem>
                  {uniqueSources.map(source => (
                    <MenuItem key={source} value={source}>{source}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>שם</TableCell>
                    <TableCell>טלפון</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>מקור</TableCell>
                    <TableCell>מיקום</TableCell>
                    <TableCell>אחראי</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLeads
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((lead) => (
                      <TableRow key={lead.id} hover>
                        <TableCell>
                          {lead.first_name} {lead.last_name}
                        </TableCell>
                        <TableCell>{lead.phone || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={lead.lead_status || 'Unknown'}
                            color={getStatusColor(lead.lead_status)}
                          />
                        </TableCell>
                        <TableCell>{lead.lead_source || '-'}</TableCell>
                        <TableCell>{lead.location || '-'}</TableCell>
                        <TableCell>
                          {lead.lead_owner_first_name
                            ? `${lead.lead_owner_first_name} ${lead.lead_owner_last_name || ''}`
                            : '-'}
                        </TableCell>
                        <TableCell>{formatDate(lead.created_at)}</TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            {lead.phone && (
                              <>
                                <Tooltip title="התקשר">
                                  <IconButton size="small" href={`tel:${lead.phone}`}>
                                    <PhoneIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="WhatsApp">
                                  <IconButton
                                    size="small"
                                    onClick={() => openWhatsApp(lead.phone)}
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
            <TablePagination
              component="div"
              count={filteredLeads.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="שורות לעמוד:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} מתוך ${count}`}
            />
          </Paper>
        )}

        {tabValue === 2 && stats && (
          <Grid container spacing={3}>
            {/* Source Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  לידים לפי מקור
                </Typography>
                <Box sx={{ height: 300 }}>
                  {sourceChartData && (
                    <Pie
                      data={sourceChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'right' }
                        }
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Status Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  לידים לפי סטטוס
                </Typography>
                <Box sx={{ height: 300 }}>
                  {statusChartData && (
                    <Pie
                      data={statusChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'right' }
                        }
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  פעילות אחרונה
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>לידים ב-7 ימים אחרונים</Typography>
                    <Chip label={stats.recent.last7Days} color="primary" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>לידים ב-30 ימים אחרונים</Typography>
                    <Chip label={stats.recent.last30Days} color="primary" />
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Lost Reasons */}
            {stats.lostReasons.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    סיבות לאובדן לידים
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {stats.lostReasons.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.reason}</TableCell>
                            <TableCell align="left">
                              <Chip size="small" label={item.count} color="error" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            )}

            {/* Lead Owners */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  לידים לפי אחראי
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>אחראי</TableCell>
                        <TableCell align="center">מספר לידים</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.byOwner.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.owner}</TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={item.count} variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Recent Notifications */}
        <RecentNotifications eventType="new_lead_notifications" limit={5} />
      </Container>
    </Layout>
  );
};

export default Leads;
