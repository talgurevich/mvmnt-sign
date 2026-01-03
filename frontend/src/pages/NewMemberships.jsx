import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import Layout from '../components/Layout';
import RecentNotifications from '../components/RecentNotifications';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import CelebrationIcon from '@mui/icons-material/Celebration';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

const API_URL = import.meta.env.VITE_API_URL;

const NewMemberships = () => {
  const { getAccessToken } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [windowDays, setWindowDays] = useState(7);

  useEffect(() => {
    fetchNewMembers();
  }, [windowDays]);

  const fetchNewMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();

      const response = await axios.get(
        `${API_URL}/api/automations/new-memberships/members?days=${windowDays}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMembers(response.data.data?.members || []);
    } catch (err) {
      console.error('Failed to fetch new members:', err);
      setError('שגיאה בטעינת מנויים חדשים');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    member.membershipType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysText = (days) => {
    if (days === 0) return 'היום';
    if (days === 1) return 'אתמול';
    return `לפני ${days} ימים`;
  };

  const getDaysColor = (days) => {
    if (days === 0) return 'success';
    if (days <= 2) return 'primary';
    return 'default';
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
          <Box display="flex" alignItems="center" gap={2}>
            <PersonAddAltIcon sx={{ fontSize: 40, color: 'success.main' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                מנויים חדשים
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {members.length} מנויים חדשים ב-{windowDays} הימים האחרונים
              </Typography>
            </Box>
          </Box>
          <Tooltip title="רענן">
            <IconButton onClick={fetchNewMembers}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="חיפוש לפי שם, טלפון או סוג מנוי..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <Box display="flex" gap={1}>
              {[7, 14, 30].map((days) => (
                <Chip
                  key={days}
                  label={`${days} ימים`}
                  onClick={() => setWindowDays(days)}
                  color={windowDays === days ? 'primary' : 'default'}
                  variant={windowDays === days ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        </Paper>

        {/* Members List */}
        {filteredMembers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <PersonAddAltIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {searchTerm ? 'לא נמצאו תוצאות' : 'אין מנויים חדשים'}
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CelebrationIcon color="success" />
              <Typography variant="h6" fontWeight="bold">
                {filteredMembers.length} מנויים חדשים
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filteredMembers.map((member) => (
                <Box
                  key={member.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderRadius: 1,
                    bgcolor: member.daysSinceStart === 0 ? 'success.light' :
                             member.daysSinceStart <= 2 ? 'primary.light' : 'grey.100',
                    border: '1px solid',
                    borderColor: member.daysSinceStart === 0 ? 'success.main' :
                                 member.daysSinceStart <= 2 ? 'primary.main' : 'grey.300'
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {member.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {member.membershipType}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      {member.phone && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {member.phone}
                          </Typography>
                        </Box>
                      )}
                      {member.email && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {member.email}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <Box textAlign="left" sx={{ minWidth: 120 }}>
                    <Chip
                      size="small"
                      label={getDaysText(member.daysSinceStart)}
                      color={getDaysColor(member.daysSinceStart)}
                      sx={{ fontWeight: 'bold', mb: 0.5 }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {member.formattedStartDate}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Recent Notifications */}
        <RecentNotifications eventType="new_membership_notifications" limit={5} />
      </Container>
    </Layout>
  );
};

export default NewMemberships;
